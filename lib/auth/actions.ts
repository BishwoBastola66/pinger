'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './password';
import { createSession, invalidateSession } from './session';
import { getActiveUserRestriction } from './restrictions';
import { redirect } from 'next/navigation';
import { requestOTP, verifyOTP } from './otp-actions';

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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export async function registerAction(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  if (typeof data.email === 'string') {
    data.email = data.email.toLowerCase().trim();
  }
  
  if (!checkRateLimit(`register_${data.email}`, 5, 10 * 60 * 1000)) {
    return { message: 'Too many requests. Please try again later.' };
  }
  
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing or invalid fields.',
    };
  }

  const { name, email, password } = parsed.data;

  // Check if user exists
  const existingUser = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  if (existingUser.length > 0) {
    return {
      message: 'Email is already in use.',
    };
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db.insert(accounts).values({
    name,
    email,
    passwordHash,
  }).returning();

  const otpRes = await requestOTP(email, 'verify');
  if (!otpRes.success) {
    return { message: otpRes.error || 'Failed to send verification email. Please try logging in to trigger a new one.' };
  }
  
  redirect('/verify-email?email=' + encodeURIComponent(email));
}

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function loginAction(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  if (typeof data.email === 'string') {
    data.email = data.email.toLowerCase().trim();
  }
  
  if (!checkRateLimit(`login_${data.email}`, 10, 10 * 60 * 1000)) {
    return { message: 'Too many requests. Please try again later.' };
  }
  
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing or invalid fields.',
    };
  }

  const { email, password } = parsed.data;

  const userResult = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  if (userResult.length === 0) {
    // Security: Do not reveal that email doesn't exist. Generic error.
    return { message: 'Invalid email or password.' };
  }

  const user = userResult[0];

  const restriction = await getActiveUserRestriction(user.id);
  if (restriction) {
    if (restriction.isPermanent) {
      return { message: `This account has been permanently restricted. Reason: ${restriction.reason}` };
    } else {
      const until = restriction.endDate ? new Date(restriction.endDate).toLocaleDateString() : 'a later date';
      return { message: `This account is temporarily suspended until ${until}. Reason: ${restriction.reason}` };
    }
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { message: 'Invalid email or password.' };
  }

  if (!user.emailVerified) {
    const otpRes = await requestOTP(email, 'verify');
    if (!otpRes.success) {
      return { message: otpRes.error || 'Please verify your email first.' };
    }
    redirect('/verify-email?email=' + encodeURIComponent(email));
  }

  await createSession(user.id);
  
  redirect('/dashboard');
}

export async function logoutAction() {
  await invalidateSession();
  redirect('/login');
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  let { email, code, password, confirmPassword } = data;
  if (typeof email === 'string') {
    email = email.toLowerCase().trim();
  }

  if (password !== confirmPassword) {
    return { message: 'Passwords do not match.' };
  }
  
  if (typeof password !== 'string' || password.length < 8) {
    return { message: 'Password must be at least 8 characters long.' };
  }

  // Rate limit check
  if (!checkRateLimit(`reset_pwd_${email}`, 5, 10 * 60 * 1000)) {
    return { message: 'Too many attempts. Please try again later.' };
  }

  // Verify the reset OTP
  const otpRes = await verifyOTP(email as string, code as string, 'reset');
  if (!otpRes.success) {
    return { message: otpRes.error || 'Invalid or expired code.' };
  }

  // Find user and update password
  const userResult = await db.select().from(accounts).where(eq(accounts.email, email as string)).limit(1);
  if (userResult.length === 0) {
    return { message: 'User not found.' };
  }

  const newPasswordHash = await hashPassword(password as string);
  
  await db.update(accounts)
    .set({ passwordHash: newPasswordHash, emailVerified: true })
    .where(eq(accounts.id, userResult[0].id));

  // Redirect to login
  redirect('/login');
}
