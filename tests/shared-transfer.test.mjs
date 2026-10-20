import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { PostgresDatabase } from '../server/postgres-db.mjs';
import { importSnapshot } from '../server/shared-transfer.mjs';
import { exportSnapshot } from '../server/shared-export.mjs';

process.env.NODE_ENV = 'test';
test('SQLite snapshot import preserves identities, native fields and receipts without modifying source', () => {
  const source = new DatabaseSync(':memory:');
  source.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  source.exec("INSERT INTO roles VALUES ('OWNER','Owner'),('MEMBER','Member'); INSERT INTO users(id,name,role,password_hash,created_at,updated_at) VALUES ('user-1','Owner','OWNER','fixture-hash','now','now');");
  const data = JSON.stringify({ name: 'Snapshot project', memberIds: ['user-1'], description: 'Exact retained fields\u0000 with Unicode ₹' });
  source.prepare('INSERT INTO projects VALUES (?,?,?,?,?,?)').run('proj-1', data, 'now', 'now', 'user-1', 'user-1');
  source.prepare('INSERT INTO project_members VALUES (?,?)').run('proj-1', 'user-1');
  source.prepare('INSERT INTO mutation_receipts VALUES (?,?,?,?,?,?)').run('user-1', 'mutation-1', 'fingerprint', 201, '{"id":"proj-1"}', 12345);
  const target = new PostgresDatabase({ testDatabase: true });
  try {
    importSnapshot(source, target);
    assert.equal(target.prepare('SELECT data FROM projects WHERE id=?').get('proj-1').data, data);
    assert.equal(target.prepare('SELECT password_hash FROM users WHERE id=?').get('user-1').password_hash, 'fixture-hash');
    assert.deepEqual(target.prepare('SELECT * FROM mutation_receipts').all(), source.prepare('SELECT * FROM mutation_receipts').all().map(r => ({ ...r })));
    assert.equal(source.prepare('SELECT count(*) AS count FROM projects').get().count, 1);
    assert.throws(() => importSnapshot(source, target), /Destination/);
    const recovery = new DatabaseSync(':memory:');
    recovery.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
    try {
      exportSnapshot(target, recovery);
      assert.equal(recovery.prepare('SELECT data FROM projects WHERE id=?').get('proj-1').data, data);
      assert.deepEqual(recovery.prepare('SELECT * FROM mutation_receipts').all(), source.prepare('SELECT * FROM mutation_receipts').all());
      assert.equal(recovery.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    } finally { recovery.close(); }
  } finally { target.close(); source.close(); }
});

test('a failed snapshot import rolls back every inserted destination row', () => {
  const source = new DatabaseSync(':memory:');
  source.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  source.exec("INSERT INTO roles VALUES ('OWNER','Owner'); INSERT INTO users(id,name,role,created_at,updated_at) VALUES ('user-1','Owner','OWNER','now','now'); DROP TABLE tasks;");
  const target = new PostgresDatabase({ testDatabase: true });
  try {
    assert.throws(() => importSnapshot(source, target), /no such table/);
    assert.equal(target.prepare('SELECT count(*) AS count FROM users').get().count, 0);
    assert.equal(target.prepare('SELECT count(*) AS count FROM roles').get().count, 0);
  } finally { target.close(); source.close(); }
});
