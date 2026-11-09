import { hash, verify } from '@node-rs/argon2';

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashString: string): Promise<boolean> {
  return await verify(hashString, password);
}
