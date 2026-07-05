import { Pool } from 'pg';
import type { RoastResult, Categorization } from './roastTypes';

let pool: Pool | null | undefined;
let schemaReady: Promise<void> | null = null;
let warnedNoDb = false;

function getPool(): Pool | null {
  if (pool !== undefined) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    pool = null;
    return null;
  }
  pool = new Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } });
  return pool;
}

async function ensureSchema(p: Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = p
      .query(
        `CREATE TABLE IF NOT EXISTS creative_analysis (
          creative_key TEXT PRIMARY KEY,
          roast JSONB,
          categorization JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
      )
      .then(() => undefined);
  }
  return schemaReady;
}

export interface CachedAnalysis {
  roast: RoastResult;
  categorization: Categorization;
}

export async function getCachedAnalysis(creativeKey: string): Promise<CachedAnalysis | null> {
  const p = getPool();
  if (!p) {
    if (!warnedNoDb) {
      console.warn('[db] DATABASE_URL not set — creative analysis caching disabled, every pull will re-analyze.');
      warnedNoDb = true;
    }
    return null;
  }
  try {
    await ensureSchema(p);
    const result = await p.query<{ roast: RoastResult; categorization: Categorization }>(
      'SELECT roast, categorization FROM creative_analysis WHERE creative_key = $1',
      [creativeKey],
    );
    const row = result.rows[0];
    return row ? { roast: row.roast, categorization: row.categorization } : null;
  } catch (err) {
    console.error('[db] getCachedAnalysis failed', err);
    return null;
  }
}

export async function saveAnalysis(creativeKey: string, roast: RoastResult, categorization: Categorization): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await ensureSchema(p);
    await p.query(
      `INSERT INTO creative_analysis (creative_key, roast, categorization)
       VALUES ($1, $2, $3)
       ON CONFLICT (creative_key) DO UPDATE SET roast = $2, categorization = $3, created_at = now()`,
      [creativeKey, JSON.stringify(roast), JSON.stringify(categorization)],
    );
  } catch (err) {
    console.error('[db] saveAnalysis failed', err);
  }
}
