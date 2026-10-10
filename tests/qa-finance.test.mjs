import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'han-qa-finance-'));
process.env.HAN_DB_PATH = join(directory, 'fixture.sqlite');
const { app } = await import('../server/app.mjs');
const { db, hashPassword } = await import('../server/db.mjs');
await import('../server/seed.mjs');
const password = 'QA-local-only-finance-2026';
db.prepare('UPDATE users SET password_hash=?').run(hashPassword(password));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/`;
const auth = await fetch(`${base}login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'user-1', password }) });
const headers = { 'Content-Type': 'application/json', Cookie: auth.headers.get('set-cookie').split(';')[0], 'X-CSRF-Token': (await auth.json()).csrf };
after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); rmSync(directory, { recursive: true, force: true }); });
async function call(path, method = 'GET', data) {
  const response = await fetch(base + path, { method, headers, body: data ? JSON.stringify(data) : undefined });
  return { status: response.status, data: await response.json() };
}
beforeEach(async () => {
  // Deterministic cleanup is strictly inside this temporary database.
  db.exec('DELETE FROM salary_payments; DELETE FROM settlements; DELETE FROM expenses; DELETE FROM savings_entries; DELETE FROM income;');
  assert.equal((await call('income', 'POST', { title: 'QA fixture capital', amount: 20000, category: 'Revenue', date: '2026-10-10' })).status, 201);
});

test('QA-LEDGER-001 salary-linked expenses cannot be independently voided', async () => {
  const salary = await call('salary_payments', 'POST', { name: 'QA salary', amount: 500, date: '2026-10-10' });
  assert.equal(salary.status, 201);
  const before = (await call('state')).data;
  const expense = before.transactions.find(item => item.salaryPaymentId === salary.data.id);
  assert.ok(expense);
  assert.equal((await call(`expenses/${expense.id}/void`, 'POST', { reason: 'QA rejected bypass' })).status, 409);
  const after = (await call('state')).data;
  assert.deepEqual(after.finance, before.finance);
  assert.equal(after.transactions.find(item => item.id === expense.id).status, expense.status);
});

test('QA-LEDGER-002 zero-debt settlements are rejected without creating reverse debt', async () => {
  // Use a pair with no cross-founder salary allocations after independent fixture cleanup.
  const salaries = (await call('state')).data.salary_payments;
  for (const salary of salaries) assert.equal((await call(`salary_payments/${salary.id}`, 'DELETE')).status, 200);
  const before = (await call('state')).data;
  assert.equal(before.finance.pairwise.length, 0);
  assert.equal((await call('settlements', 'POST', { payerId: 'user-2', recipientId: 'user-1', amount: 10, date: '2026-10-10' })).status, 400);
  const after = (await call('state')).data;
  assert.deepEqual(after.finance, before.finance);
  assert.equal(after.settlements.length, before.settlements.length);
});

test('QA-LEDGER-003 custom splits require explicit reconciled allocations', async () => {
  const payload = { title: 'QA missing allocations', amount: 100, category: 'Operations', date: '2026-10-10', paidBy: 'user-1', splitType: 'custom' };
  const before = (await call('state')).data.finance;
  assert.equal((await call('expenses', 'POST', payload)).status, 400);
  assert.equal((await call('expenses', 'POST', { ...payload, allocations: [] })).status, 400);
  assert.equal((await call('expenses', 'POST', { ...payload, allocations: [{ userId: 'user-1', amount: 50 }] })).status, 400);
  assert.deepEqual((await call('state')).data.finance, before);
});

test('QA-LEDGER-004 settlement edits cannot overpay, change to a debt-free pair or manufacture reverse debt', async () => {
  const expense = await call('expenses', 'POST', { title: 'QA shared debt', amount: 100, category: 'Operations', date: '2026-10-10', paidBy: 'user-1', splitType: 'custom', allocations: [{ userId: 'user-1', amount: 50 }, { userId: 'user-2', amount: 50 }] });
  assert.equal(expense.status, 201);
  const settlement = await call('settlements', 'POST', { payerId: 'user-2', recipientId: 'user-1', amount: 20, date: '2026-10-10' });
  assert.equal(settlement.status, 201);
  const before = (await call('state')).data.finance;
  assert.equal((await call(`settlements/${settlement.data.id}`, 'PATCH', { amount: 51 })).status, 400);
  assert.equal((await call(`settlements/${settlement.data.id}`, 'PATCH', { payerId: 'user-3', amount: 10 })).status, 400);
  assert.deepEqual((await call('state')).data.finance, before);
  assert.equal((await call(`settlements/${settlement.data.id}`, 'PATCH', { amount: 30 })).status, 200);
  assert.equal((await call('state')).data.finance.pairwise.find(pair => pair.debtorId === 'user-2' && pair.creditorId === 'user-1').amount, 20);
});

test('QA-PERM-002 owner can configure all canonical permissions and unknown keys remain rejected', async () => {
  const permissionIds = (await call('state')).data.permissionIds;
  const payload = { name: 'Nihaal', role: 'MEMBER', active: true, permissions: permissionIds };
  assert.equal((await call('users/user-2', 'PATCH', payload)).status, 200);
  assert.deepEqual((await call('state')).data.users.find(user => user.id === 'user-2').permissions, permissionIds);
  assert.equal((await call('users/user-2', 'PATCH', { ...payload, permissions: ['unknown.admin'] })).status, 400);
});
