import assert from 'node:assert/strict';
import { test } from 'node:test';

/**
 * Unit test for the proc-caller param binding, using a fake mssql pool swapped
 * in via the `_internals` test seam — no real DB needed.
 */
import { _internals, queryProc } from './callProc';
import type { getPool } from './pool';

test('queryProc binds named params and returns the first recordset', async () => {
  const inputs: Record<string, unknown> = {};
  let executed = '';

  const fakeRequest = {
    input(key: string, value: unknown) {
      inputs[key] = value;
      return this;
    },
    async execute(name: string) {
      executed = name;
      return { recordset: [{ UserID: 42, Name: 'Test' }] };
    },
  };

  const fakePool = { request: () => fakeRequest };
  const original = _internals.getPool;
  _internals.getPool = (async () => fakePool) as unknown as typeof getPool;

  try {
    const rows = await queryProc<{ UserID: number; Name: string }>('spSecUserLogin', {
      UserName: 'admin',
      UserPwd: 'secret',
    });

    assert.equal(executed, 'spSecUserLogin');
    assert.deepEqual(inputs, { UserName: 'admin', UserPwd: 'secret' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].UserID, 42);
  } finally {
    _internals.getPool = original;
  }
});
