import type { IProcedureResult, IResult } from 'mssql';
import { getPool, sql } from './pool';

export type ProcParams = Record<string, unknown>;

/**
 * Test seam: callProc reaches the pool through this object so unit tests can
 * swap in a fake pool without a live SQL Server (ESM export bindings are
 * read-only, but object properties are mutable).
 */
export const _internals = { getPool };

/**
 * Dapper-equivalent stored-procedure caller. Binds named params and returns
 * the recordset(s). This is the single seam through which every module reaches
 * the 179 recovered procedures — no ad-hoc SQL anywhere else.
 *
 * @example
 *   const rows = await callProc<CandidateRow>('spSubscriberGetSubscriberForListing', { UserID: 2 });
 */
export async function callProc<T = Record<string, unknown>>(
  procName: string,
  params: ProcParams = {},
): Promise<IProcedureResult<T>> {
  const pool = await _internals.getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value as sql.ISqlType | unknown);
  }
  return request.execute<T>(procName);
}

/** Convenience: first recordset rows only. */
export async function queryProc<T = Record<string, unknown>>(
  procName: string,
  params: ProcParams = {},
): Promise<T[]> {
  const result = (await callProc<T>(procName, params)) as unknown as IResult<T>;
  return result.recordset ?? [];
}

/** Convenience: first row of the first recordset (or null). */
export async function queryProcSingle<T = Record<string, unknown>>(
  procName: string,
  params: ProcParams = {},
): Promise<T | null> {
  const rows = await queryProc<T>(procName, params);
  return rows[0] ?? null;
}
