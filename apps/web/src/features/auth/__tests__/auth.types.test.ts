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

  it('accepts valid registration', () => {
    const result = schema.safeParse({
      fullName: 'John Doe',
      email: 'john@example.com',
      mobile: '9876543210',
      password: 'password1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = schema.safeParse({
      fullName: 'John',
      email: 'not-an-email',
      mobile: '9876543210',
      password: 'password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-10-digit mobile', () => {
    expect(
      schema.safeParse({
        fullName: 'John',
        email: 'j@e.com',
        mobile: '123',
        password: 'password1',
      }).success,
    ).toBe(false);

    expect(
      schema.safeParse({
        fullName: 'John',
        email: 'j@e.com',
        mobile: '12345678901',
        password: 'password1',
      }).success,
    ).toBe(false);
  });

  it('rejects short password', () => {
    const result = schema.safeParse({
      fullName: 'John',
      email: 'j@e.com',
      mobile: '9876543210',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short fullName', () => {
    const result = schema.safeParse({
      fullName: 'J',
      email: 'j@e.com',
      mobile: '9876543210',
      password: 'password1',
    });
    expect(result.success).toBe(false);
  });
});

describe('verifyOtpSchema', () => {
  const schema = verifyOtpSchema(t);

  it('accepts valid 6-digit OTP', () => {
    const result = schema.safeParse({ mobile: '9876543210', code: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects non-6-digit code', () => {
    expect(schema.safeParse({ mobile: '9876543210', code: '12345' }).success).toBe(false);
    expect(schema.safeParse({ mobile: '9876543210', code: '1234567' }).success).toBe(false);
    expect(schema.safeParse({ mobile: '9876543210', code: 'abcdef' }).success).toBe(false);
  });

  it('rejects invalid mobile', () => {
    expect(schema.safeParse({ mobile: '123', code: '123456' }).success).toBe(false);
  });

  it('allows optional fields', () => {
    const result = schema.safeParse({
      mobile: '9876543210',
      code: '123456',
      fullName: 'Test',
      email: 'test@test.com',
      password: 'pass1234',
    });
    expect(result.success).toBe(true);
  });
});
