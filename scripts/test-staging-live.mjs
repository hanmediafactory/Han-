import fs from 'fs';
import pg from 'pg';

const ca = fs.readFileSync('C:/Users/Rakesh/.gemini/antigravity-ide/scratch/han-media-factory-main/certs/supabase-root-ca.pem', 'utf8');

async function testStagingDirect() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:E1p8my66ThMtWgIS@db.vouxtthsvlufjvperhxz.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: true, ca }
  });
  await client.connect();
  console.log('STAGING_CONNECTED_VERIFIED');

  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'han_workspace') 
    ORDER BY table_schema, table_name;
  `);
  console.log('STAGING_TABLE_COUNT:', tables.rows.length);

  await client.query('BEGIN');
  const testId = 'test_' + Date.now();
  await client.query("INSERT INTO han_workspace.roles (id, name) VALUES ('role-operator', 'Operator') ON CONFLICT DO NOTHING;");
  await client.query(`
    INSERT INTO han_workspace.users (id, name, role, created_at, updated_at) 
    VALUES ($1, 'Staging Probe', 'role-operator', NOW()::text, NOW()::text);
  `, [testId]);
  
  const readBack = await client.query('SELECT id, name FROM han_workspace.users WHERE id = $1', [testId]);
  console.log('READ_BACK_ROW:', readBack.rows[0]);
  
  await client.query('ROLLBACK');
  console.log('PROBE_TRANSACTION_ROLLED_BACK_CLEANLY');
  await client.end();
}

testStagingDirect().catch(e => {
  console.error('STAGING_TEST_ERROR:', e);
  process.exit(1);
});
