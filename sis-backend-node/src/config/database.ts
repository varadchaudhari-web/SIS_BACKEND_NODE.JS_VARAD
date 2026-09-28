import { Pool, PoolClient } from 'pg';
import { env } from './env';

export const pool = new Pool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  database: env.DB.DATABASE,
  max: env.DB.CONNECTION_LIMIT,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Convert MySQL '?' placeholders to PostgreSQL '$1, $2, ...' placeholders
 */
function convertPlaceholders(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export interface ExecResult {
  insertId: number;
  affectedRows: number;
  rowCount: number;
  rows?: any[];
}

export interface DbConnection {
  query: <T = any>(sql: string, params?: any[]) => Promise<[T[], any]>;
  execute: (sql: string, params?: any[]) => Promise<[ExecResult, any]>;
  release: () => void;
}

/**
 * Execute a query with parameterized values
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);
  return result.rows as T[];
}

/**
 * Execute a query and return the first row (or null)
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an INSERT / UPDATE / DELETE statement and return result metadata
 */
export async function execute(sql: string, params: any[] = []): Promise<ExecResult> {
  let pgSql = convertPlaceholders(sql);
  const isInsert = /^\s*insert\s+/i.test(pgSql);

  // If it is an INSERT and doesn't already have a RETURNING clause, add RETURNING id if possible
  if (isInsert && !/\breturning\b/i.test(pgSql)) {
    try {
      const returningSql = `${pgSql.replace(/;\s*$/, '')} RETURNING id`;
      const res = await pool.query(returningSql, params);
      const insertId = res.rows.length > 0 && res.rows[0].id ? Number(res.rows[0].id) : 0;
      return {
        insertId,
        affectedRows: res.rowCount ?? 0,
        rowCount: res.rowCount ?? 0,
        rows: res.rows,
      };
    } catch {
      // Fallback to standard execution if RETURNING id fails (e.g., table has no id column)
    }
  }

  const result = await pool.query(pgSql, params);
  return {
    insertId: 0,
    affectedRows: result.rowCount ?? 0,
    rowCount: result.rowCount ?? 0,
    rows: result.rows,
  };
}

/**
 * Helper to wrap PoolClient into DbConnection
 */
function wrapClient(client: PoolClient): DbConnection {
  return {
    query: async <T = any>(sql: string, params: any[] = []): Promise<[T[], any]> => {
      const pgSql = convertPlaceholders(sql);
      const res = await client.query(pgSql, params);
      return [res.rows as T[], null];
    },
    execute: async (sql: string, params: any[] = []): Promise<[ExecResult, any]> => {
      let pgSql = convertPlaceholders(sql);
      const isInsert = /^\s*insert\s+/i.test(pgSql);

      if (isInsert && !/\breturning\b/i.test(pgSql)) {
        try {
          const returningSql = `${pgSql.replace(/;\s*$/, '')} RETURNING id`;
          const res = await client.query(returningSql, params);
          const insertId = res.rows.length > 0 && res.rows[0].id ? Number(res.rows[0].id) : 0;
          return [
            {
              insertId,
              affectedRows: res.rowCount ?? 0,
              rowCount: res.rowCount ?? 0,
              rows: res.rows,
            },
            null,
          ];
        } catch {
          // Ignore fallback
        }
      }

      const result = await client.query(pgSql, params);
      return [
        {
          insertId: 0,
          affectedRows: result.rowCount ?? 0,
          rowCount: result.rowCount ?? 0,
          rows: result.rows,
        },
        null,
      ];
    },
    release: () => client.release(),
  };
}

/**
 * Run operations inside a managed database transaction
 */
export async function transaction<T>(callback: (conn: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const wrapped = wrapClient(client);
  try {
    await client.query('BEGIN');
    const result = await callback(wrapped);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}


