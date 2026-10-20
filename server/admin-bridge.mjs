import { timingSafeEqual } from 'node:crypto';

export const workspaceCollections = ['projects', 'tasks', 'expenses', 'income', 'leads', 'clients', 'client_followups', 'client_calls', 'client_emails', 'inquiries', 'funnels', 'calendar_events', 'notifications', 'team_members', 'categories', 'settings', 'savings_entries', 'salary_payments', 'settlements'];

export function adminBridge(db) {
  return (req, res, next) => {
    if (!req.headers.authorization?.startsWith('HAN-Bridge ')) return next();
    const expected = process.env.HAN_ADMIN_BRIDGE_SECRET;
    const provided = req.headers.authorization.slice('HAN-Bridge '.length);
    if (db.dialect !== 'postgres' || !expected || expected.length < 32 || Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      return res.status(401).json({ error: 'Invalid admin bridge credentials.' });
    }
    const actor = req.get('X-HAN-Admin-ID');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor || '')) return res.status(403).json({ error: 'Admin identity mapping required.' });
    const collection = req.path.split('/')[1];
    const stateRead = req.method === 'GET' && req.path === '/state';
    if (!(req.method === 'GET' && collection === 'state') && !workspaceCollections.includes(collection)) return res.status(403).json({ error: 'Unsupported workspace operation.' });
    const user = db.prepare('SELECT u.* FROM users u JOIN admin_links l ON l.workspace_user_id=u.id WHERE l.admin_user_id=? AND u.active=1').get(actor);
    if (!user) return res.status(403).json({ error: 'Admin identity is not linked to an active workspace account.' });
    const financeView = user.role === 'OWNER' || JSON.parse(user.permissions).includes('finance.view');
    const financeCollections = ['expenses', 'income', 'settlements', 'savings_entries', 'salary_payments'];
    if (req.method === 'GET' && financeCollections.includes(collection) && !financeView) return res.status(403).json({ error: 'Finance viewing permission required.' });
    if (req.method !== 'GET' && !req.get('Idempotency-Key')) return res.status(400).json({ error: 'Idempotency-Key is required.' });
    req.workspaceBridge = true;
    req.workspaceAdminId = actor;
    req.user = user;
    const json = res.json.bind(res);
    res.json = body => {
      if (stateRead && body && !financeView) {
        body = { ...body, finance: null, activity_logs: [],
          notifications: (body.notifications || []).filter(row => row.category !== 'Payments' && row.targetScreen !== 'money'),
          team_members: (body.team_members || []).map(({ sharePercentage, ...row }) => row),
        };
        for (const table of [...financeCollections, 'transactions']) body[table] = [];
      }
      if (!['GET', 'HEAD'].includes(req.method) && res.statusCode < 400) {
        db.prepare('INSERT INTO admin_audit (admin_user_id, workspace_user_id, method, path, mutation_key, created_at) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING').run(actor, user.id, req.method, req.path, req.get('Idempotency-Key'), new Date().toISOString());
      }
      return json(body);
    };
    next();
  };
}
