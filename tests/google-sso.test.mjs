import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { googleConfig, mappedGoogleUser, registerGoogleSso } from '../server/google-sso.mjs';

const env = { HAN_GOOGLE_CLIENT_ID: 'client', HAN_GOOGLE_CLIENT_SECRET: 'secret', HAN_GOOGLE_REDIRECT_URI: 'http://127.0.0.1:5174/api/auth/google/callback', HAN_APP_URL: 'http://127.0.0.1:5174/', HAN_GOOGLE_ACCOUNTS: '{"approved@gmail.com":"user-1"}' };
test('SSO requires complete configuration and trusted Google identity mapping', () => {
  assert.equal(googleConfig({}), null);
  assert.equal(googleConfig({ ...env, NODE_ENV: 'production' }), null);
  assert.ok(googleConfig(env));
  const accounts = googleConfig(env).accounts;
  assert.equal(mappedGoogleUser({ sub: '1', email: 'approved@gmail.com', email_verified: false }, accounts), null);
  assert.equal(mappedGoogleUser({ sub: '1', email: 'approved@gmail.com', email_verified: true }, accounts), 'user-1');
  assert.equal(mappedGoogleUser({ sub: '1', email: 'unapproved@gmail.com', email_verified: true }, accounts), null);
  assert.equal(mappedGoogleUser({ sub: '1', email: 'admin@example.com', email_verified: true }, { 'admin@example.com': 'user-1' }), null);
  assert.equal(mappedGoogleUser({ sub: '1', email_verified: true }, { 'sub:1': 'user-2' }), 'user-2');
});
test('OAuth binds browser state, verifies nonce, rejects replay and unapproved accounts', async () => {
  const app = express();
  let nonce, email = 'approved@gmail.com', badNonce = false, sessions = 0, exchanges = 0;
  registerGoogleSso(app, { env, findUser: id => ({ id }), createSession: () => sessions++, clientFactory: () => ({
    generateAuthUrl: options => { nonce = options.nonce; return `https://accounts.google.com/auth?${new URLSearchParams(options)}`; },
    getToken: async options => { assert.ok(options.codeVerifier); exchanges++; return { tokens: { id_token: 'mock' } }; },
    verifyIdToken: async () => ({ getPayload: () => ({ sub: '1', email, email_verified: true, nonce: badNonce ? 'wrong' : nonce }) }),
  }) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const start = async () => {
      const response = await fetch(`${origin}/api/auth/google/start`, { redirect: 'manual' });
      const url = new URL(response.headers.get('location'));
      assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
      return { state: url.searchParams.get('state'), cookie: response.headers.get('set-cookie').split(';')[0] };
    };
    const callback = async (attempt, cookie = attempt.cookie) => fetch(`${origin}/api/auth/google/callback?state=${attempt.state}&code=test`, { redirect: 'manual', headers: { Cookie: cookie } });
    const first = await start();
    assert.match((await callback(first, '')).headers.get('location'), /expired/);
    assert.equal(exchanges, 0);
    assert.equal((await callback(first)).headers.get('location'), env.HAN_APP_URL);
    assert.equal(sessions, 1);
    assert.match((await callback(first)).headers.get('location'), /expired/);
    email = 'stranger@gmail.com';
    assert.match((await callback(await start())).headers.get('location'), /unapproved/);
    email = 'approved@gmail.com'; badNonce = true;
    assert.match((await callback(await start())).headers.get('location'), /failed/);
    assert.equal(sessions, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
