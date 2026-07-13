import sql from 'mssql';
import { env } from '@/config/env';

/**
 * SQL Server connection pool (lazy). Mirrors the reference Dapper layer:
 * the app talks to the database exclusively through stored procedures.
 */
const config: sql.config = {
  server: env.DB_SERVER,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERT,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool: sql.ConnectionPool) => {
        // eslint-disable-next-line no-console
        console.log(`[db] connected to ${env.DB_SERVER}/${env.DB_NAME}`);
        return pool;
      })
      .catch((err: unknown) => {
        poolPromise = null; // allow retry on next call
        throw err;
      });
  }
  return poolPromise;
}

export { sql };
