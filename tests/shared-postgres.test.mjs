import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSharedRuntimePrivileges } from '../server/shared-runtime-policy.mjs';

process.env.NODE_ENV = 'test';
process.env.HAN_TEST_POSTGRES = '1';
process.env.HAN_DATABASE_URL = '';
process.env.VAPID_PUBLIC_KEY = '';
process.env.HAN_FCM_ENABLED = '0';
process.env.HAN_ADMIN_BRIDGE_SECRET = randomBytes(32).toString('hex');
const { app, closeWorkspaceStreams } = await import('../server/app.mjs');
const { db, hashPassword } = await import('../server/db.mjs');
const password = randomBytes(24).toString('hex');
db.prepare('UPDATE users SET password_hash=?').run(hashPassword(password));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const login = await fetch(origin + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'user-1', password }) });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
const csrf = (await login.json()).csrf;
async function call(path, method = 'GET', body, key = randomUUID(), version) {
  const response = await fetch(origin + '/api/' + path, { method, headers: { Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json', 'Idempotency-Key': key, ...(version ? { 'If-Unmodified-Since': version } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
let project, task;
test('shared PostgreSQL preserves projects, memberships, task states, receipts and conflicts', async () => {
  const key = randomUUID();
  const body = { name: 'Shared production', memberIds: ['user-1', 'user-2'], description: 'retain every field', deadline: '2026-12-01' };
  project = await call('projects', 'POST', body, key);
  assert.equal(project.status, 201, JSON.stringify(project.body));
  assert.deepEqual(await call('projects', 'POST', body, key), project);
  assert.equal((await call('projects', 'POST', { ...body, name: 'changed' }, key)).status, 409);
  assert.equal(db.prepare('SELECT count(*) AS count FROM project_members WHERE project_id=?').get(project.body.id).count, 2);
  task = await call('tasks', 'POST', { title: 'Shared task', projectId: project.body.id, assignedUserId: 'user-2', date: '2026-11-01', priority: 'MEDIUM', notes: 'retained', status: 'CANCELLED' });
  assert.equal(task.status, 201, JSON.stringify(task.body));
  const before = (await call('state')).body.tasks.find(t => t.id === task.body.id);
  assert.equal(before.status, 'CANCELLED');
  assert.equal(before.notes, 'retained');
  assert.equal((await call(`tasks/${task.body.id}`, 'PATCH', { status: 'COMPLETED' }, randomUUID(), before.updated_at)).status, 200);
  assert.equal((await call(`tasks/${task.body.id}`, 'PATCH', { status: 'TODO' }, randomUUID(), before.updated_at)).status, 409);
});

test('finances, leads, funnels, notifications and protected savings preserve the mobile domain', async () => {
  const payloads = [
    ['income', { title: 'Funds', amount: 10000, category: 'Client', date: '2026-10-20' }],
    ['expenses', { title: 'Split expense', amount: 100, category: 'Travel', date: '2026-10-20', paidBy: 'user-1', splitType: 'equal' }],
    ['leads', { name: 'Actual mobile lead', category: 'Brand', status: 'Follow Up', email: 'lead@example.com', assignedUserId: 'user-1' }],
    ['funnels', { title: 'Actual funnel', steps: [{ id: 1, title: 'Qualify', status: 'Pending' }] }],
    ['calendar_events', { title: 'Shoot', assignedUserId: 'user-1', date: '2026-11-01' }],
    ['savings_entries', { title: 'Reserve', amount: 50, date: '2026-10-20' }],
    ['salary_payments', { name: 'Salary', amount: 25, date: '2026-10-20' }],
  ];
  for (const [table, payload] of payloads) assert.equal((await call(table, 'POST', payload)).status, 201, table);
  const state = (await call('state')).body;
  assert.equal(state.expenses.find(e => e.title === 'Split expense').allocations.length, 4);
  assert.ok(state.notifications.length > 0);
  const read = await call('notifications/read', 'POST', {});
  assert.equal(read.status, 200);
  assert.ok((await call('state')).body.notifications.every(n => n.read));
  assert.equal((await call('expenses', 'POST', { title: 'Overspend', amount: 999999, category: 'Travel', date: '2026-10-20' })).status, 409);
});

test('admin bridge requires a secret, explicit identity link, existing permissions and idempotency', async () => {
  const admin = '12345678-1234-1234-1234-123456789012';
  const headers = { Authorization: `HAN-Bridge ${process.env.HAN_ADMIN_BRIDGE_SECRET}`, 'X-HAN-Admin-ID': admin, 'Content-Type': 'application/json' };
  assert.equal((await fetch(origin + '/api/state', { headers })).status, 403);
  db.prepare('INSERT INTO admin_links VALUES (?,?)').run(admin, 'user-2');
  const restricted = await (await fetch(origin + '/api/state', { headers })).json();
  assert.equal(restricted.finance, null);
  for (const collection of ['expenses','income','settlements','savings_entries','salary_payments','transactions','activity_logs']) assert.deepEqual(restricted[collection], []);
  assert.equal((await fetch(origin + '/api/income', { headers })).status, 403);
  let response = await fetch(origin + '/api/income', { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ title: 'Forbidden', amount: 100, category: 'Client', date: '2026-10-20' }) });
  assert.equal(response.status, 403);
  db.prepare('UPDATE admin_links SET workspace_user_id=? WHERE admin_user_id=?').run('user-1', admin);
  response = await fetch(origin + '/api/projects', { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ name: 'From admin', memberIds: ['user-1'] }) });
  assert.equal(response.status, 201, await response.text());
  assert.ok((await call('state')).body.projects.some(p => p.name === 'From admin'));
  assert.equal(db.prepare('SELECT count(*) AS count FROM admin_audit WHERE admin_user_id=?').get(admin).count, 1);
});

test('database roles expose no anonymous/authenticated access and protect owner identity', () => {
  assert.throws(() => assertSharedRuntimePrivileges(db), /restricted han_workspace_server/);
  assert.throws(() => db.prepare('UPDATE users SET active=0 WHERE id=?').run('user-1'), /Owner account is protected/);
  for (const role of ['anon', 'authenticated']) {
    db.exec(`SET ROLE ${role}`);
    assert.throws(() => db.prepare('SELECT * FROM han_workspace.users').all(), /permission denied/);
    db.exec('RESET ROLE');
  }
  db.exec('SET ROLE han_workspace_server');
  assert.doesNotThrow(() => assertSharedRuntimePrivileges(db));
  assert.equal(db.prepare('SELECT count(*) AS count FROM users').get().count, 4);
  assert.throws(() => db.prepare('UPDATE admin_links SET workspace_user_id=?').run('user-2'), /permission denied/);
  db.exec('RESET ROLE');
});

test('failed and unknown commit acknowledgements retry once using the same durable receipt', async () => {
  for (const committed of [false, true]) {
    const key = randomUUID(), payload = { name: committed ? 'Lost acknowledgement' : 'Rolled back request', memberIds: ['user-1'] };
    const before = db.prepare('SELECT count(*) AS count FROM projects').get().count;
    const original = db.call;
    let armed = true;
    db.call = function(operation, sql, params) {
      if (armed && operation === 'raw' && sql === 'COMMIT') {
        armed = false;
        original.call(this, 'raw', committed ? 'COMMIT' : 'ROLLBACK');
        throw Object.assign(new Error('Injected lost commit acknowledgement'), { status: 503 });
      }
      return original.call(this, operation, sql, params);
    };
    try { assert.equal((await call('projects', 'POST', payload, key)).status, 503); }
    finally { db.call = original; }
    assert.equal(db.prepare('SELECT count(*) AS count FROM projects').get().count, before + Number(committed));
    assert.equal((await call('projects', 'POST', payload, key)).status, 201);
    assert.equal((await call('projects', 'POST', payload, key)).status, 201);
    assert.equal(db.prepare('SELECT count(*) AS count FROM projects').get().count, before + 1);
  }
});

test('full row snapshot/recovery retains every shared table, receipts and identity links', () => {
  const tables = ['schema_migrations', 'roles', 'permissions', 'users', 'sessions', 'projects', 'project_members', 'tasks', 'expenses', 'income', 'team_members', 'leads', 'clients', 'client_followups', 'client_calls', 'client_emails', 'inquiries', 'funnels', 'funnel_steps', 'notifications', 'calendar_events', 'activity_logs', 'categories', 'settings', 'push_subscriptions', 'mutation_receipts', 'notification_preferences', 'push_outbox', 'reminder_receipts', 'native_push_tokens', 'savings_entries', 'salary_payments', 'webhooks', 'webhook_outbox', 'settlements', 'admin_links', 'admin_audit'];
  const snapshots = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table}`).all()]));
  db.exec('DROP SCHEMA han_workspace CASCADE'); // This worker owns a disposable, in-memory database only.
  db.exec('BEGIN');
  db.exec(readFileSync(new URL('../server/migrations/001_shared_workspace.sql', import.meta.url), 'utf8'));
  db.exec('COMMIT');
  db.exec('TRUNCATE han_workspace.schema_migrations');
  db.exec('BEGIN');
  for (const table of tables) for (const row of snapshots[table]) {
    const columns = Object.keys(row);
    db.prepare(`INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...columns.map(c => row[c]));
  }
  db.exec('COMMIT');
  for (const table of tables) assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all(), snapshots[table], table);
});

test('Fastify admin and Express mobile read and write the same operational records', { skip: !process.env.HAN_ADMIN_REPO }, async () => {
  const root = process.env.HAN_ADMIN_REPO;
  const load = path => import(pathToFileURL(resolve(root, path)).href);
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/test';
  process.env.SUPABASE_URL = 'http://127.0.0.1:1'; process.env.SUPABASE_ANON_KEY = ''; process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  const { setDbClient } = await load('dist-server/db/client.js');
  const { SessionService } = await load('dist-server/modules/identity/session.js');
  const adapter = { query: async (sql, params) => { db.exec('SET search_path = public, pg_catalog'); try { const r = db.call('raw', sql, params); return { rows: r.rows, rowCount: r.changes || r.rows.length }; } finally { db.exec('SET search_path = han_workspace, pg_catalog'); } }, withTransaction: async fn => { db.exec('BEGIN'); try { const r = await fn(adapter); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } }, checkHealth: async () => ({ healthy: true, latencyMs: 0 }), getPool: () => null, close: async () => {} };
  setDbClient(adapter);
  db.exec('SET search_path = public, pg_catalog');
  for (const name of ['001_initial_schema.sql', '002_security_hardening.sql', '003_operations_and_crm.sql']) db.exec(readFileSync(resolve(root, 'server/src/db/migrations', name), 'utf8'));
  db.exec('SET search_path = han_workspace, pg_catalog');
  const admin = '12345678-1234-1234-1234-123456789012';
  db.prepare('INSERT INTO admin_links (admin_user_id, workspace_user_id) VALUES (?,?) ON CONFLICT DO NOTHING').run(admin, 'user-1');
  await adapter.query("INSERT INTO public.users(id,email,password_hash,role,status,mfa_enabled) VALUES ($1,'admin@example.com','fixture-only','OWNER','ACTIVE',true)", [admin]);
  const { sessionToken } = await SessionService.createSession(admin, '127.0.0.1', 'fixture', 'FULL');
  process.env.WORKSPACE_API_URL = origin;
  process.env.WORKSPACE_BRIDGE_SECRET = process.env.HAN_ADMIN_BRIDGE_SECRET;
  const { buildApp } = await load('dist-server/app.js');
  const fastify = buildApp();
  try {
    const response = await fastify.inject({ method: 'GET', url: '/api/admin/workspace/state', cookies: { han_session: sessionToken } });
    assert.equal(response.statusCode, 200, response.body);
    // 1. Mobile creates client -> Fastify admin reads it
    const clientPayload = { name: 'Acme Studios', contact_person: 'Alice', phone: '+91 9876543210', email: 'alice@acme.com', service: 'Film Production', stage: 'Discovery' };
    const mobileClient = await call('clients', 'POST', clientPayload);
    assert.equal(mobileClient.status, 201);
    const adminState1 = (await fastify.inject({ method: 'GET', url: '/api/admin/workspace/state', cookies: { han_session: sessionToken } })).json();
    assert.ok(adminState1.clients.some(c => c.name === 'Acme Studios' && c.stage === 'Discovery'));

    // 2. Fastify admin updates client stage to Active -> Mobile reads updated stage
    const patchClient = await fastify.inject({
      method: 'PATCH',
      url: `/api/admin/workspace/clients/${mobileClient.body.id}`,
      cookies: { han_session: sessionToken },
      headers: { 'Idempotency-Key': randomUUID() },
      payload: { stage: 'Active' },
    });
    assert.equal(patchClient.statusCode, 200);
    const mobileState1 = (await call('state')).body;
    const syncedClient = mobileState1.clients.find(c => c.id === mobileClient.body.id);
    assert.equal(syncedClient.stage, 'Active');

    // 3. Fastify admin schedules follow-up -> Mobile completes it
    const followupRes = await fastify.inject({
      method: 'POST',
      url: '/api/admin/workspace/client_followups',
      cookies: { han_session: sessionToken },
      headers: { 'Idempotency-Key': randomUUID() },
      payload: { company: 'Acme Studios', person: 'Alice', purpose: 'Review storyboard', time_str: '02:00 PM', status: 'Scheduled' },
    });
    assert.equal(followupRes.statusCode, 201);
    const followupId = followupRes.json().id;
    const mobileComplete = await call(`client_followups/${followupId}`, 'PATCH', { status: 'Completed' });
    assert.equal(mobileComplete.status, 200);
    const adminFollowupCheck = (await fastify.inject({ method: 'GET', url: '/api/admin/workspace/state', cookies: { han_session: sessionToken } })).json();
    assert.equal(adminFollowupCheck.client_followups.find(f => f.id === followupId).status, 'Completed');

    // 4. Log a call in mobile -> verify record and audit attribution in admin
    const callLogRes = await call('client_calls', 'POST', {
      business: 'Acme Studios',
      contact: 'Alice',
      phone: '+91 9876543210',
      type: 'Outbound',
      outcome: 'Budget Approved',
      notes: 'Initial production phase confirmed',
      call_time: 'Today 11:30 AM',
    });
    assert.equal(callLogRes.status, 201);
    const adminCallsCheck = (await fastify.inject({ method: 'GET', url: '/api/admin/workspace/state', cookies: { han_session: sessionToken } })).json();
    const syncedCall = adminCallsCheck.client_calls.find(c => c.id === callLogRes.body.id);
    assert.equal(syncedCall.outcome, 'Budget Approved');
    assert.equal(syncedCall.created_by, 'user-1');

    // 5. Inbound inquiry from website -> verify status and conversion in mobile
    const inquiryRes = await fastify.inject({
      method: 'POST',
      url: '/api/admin/workspace/inquiries',
      cookies: { han_session: sessionToken },
      headers: { 'Idempotency-Key': randomUUID() },
      payload: {
        brand: 'Red Bull Racing',
        name: 'Christian',
        email: 'horner@redbull.com',
        phone: '+44 1908 279700',
        message: 'Need high-octane VFX teaser video for season opener',
        budget_band: '₹15L - ₹25L',
        status: 'NEW',
        priority: 'URGENT',
      },
    });
    assert.equal(inquiryRes.statusCode, 201);
    const inquiryId = inquiryRes.json().id;
    // Mobile reads the inquiry and converts it to a Lead
    const mobileInquiryState = (await call('state')).body;
    const receivedInquiry = mobileInquiryState.inquiries.find(i => i.id === inquiryId);
    assert.equal(receivedInquiry.brand, 'Red Bull Racing');
    assert.equal(receivedInquiry.priority, 'URGENT');
    const convertLead = await call('leads', 'POST', {
      name: `${receivedInquiry.brand} (${receivedInquiry.name})`,
      category: 'Website Inquiry',
      status: 'New',
      email: receivedInquiry.email,
      phone: receivedInquiry.phone,
      source: 'Website Inquiry',
      dealValue: 2000000,
      nextAction: 'Prepare storyboard presentation',
      assignedUserId: 'user-1',
    });
    assert.equal(convertLead.status, 201);
    // Mobile updates inquiry status to IN_REVIEW
    const updateInquiry = await call(`inquiries/${inquiryId}`, 'PATCH', { status: 'IN_REVIEW' });
    assert.equal(updateInquiry.status, 200);
    const adminInquiryCheck = (await fastify.inject({ method: 'GET', url: '/api/admin/workspace/state', cookies: { han_session: sessionToken } })).json();
    assert.equal(adminInquiryCheck.inquiries.find(i => i.id === inquiryId).status, 'IN_REVIEW');
    assert.ok(adminInquiryCheck.leads.some(l => l.name.includes('Red Bull Racing')));

    // 6. Project & task created in mobile -> verify in admin
    const projectRes = await call('projects', 'POST', {
      name: 'Commercial Series 2026',
      memberIds: ['user-1'],
      category: 'Active',
      deadline: '2026-12-31',
    });
    assert.equal(projectRes.status, 201);
    const taskRes = await call('tasks', 'POST', {
      title: 'Post-production grade',
      projectId: projectRes.body.id,
      assignedUserId: 'user-1',
      date: '2026-11-15',
      status: 'TODO',
      priority: 'HIGH',
    });
    assert.equal(taskRes.status, 201);
    const adminWorkspaceAfterProj = (await fastify.inject({ method: 'GET', url: '/api/admin/workspace/state', cookies: { han_session: sessionToken } })).json();
    assert.ok(adminWorkspaceAfterProj.projects.some(p => p.id === projectRes.body.id));
    assert.ok(adminWorkspaceAfterProj.tasks.some(t => t.id === taskRes.body.id));

    // 7. Admin updates task to COMPLETED -> Mobile reflects completed status and project auto-recalculates progress
    const patchTask = await fastify.inject({
      method: 'PATCH',
      url: `/api/admin/workspace/tasks/${taskRes.body.id}`,
      cookies: { han_session: sessionToken },
      headers: { 'Idempotency-Key': randomUUID() },
      payload: { status: 'COMPLETED' },
    });
    assert.equal(patchTask.statusCode, 200);
    const mobileStateAfterTask = (await call('state')).body;
    const completedTask = mobileStateAfterTask.tasks.find(t => t.id === taskRes.body.id);
    assert.equal(completedTask.status, 'COMPLETED');
    assert.equal(completedTask.progress, 100);
    const autoUpdatedProject = mobileStateAfterTask.projects.find(p => p.id === projectRes.body.id);
    assert.equal(autoUpdatedProject.progress, 100);
    assert.equal(autoUpdatedProject.category, 'Completed');

    // 8. Finance records verified under authorized permissions; protected savings and overdraft prevention
    await call('income', 'POST', { title: 'Client Retainer Fund', amount: 5000, category: 'Production', date: '2026-10-20' });
    const savingsRes = await call('savings_entries', 'POST', {
      title: 'Equipment Reserve Q4',
      amount: 1500,
      date: '2026-10-20',
      notes: 'Camera upgrade fund',
    });
    assert.equal(savingsRes.status, 201);
    // Verify protected savings cannot be deleted or overspent
    const deleteSavingsAttempt = await call(`savings_entries/${savingsRes.body.id}`, 'DELETE');
    assert.equal(deleteSavingsAttempt.status, 409); // Protected savings balance immutable
    const financeState = (await call('state')).body.finance;
    assert.ok(financeState.savings >= 1500);
  } finally { await fastify.close(); }
});

after(async () => { closeWorkspaceStreams(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); db.close(); });

test('admin browser completes MFA and creates records visible to mobile', { skip: !process.env.HAN_BROWSER_TEST || !process.env.HAN_ADMIN_REPO }, async () => {
  const previousDirectory = process.cwd();
  process.chdir(process.env.HAN_ADMIN_REPO);
  const load = path => import(pathToFileURL(resolve(process.env.HAN_ADMIN_REPO, path)).href);
  const { hashPassword: hashAdminPassword, encryptSecret } = await load('dist-server/modules/identity/crypto.js');
  const { TotpService } = await load('dist-server/modules/identity/totp.js');
  const adminPassword = randomBytes(24).toString('hex');
  const secret = 'JBSWY3DPEHPK3PXP';
  db.exec('SET search_path = public, pg_catalog');
  for (const name of ['001_initial_schema.sql', '002_security_hardening.sql', '003_operations_and_crm.sql']) db.exec(readFileSync(resolve(process.env.HAN_ADMIN_REPO, 'server/src/db/migrations', name), 'utf8'));
  db.exec('SET search_path = han_workspace, pg_catalog');
  db.prepare('INSERT INTO admin_links (admin_user_id, workspace_user_id) VALUES (?,?) ON CONFLICT DO NOTHING').run('12345678-1234-1234-1234-123456789012', 'user-1');
  db.call('raw', "INSERT INTO public.users(id,email,password_hash,role,status,mfa_enabled) VALUES ($1,'admin@example.com','fixture-only','OWNER','ACTIVE',true) ON CONFLICT (email) DO NOTHING", ['12345678-1234-1234-1234-123456789012']);
  db.call('raw', 'UPDATE public.users SET password_hash=$1,mfa_secret_encrypted=$2 WHERE id=$3', [await hashAdminPassword(adminPassword), encryptSecret(secret), '12345678-1234-1234-1234-123456789012']);
  const { createServer } = await import('node:net');
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const { env } = await load('dist-server/config/env.js');
  env.ALLOWED_ORIGINS += `,http://127.0.0.1:${port}`;
  const { buildApp } = await load('dist-server/app.js');
  const fastify = buildApp();
  const address = await fastify.listen({ host: '127.0.0.1', port });
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(address + '/admin');
    await page.locator('#login-email').fill('admin@example.com');
    await page.locator('#login-password').fill(adminPassword);
    await page.locator('#btn-login-submit').click();
    await page.locator('#form-mfa').waitFor({ state: 'visible' });
    await page.locator('#mfa-code').fill(TotpService.generateCode(secret));
    await page.click('#btn-mfa-submit');
    await page.locator('#auth-overlay').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Production workspace', exact: true }).click();
    await page.locator('#workspace-status').filter({ hasText: 'snapshot loaded' }).waitFor();
    await page.locator('#workspace-project-form').getByLabel('Project name').fill('Created through admin browser');
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    await page.locator('#workspace-lists').getByText('Created through admin browser', { exact: true }).waitFor();
    assert.ok((await call('state')).body.projects.some(p => p.name === 'Created through admin browser'));
    await page.screenshot({ path: resolve(previousDirectory, 'work/codex-admin-workspace.png'), fullPage: true });
    await context.close();
  } finally { await browser.close(); await fastify.close(); process.chdir(previousDirectory); }
});
