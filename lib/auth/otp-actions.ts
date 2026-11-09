'use server';

import { db } from '@/lib/db';
import { otpTokens, accounts } from '@/lib/db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { sendOtpEmail } from '@/lib/email';
import crypto, { createHash, randomInt } from 'crypto';
import { createSession } from './session';
import { getLoginOtpTemplate, getVerifyEmailTemplate, getPasswordResetTemplate } from '@/lib/email/templates';

export type OTPPurpose = 'login' | 'verify' | 'reset';

// Basic in-memory rate limiting map for this serverless edge/node instance
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();

function checkRateLimit(ipOrEmail: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ipOrEmail);
  
  if (!record || (now - record.timestamp > windowMs)) {
    rateLimitMap.set(ipOrEmail, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count += 1;
  return true;
}

export async function requestOTP(email: string, purpose: OTPPurpose = 'login') {
  try {
    const formattedEmail = email.toLowerCase().trim();

    // Check rate limit: Max 5 requests per 10 minutes per email
    if (!checkRateLimit(`otp_req_${formattedEmail}`, 5, 10 * 60 * 1000)) {
      return { success: false, error: 'Too many requests. Please wait a few minutes before trying again.' };
    }

    // 1. Generate 6 digit code
    const code = randomInt(100000, 999999).toString();
    const codeHash = createHash('sha256').update(code).digest('hex');

    // 2. Set expiry (10 mins for login/verify, 15 mins for reset)
    const expiryMinutes = purpose === 'reset' ? 15 : 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 3. Rate limiting: Check DB for recent requests for this specific purpose
    const recentTokens = await db.query.otpTokens.findMany({
      where: and(
        eq(otpTokens.email, formattedEmail),
        eq(otpTokens.purpose, purpose),
        gt(otpTokens.createdAt, new Date(Date.now() - 10 * 60 * 1000))
      )
    });
    
    if (recentTokens.length >= 3) {
      return { success: false, error: 'Too many requests. Please wait a few minutes before trying again.' };
    }

    // 4. Save to database using atomic delete and insert
    await db.delete(otpTokens).where(
      and(
        eq(otpTokens.email, formattedEmail),
        eq(otpTokens.purpose, purpose)
      )
    );

    await db.insert(otpTokens).values({
      email: formattedEmail,
      purpose,
      codeHash,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    // 5. Build HTML email based on purpose
    let html = '';
    let subject = '';
    
    if (purpose === 'login') {
      html = getLoginOtpTemplate(code);
      subject = 'Your Pingr Login Code';
    } else if (purpose === 'verify') {
      html = getVerifyEmailTemplate(code);
      subject = 'Verify your Pingr Email';
    } else if (purpose === 'reset') {
      html = getPasswordResetTemplate(code);
      subject = 'Pingr Password Reset';
    }

    const emailResult = await sendOtpEmail({
      to: formattedEmail,
      subject,
      html,
    });

    if (!emailResult.success) {
      console.error('OTP email failed to send:', emailResult.error);
      return { success: false, error: 'Failed to send verification email. Please try again later.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Request OTP Error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function verifyOTP(email: string, code: string, purpose: OTPPurpose = 'login') {
  try {
    const formattedEmail = email.toLowerCase().trim();
    
    // Quick IP/Email brute force limit just in case
    if (!checkRateLimit(`otp_verify_${formattedEmail}`, 10, 10 * 60 * 1000)) {
      return { success: false, error: 'Too many attempts. Please try again later.' };
    }

    const codeHash = createHash('sha256').update(code.trim()).digest('hex');

    const result = await db.transaction(async (tx) => {
      // 1. Atomic admission gate: Increment only when attempts < 5
      const tokens = await tx.execute(sql`
        UPDATE otp_tokens
        SET attempts = attempts + 1
        WHERE email = ${formattedEmail} 
          AND purpose = ${purpose} 
          AND expires_at > NOW()
          AND attempts < 5
        RETURNING *
      `);

      if (tokens.length === 0) {
        // If it failed to update, it might be expired, invalid, or hit the attempt limit.
        // Let's do a quick check to give a better error message, though this read is not locked.
        const existing = await tx.execute(sql`SELECT attempts FROM otp_tokens WHERE email = ${formattedEmail} AND purpose = ${purpose}`);
        if (existing.length > 0 && (existing[0] as any).attempts >= 5) {
           return { success: false, error: 'Too many failed attempts. Please request a new code.' };
        }
        return { success: false, error: 'The code has expired or is invalid.' };
      }

      const tokenRecord = tokens[0] as any;

      // 2. Validate hash in constant time
      const expectedHashBuffer = Buffer.from(tokenRecord.code_hash, 'hex');
      const inputHashBuffer = Buffer.from(codeHash, 'hex');
      
      if (expectedHashBuffer.length !== inputHashBuffer.length || !crypto.timingSafeEqual(expectedHashBuffer, inputHashBuffer)) {
        return { success: false, error: 'Invalid verification code.' };
      }

      // 3. Success! Delete the token so it can't be reused
      await tx.execute(sql`DELETE FROM otp_tokens WHERE id = ${tokenRecord.id}`);

      return { success: true };
    });

    if (!result.success) return result;

    // If it's a reset purpose, we don't create a session yet. We just return success.
    if (purpose === 'reset') {
      return { success: true };
    }

    // 4. Find the user, or create them if they don't exist (only for login/verify)
    const [user] = await db.select().from(accounts).where(eq(accounts.email, formattedEmail)).limit(1);
    
    let userId: string;
    if (!user) {
      const [newUser] = await db.insert(accounts).values({
        email: formattedEmail,
        name: formattedEmail.split('@')[0],
        passwordHash: 'otp_user',
        emailVerified: true,
      }).returning({ id: accounts.id });
      userId = newUser.id;
    } else {
      userId = user.id;
      // If they had an unverified email via password signup, verify it now
      if (!user.emailVerified) {
        await db.update(accounts).set({ emailVerified: true }).where(eq(accounts.id, userId));
      }
    }

    // 5. Create session
    await createSession(userId);

    return { success: true };
  } catch (err) {
    console.error('Verify OTP Error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
