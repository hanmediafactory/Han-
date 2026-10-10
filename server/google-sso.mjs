import { randomBytes, createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';

export function googleConfig(env = process.env) {
  try {
    const clientId = env.HAN_GOOGLE_CLIENT_ID;
    const clientSecret = env.HAN_GOOGLE_CLIENT_SECRET;
    const redirectUri = new URL(env.HAN_GOOGLE_REDIRECT_URI);
    const appUrl = new URL(env.HAN_APP_URL);
    const accounts = JSON.parse(env.HAN_GOOGLE_ACCOUNTS || '{}');
    const validUrl = url => url.protocol === 'https:' || (env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
    if (!clientId || !clientSecret || !validUrl(redirectUri) || !validUrl(appUrl) || redirectUri.pathname !== '/api/auth/google/callback' || redirectUri.search || redirectUri.hash || appUrl.search || appUrl.hash || !accounts || Array.isArray(accounts) || typeof accounts !== 'object' || !Object.keys(accounts).length || !Object.entries(accounts).every(([key, value]) => key && typeof value === 'string' && value)) return null;
    return { clientId, clientSecret, redirectUri: redirectUri.href, appUrl: appUrl.href, accounts };
  } catch { return null; }
}

export function mappedGoogleUser(payload, accounts) {
  if (!payload?.sub || payload.email_verified !== true) return null;
  // Prefer Google's stable subject. Email mapping is allowed only when Google
  // is authoritative for the address (Gmail or a verified Workspace domain).
  if (accounts[`sub:${payload.sub}`]) return accounts[`sub:${payload.sub}`];
  const email = payload.email?.toLowerCase();
  if (!email || (!email.endsWith('@gmail.com') && !payload.hd)) return null;
  return accounts[email] || null;
}

export function registerGoogleSso(app, { findUser, createSession, env = process.env, clientFactory = config => new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri) }) {
  const pending = new Map();
  const cookieName = env.HAN_DEMO === '1' ? 'han_demo_google_state' : 'han_google_state';
  const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google' };
  app.get('/api/auth/google/config', (_req, res) => res.json({ enabled: !!googleConfig(env) }));
  app.get('/api/auth/google/start', (_req, res) => {
    const config = googleConfig(env);
    if (!config) return res.status(503).json({ error: 'Google sign-in requires administrator configuration.' });
    for (const [key, value] of pending) if (value.expires < Date.now()) pending.delete(key);
    if (pending.size >= 1000) return res.status(429).json({ error: 'Please try signing in again shortly.' });
    const state = randomBytes(32).toString('hex');
    const nonce = randomBytes(32).toString('hex');
    const verifier = randomBytes(32).toString('base64url');
    pending.set(state, { nonce, verifier, expires: Date.now() + 600000 });
    res.cookie(cookieName, state, { ...cookieOptions, maxAge: 600000 });
    res.redirect(clientFactory(config).generateAuthUrl({ scope: ['openid', 'email'], response_type: 'code', state, nonce, prompt: 'select_account', code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }));
  });
  app.get('/api/auth/google/callback', async (req, res) => {
    const config = googleConfig(env);
    if (!config) return res.status(503).json({ error: 'Google sign-in requires administrator configuration.' });
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const attempt = cookie === state && pending.get(state);
    res.clearCookie(cookieName, cookieOptions);
    const finish = error => {
      const destination = new URL(config.appUrl);
      if (error) destination.searchParams.set('sso_error', error);
      return res.redirect(303, destination.href);
    };
    if (!attempt || attempt.expires < Date.now()) return finish('expired');
    pending.delete(state);
    if (req.query.error) return finish('cancelled');
    if (typeof req.query.code !== 'string' || req.query.code.length > 4096) return finish('failed');
    try {
      const client = clientFactory(config);
      const { tokens } = await client.getToken({ code: req.query.code, codeVerifier: attempt.verifier, redirect_uri: config.redirectUri });
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const payload = ticket.getPayload();
      if (payload?.nonce !== attempt.nonce) return finish('failed');
      const id = mappedGoogleUser(payload, config.accounts);
      const user = id && findUser(id);
      if (!user) return finish('unapproved');
      createSession(user, res);
      return finish();
    } catch { return finish('failed'); }
  });
}
