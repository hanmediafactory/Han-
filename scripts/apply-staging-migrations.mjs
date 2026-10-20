import fs from 'fs';
import path from 'path';
import pg from 'pg';

const migrationsDir = 'C:/Users/Rakesh/.gemini/antigravity-ide/scratch/han-media-factory-main/server/src/db/migrations';
const ca = fs.readFileSync('C:/Users/Rakesh/.gemini/antigravity-ide/scratch/han-media-factory-main/certs/supabase-root-ca.pem', 'utf8');

async function run() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:E1p8my66ThMtWgIS@db.vouxtthsvlufjvperhxz.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: true, ca }
  });

  await client.connect();
  console.log('[MIGRATION] Connected to staging database via verified TLS.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRows = await client.query('SELECT name FROM _migrations ORDER BY id ASC');
  const appliedSet = new Set(appliedRows.rows.map(r => r.name));

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && !f.endsWith('_down.sql')).sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log('[MIGRATION] Already applied:', file);
      continue;
    }

    console.log('[MIGRATION] Applying website migration:', file);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('[MIGRATION] Successfully applied:', file);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[MIGRATION] Error in ' + file + ':', err.message);
      throw err;
    }
  }

  // Also apply 001_shared_workspace.sql if needed
  const sharedWorkspacePath = 'C:/Users/Rakesh/Desktop/HAN TO DO LIST/server/migrations/001_shared_workspace.sql';
  if (fs.existsSync(sharedWorkspacePath)) {
    const sharedName = '001_shared_workspace.sql';
    if (!appliedSet.has(sharedName)) {
      console.log('[MIGRATION] Applying mobile shared workspace migration:', sharedName);
      const sql = fs.readFileSync(sharedWorkspacePath, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public._migrations (name) VALUES ($1)', [sharedName]);
        await client.query('COMMIT');
        console.log('[MIGRATION] Successfully applied mobile shared workspace migration:', sharedName);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[MIGRATION] Error in shared workspace migration:', err.message);
        throw err;
      }
    }
  }

  console.log('[MIGRATION] All migrations finished successfully!');
  await client.end();
}

run().catch(e => {
  console.error('[MIGRATION FATAL]:', e);
  process.exit(1);
});
