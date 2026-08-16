import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from './auth.dto';

/**
 * The mobile rules on RegisterDto.
 *
 * The generic 4–15 digit envelope has to hold for every dial code the signup form offers, but
 * on its own it accepted 1234567890 as an Indian number and the account got as far as having
 * an OTP sent to it. The +91 branch narrows that to India's own plan without switching off the
 * envelope for anyone else — which is the trap `@ValidateIf` would have walked into, since it
 * disables every validator on the property rather than just the one that follows it.
 */
const base = {
  fullName: 'Rohit Raj',
  email: 'rohitraj@yopmail.com',
  password: 'password1',
};

/** Error messages raised against `mobile`, empty when the number is accepted. */
function mobileErrors(payload: Record<string, unknown>): string[] {
  const dto = plainToInstance(RegisterDto, { ...base, ...payload });
  return validateSync(dto)
    .filter((e) => e.property === 'mobile')
    .flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('RegisterDto mobile', () => {
  it('accepts every Indian mobile series', () => {
    for (const first of ['6', '7', '8', '9']) {
      assert.deepEqual(mobileErrors({ mobile: `${first}876543210`, countryCode: '+91' }), []);
    }
  });

  it('rejects an Indian number that does not open 6-9', () => {
    for (const mobile of ['1234567890', '0987654321', '5876543210']) {
      assert.notEqual(mobileErrors({ mobile, countryCode: '+91' }).length, 0, mobile);
    }
  });

  it('rejects an Indian number of the wrong length', () => {
    assert.notEqual(mobileErrors({ mobile: '987654321', countryCode: '+91' }).length, 0);
    assert.notEqual(mobileErrors({ mobile: '98765432101', countryCode: '+91' }).length, 0);
  });

  // The service defaults an absent countryCode to +91, so the India rule has to apply there too
  // or omitting the field would be a way around it.
  it('treats a missing country code as India', () => {
    assert.notEqual(mobileErrors({ mobile: '1234567890' }).length, 0);
    assert.deepEqual(mobileErrors({ mobile: '9876543210' }), []);
  });

  it('accepts the code with or without its plus', () => {
    assert.deepEqual(mobileErrors({ mobile: '9876543210', countryCode: '91' }), []);
    assert.notEqual(mobileErrors({ mobile: '1234567890', countryCode: '91' }).length, 0);
  });

  it('leaves other countries on the 4-15 digit envelope', () => {
    // Nine digits (UAE) and eleven (Germany) are both fine, and so is a leading 1 or 2 —
    // the 6-9 prefix rule is India's alone.
    assert.deepEqual(mobileErrors({ mobile: '501234567', countryCode: '+971' }), []);
    assert.deepEqual(mobileErrors({ mobile: '15112345678', countryCode: '+49' }), []);
    assert.deepEqual(mobileErrors({ mobile: '2125551234', countryCode: '+1' }), []);
  });

  it('still enforces the envelope for other countries', () => {
    assert.notEqual(mobileErrors({ mobile: '123', countryCode: '+971' }).length, 0);
    assert.notEqual(mobileErrors({ mobile: '1234567890123456', countryCode: '+971' }).length, 0);
    assert.notEqual(mobileErrors({ mobile: '98765abcde', countryCode: '+971' }).length, 0);
  });
});
