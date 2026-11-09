import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { db } from '@/lib/db';
import { sessions, accounts } from '@/lib/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { getActiveUserRestriction } from './restrictions';

const SESSION_COOKIE_NAME = 'pinger_session';
const SESSION_EXPIRATION_DAYS = 30;

// Need a strong secret for JWT signing.
const getJwtSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters long in production');
  }
  return new TextEncoder().encode(secret);
};

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<void> {
  // We still create a DB session to allow revocation
  const jti = generateSessionToken(); // We use the opaque token as the JWT ID (jti)
  const tokenHash = hashToken(jti);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  try {
    const headersList = await headers();
    userAgent = headersList.get('user-agent');
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || null);
    ipAddress = clientIp ? clientIp.slice(0, 45) : null;
  } catch {
    // Graceful fallback if invoked outside an active request context
  }

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    ipAddress,
    userAgent,
  });

  const [user] = await db.select().from(accounts).where(eq(accounts.id, userId)).limit(1);

  // Create JWT containing claims + jti
  const jwt = await new SignJWT({ 
    userId: user.id, 
    role: user.role, 
    email: user.email 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRATION_DAYS}d`)
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
}

export const validateSession = cache(async () => {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!jwt) {
    return { user: null, session: null };
  }

  try {
    // 1. Verify JWT signature and claims
    const { payload } = await jwtVerify(jwt, getJwtSecret());
    
    if (!payload.jti || !payload.userId) {
      return { user: null, session: null };
    }

    // 2. Check Database Registry to ensure it wasn't revoked
    const tokenHash = hashToken(payload.jti);
    
    const result = await db
      .select({ 
        user: {
          id: accounts.id,
          name: accounts.name,
          email: accounts.email,
          role: accounts.role,
          emailVerified: accounts.emailVerified,
          provider: accounts.provider,
          providerId: accounts.providerId,
          createdAt: accounts.createdAt,
          updatedAt: accounts.updatedAt,
        }, 
        session: sessions 
      })
      .from(sessions)
      .innerJoin(accounts, eq(sessions.userId, accounts.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date()),
          isNull(sessions.revokedAt)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return { user: null, session: null };
    }

    const { user, session } = result[0];

    // Check if account is restricted
    const restriction = await getActiveUserRestriction(user.id);
    if (restriction) {
      return { user: null, session: null };
    }

    // Backfill IP address and User-Agent if they were null on older sessions
    if (!session.ipAddress || !session.userAgent) {
      try {
        const headersList = await headers();
        const ua = headersList.get('user-agent');
        const forwardedFor = headersList.get('x-forwarded-for');
        const realIp = headersList.get('x-real-ip');
        const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || null);
        const ip = clientIp ? clientIp.slice(0, 45) : null;

        if (ip || ua) {
          await db
            .update(sessions)
            .set({
              ipAddress: session.ipAddress || ip,
              userAgent: session.userAgent || ua,
              lastUsedAt: new Date(),
            })
            .where(eq(sessions.id, session.id));
        }
      } catch {
        // Ignore if outside request context
      }
    }

    // Extend session if it's past half of its life
    const halfLife = SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000 / 2;
    const now = Date.now();
    if (session.expiresAt.getTime() - now < halfLife) {
      const newExpiresAt = new Date(now + SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
      
      await db
        .update(sessions)
        .set({ expiresAt: newExpiresAt, lastUsedAt: new Date() })
        .where(eq(sessions.id, session.id));
      
      // Re-sign JWT with new expiration
      const newJwt = await new SignJWT({ 
        userId: user.id, 
        role: user.role, 
        email: user.email 
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setJti(payload.jti)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_EXPIRATION_DAYS}d`)
        .sign(getJwtSecret());
        
      cookieStore.set(SESSION_COOKIE_NAME, newJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        expires: newExpiresAt,
      });
    } else {
      // Only update lastUsedAt every 5 minutes to avoid a DB write on every navigation click
      const LAST_USED_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
      const lastUsed = session.lastUsedAt?.getTime() ?? 0;
      if (now - lastUsed > LAST_USED_UPDATE_INTERVAL_MS) {
        // Fire-and-forget — don't await so it doesn't block the response
        db.update(sessions)
          .set({ lastUsedAt: new Date() })
          .where(eq(sessions.id, session.id))
          .catch(() => {});
      }
    }

    return { user, session };
  } catch (err) {
    // JWT verification failed (expired, invalid signature, etc)
    return { user: null, session: null };
  }
});

export async function invalidateSession() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (jwt) {
    try {
      // Decode enough to get JTI, we don't strictly need to verify signature here just to revoke,
      // but verifying is safer.
      const { payload } = await jwtVerify(jwt, getJwtSecret());
      if (payload.jti) {
        const tokenHash = hashToken(payload.jti);
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.tokenHash, tokenHash));
      }
    } catch (e) {
      // ignore
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const requireAuth = cache(async () => {
  const { user } = await validateSession();
  if (!user) {
    redirect('/login');
  }

  return user;
});
