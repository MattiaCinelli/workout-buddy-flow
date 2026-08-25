import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

// No external dependency (no argon2/bcrypt native bindings to compile for
// every self-hosting target, e.g. Raspberry Pi ARM) — scrypt is built into
// Node's own crypto module and is a solid password KDF on its own.
// Format is versioned ("scrypt:...") so a future algorithm change doesn't
// break verifying passwords hashed under this one.
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [algorithm, saltHex, hashHex] = stored.split(':');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  // keylen is derived from expected.length, so `derived` is always the same
  // length as `expected` — safe to pass straight to timingSafeEqual.
  const derived = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(derived, expected);
};
