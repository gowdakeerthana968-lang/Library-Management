import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * pg v8 overwrites config.ssl when sslmode/ssl query params exist in connectionString.
 * Removing sslmode/ssl from the URL ensures explicit `ssl: { rejectUnauthorized: false }`
 * is honored for Aiven PostgreSQL cloud databases.
 */
export function sanitizeDatabaseUrlForSsl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('ssl');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function getPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not configured. Set your PostgreSQL connection string to connect.',
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString: sanitizeDatabaseUrlForSsl(connectionString),
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
