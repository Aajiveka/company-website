import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdatePersonalDto } from './candidates.dto';

/**
 * Date of birth on step 1.
 *
 * The field is optional and the form sends '' when it is left alone. That used to fail
 * @IsDateString, so every candidate who skipped DOB was stuck on step 1 behind "Could not save".
 * `@ValidateIf` turns off every validator on the property — fine here, since the date check is
 * the only one it has.
 */
const base = { fullName: 'Rahul Sharma', mobile: '9000010001', gender: 'M', email: 'rahul@x.in' };

function dobErrors(dob: unknown): string[] {
  const dto = plainToInstance(UpdatePersonalDto, { ...base, dob });
  return validateSync(dto)
    .filter((e) => e.property === 'dob')
    .flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('UpdatePersonalDto dob', () => {
  it('accepts a blank date of birth, which is how the form says "not given"', () => {
    assert.deepEqual(dobErrors(''), []);
  });

  it('accepts a missing date of birth', () => {
    assert.deepEqual(dobErrors(undefined), []);
  });

  it('accepts a real date', () => {
    assert.deepEqual(dobErrors('1998-08-15'), []);
  });

  it('still rejects a malformed one, naming the field as the form does', () => {
    assert.deepEqual(dobErrors('31-02-x'), ['Date of Birth must be a valid date']);
  });
});
