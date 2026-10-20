import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.STAGING_DATABASE_URL || 'postgresql://postgres:' + encodeURIComponent('E1p8my66ThMtWgIS') + '@db.vouxtthsvlufjvperhxz.supabase.co:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[SUCCESS] Connected to staging database.');

    const migCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '_migrations'
      ) as has_migrations;
    `);
    console.log('[INFO] Has _migrations table:', migCheck.rows[0].has_migrations);

    if (migCheck.rows[0].has_migrations) {
      const res = await client.query('SELECT name, applied_at FROM _migrations ORDER BY id ASC');
      console.log('[INFO] Applied migrations:', res.rows.map(r => r.name));
    }

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('[INFO] Existing public tables:', tables.rows.map(r => r.table_name));

    const schemas = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name;
    `);
    console.log('[INFO] Schemas:', schemas.rows.map(r => r.schema_name));

  } catch (err) {
    console.error('[ERROR]', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
