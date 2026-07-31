import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import {
  loginSchema,
  forgotSchema,
  resetSchema,
  registerSchema,
  verifyOtpSchema,
} from '../auth.types';

// Minimal mock TFunction — returns the key itself
const t = ((key: string) => key) as unknown as TFunction;

describe('loginSchema', () => {
  const schema = loginSchema(t);

  it('accepts valid credentials', () => {
    const result = schema.safeParse({ userName: 'admin', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty userName', () => {
    const result = schema.safeParse({ userName: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = schema.safeParse({ userName: 'admin', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('forgotSchema', () => {
  const schema = forgotSchema(t);

  it('accepts non-empty userName', () => {
    expect(schema.safeParse({ userName: 'user1' }).success).toBe(true);
  });

  it('rejects empty userName', () => {
    expect(schema.safeParse({ userName: '' }).success).toBe(false);
  });
});

describe('resetSchema', () => {
  const schema = resetSchema(t);

  it('accepts valid data with matching passwords', () => {
    const result = schema.safeParse({
      token: 'tok123',
      newPassword: 'password1',
      confirm: 'password1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = schema.safeParse({
      token: 'tok',
      newPassword: 'short',
      confirm: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = schema.safeParse({
      token: 'tok',
      newPassword: 'password1',
      confirm: 'password2',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('confirm'))).toBe(true);
    }
  });
});

describe('registerSchema', () => {
  const schema = registerSchema(t);
  const valid = {
    fullName: 'John Doe',
    email: 'john@example.com',
    country: 'IN',
    mobile: '9876543210',
    password: 'password1',
  };

  it('accepts valid registration', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(schema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a mobile outside the 4-15 digit E.164 range', () => {
    expect(schema.safeParse({ ...valid, country: 'AE', mobile: '123' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, country: 'AE', mobile: '1234567890123456' }).success).toBe(false);
  });

  it('rejects a non-numeric mobile', () => {
    expect(schema.safeParse({ ...valid, mobile: '98765 43210' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, mobile: '+919876543210' }).success).toBe(false);
  });

  // India is the primary market, so its fixed ten-digit rule survives the move to
  // international numbers — a nine-digit Indian number is still a typo, not a foreign number.
  it('still requires exactly 10 digits for India', () => {
    expect(schema.safeParse({ ...valid, mobile: '987654321' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, mobile: '98765432101' }).success).toBe(false);
  });

  it('accepts national numbers that are not 10 digits for other countries', () => {
    // UAE mobile numbers are 9 digits; this used to be rejected outright.
    expect(schema.safeParse({ ...valid, country: 'AE', mobile: '501234567' }).success).toBe(true);
    // Germany's can run to 11.
    expect(schema.safeParse({ ...valid, country: 'DE', mobile: '15112345678' }).success).toBe(true);
  });

  it('rejects short password', () => {
    expect(schema.safeParse({ ...valid, password: '1234567' }).success).toBe(false);
  });

  it('rejects short fullName', () => {
    expect(schema.safeParse({ ...valid, fullName: 'J' }).success).toBe(false);
  });
});

describe('verifyOtpSchema', () => {
  const schema = verifyOtpSchema(t);
  // Verification addresses the pending registration by its 256-bit handle, not by mobile —
  // see AuthService.register for why an email/mobile key is not safe to verify against.
  const token = 'a'.repeat(64);

  it('accepts a valid handle and 6-digit code', () => {
    expect(schema.safeParse({ registrationToken: token, code: '123456' }).success).toBe(true);
  });

  it('rejects non-6-digit code', () => {
    expect(schema.safeParse({ registrationToken: token, code: '12345' }).success).toBe(false);
    expect(schema.safeParse({ registrationToken: token, code: '1234567' }).success).toBe(false);
    expect(schema.safeParse({ registrationToken: token, code: 'abcdef' }).success).toBe(false);
  });

  it('rejects a malformed registration token', () => {
    expect(schema.safeParse({ registrationToken: 'not-a-token', code: '123456' }).success).toBe(false);
    expect(schema.safeParse({ registrationToken: 'A'.repeat(64), code: '123456' }).success).toBe(false);
    expect(schema.safeParse({ registrationToken: 'a'.repeat(63), code: '123456' }).success).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(schema.safeParse({ code: '123456' }).success).toBe(false);
  });
});
