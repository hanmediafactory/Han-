# Google sign-in setup

HAN now supports Google's authorization-code flow with PKCE, browser-bound state, nonce verification and signed ID-token verification. It creates the same session as password login and preserves existing permissions. Only explicitly mapped, active HAN users can sign in; Google sign-in never creates an owner or a new account.

## Activate locally

1. In Google Cloud Console, configure Google Auth Platform branding/audience and create an OAuth client of type Web application. If the app is in testing, add the approved sign-in emails as test users.
2. Add this exact authorized redirect URI: http://127.0.0.1:5174/api/auth/google/callback
3. Put the following variables in a private backend environment file or your hosting provider's secret settings. Do not use VITE_ variables for secrets.

```dotenv
HAN_GOOGLE_CLIENT_ID=<Google OAuth client ID>
HAN_GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
HAN_GOOGLE_REDIRECT_URI=http://127.0.0.1:5174/api/auth/google/callback
HAN_APP_URL=http://127.0.0.1:5174/
HAN_GOOGLE_ACCOUNTS={"your-approved@gmail.com":"user-1"}
```

Replace the example email with the actual Google account. user-1 is Harsha's existing HAN identity. Add other approved accounts only with their correct existing HAN user IDs. Never infer email addresses from the login screen's displayed identity label. Stable Google subject IDs can instead be mapped as "sub:<Google subject>":"user-1". Email mapping accepts verified Gmail or Google Workspace accounts; third-party-domain personal Google accounts need subject mapping.

Launch the backend with the private file, for example `node --env-file=.env.google.local server/index.mjs`, after stopping the existing backend. The Vite frontend continues on port 5174. The file must stay outside Git (the repository ignores *.local files). No Google secrets have been supplied or created by this change.

For deployment, replace both local URLs with the actual HTTPS application URLs and register the matching callback in Google Cloud. HAN_GOOGLE_ACCOUNTS must be available on every backend instance. Pending OAuth attempts live in the initiating process for ten minutes; multiple backend instances require sticky routing or a shared state store. Restarting the backend expires pending attempts.

## Verification

Automated tests cover browser-state mismatch, replay, nonce mismatch, approved and unapproved account mapping, incomplete configuration and HTTPS requirements. The existing password/session tests remain passing. Real Google consent and sign-in require the client's credentials and approved Google account.

Sources: https://developers.google.com/identity/openid-connect/openid-connect and https://developers.google.com/identity/protocols/oauth2/web-server

Implementation checks completed: 2 SSO tests, 58 existing backend tests and 5 browser workflow tests passed. Production build and lint passed. The live local configuration endpoint reports disabled until credentials and account mappings are supplied.
