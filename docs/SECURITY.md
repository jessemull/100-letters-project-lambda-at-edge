# Security

> **AI agents — read this file when:** handling env vars, JWT/cookies, Cognito, or dependencies.

---

## Secrets

- Never commit `.env*`, PEM keys, or AWS access keys.
- Local helpers (`npm run token`, `npm run bastion`) read Cognito/SSH values from `.env` — keep that file gitignored.
- CI secrets live in GitHub Actions (`COGNITO_USER_POOL_ID_*`, AWS keys, etc.); do not echo them in logs.

---

## Edge auth surface

- Admin protection relies on cookie `100_letters_cognito_access_token`.
- The Next.js client sets that cookie with **`encodeURIComponent`** (`js-cookie`); this function **`decodeURIComponent`s** the value before JWT verify.
- Verify with Cognito JWKS over HTTPS; require RS256, expected issuer, `token_use: access`, matching **`client_id`** (Cognito app client), and admin scope.
- Fail closed: missing/invalid token → 403. Do not forward `/admin` on verification errors.
- Do not log raw tokens or full cookie headers.

---

## Build-time injection

- Webpack `DefinePlugin` embeds `COGNITO_USER_POOL_ID` (and client id) at build time for the edge bundle.
- Treat those as environment-specific configuration — still do not hardcode production IDs in source.
- Assume the compiled JS is readable wherever the zip is stored; never embed passwords or private keys.

---

## Dependencies

- Run `make security` / `npm audit` when adding deps.
- Prefer well-maintained packages for JWT/crypto; justify new network/auth SDKs in the PR.
- Do not run `npm audit fix --force`.

---

## Scripts

- Bastion and token scripts are for trusted developers only; they hold credentials in env — never print secrets.
