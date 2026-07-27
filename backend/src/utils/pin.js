// backend/src/utils/pin.js
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

// ponytail: Node's stdlib scrypt instead of bcrypt — no new dependency, and
// scrypt is the recommended KDF for low-entropy secrets like a 4-6 digit PIN.
export const hashPin = (pin) => {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(String(pin), salt, KEY_LENGTH).toString('hex');
  return `${salt}:${key}`;
};

export const verifyPin = (pin, stored) => {
  if (!stored || typeof stored !== 'string') return false;

  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;

  let expected;
  try {
    expected = Buffer.from(key, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;

  const derived = scryptSync(String(pin), salt, KEY_LENGTH);
  return timingSafeEqual(derived, expected);
};
