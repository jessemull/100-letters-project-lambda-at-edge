# Architecture

> **Precedence:** CONTEXT.md > GOVERNANCE.md > **ARCHITECTURE.md** > feature docs.
>
> **AI agents — read this file when:** adding modules, changing request flow, or placing new files.

---

## System shape

This repository is the **CloudFront Lambda@Edge viewer-request** function for the 100 Letters Project static site.

```
Browser
  │
  ▼
CloudFront (viewer-request) ──► auth-at-edge (this repo)
  │                                 │
  │                                 ├─ canonical host 301 (apex → www)
  │                                 ├─ URI normalize (+ .html / index.html)
  │                                 └─ /admin → Cognito JWT via JWKS (cookie)
  ▼
S3 origin (Next.js static export)
```

Sibling repos own the Next.js client, API, and API authorizer. This function only runs at the edge.

---

## Folder responsibilities

| Path                 | Responsibility                                         |
| -------------------- | ------------------------------------------------------ |
| `src/index.ts`       | Viewer-request handler (redirect, rewrite, JWT auth)   |
| `src/index.test.ts`  | Unit tests for handler behavior                        |
| `webpack.config.js`  | Bundle for Lambda; DefinePlugin for Cognito env        |
| `template.yaml`      | Lambda function + version (Node 24, 128MB, 5s timeout) |
| `cloudformation/`    | Supporting IAM role and artifact bucket stacks         |
| `scripts/`           | Local ops: bastion SSH, Cognito token, preflight       |
| `docs/`              | Governance documentation                               |
| `.github/workflows/` | PR quality gates + deploy / merge / rollback           |

---

## Request flow (handler)

1. If `Host` is `onehundredletters.com` → **301** to `www.onehundredletters.com` with normalized path.
2. Map `/` → `/index.html`.
3. Normalize URI (decode, lowercase, strip trailing slashes); if no extension, append `.html`.
4. If path is under `/admin`:
   - Require cookie `100_letters_cognito_access_token`
   - Verify JWT with Cognito JWKS (`jose`), issuer, `token_use === access`, scope includes `aws.cognito.signin.user.admin`
   - On failure → **403**; on success → forward request
5. Otherwise forward request to origin.

---

## Build / config flow

```
CI secrets / local .env
        │
        ▼
Webpack DefinePlugin ──► process.env.COGNITO_USER_POOL_ID (and CLIENT_ID)
        │
        ▼
dist/index.js ──zip──► S3 ──CloudFormation──► Lambda version
        │
        ▼
(Manual) Associate version with CloudFront viewer-request trigger
```

Lambda@Edge association is not fully automated by CloudFormation in this project — see `docs/RELEASES.md`.

---

## Dependency direction

- Handler may use `jose`, Node `path`, and AWS Lambda types.
- Tests mock `jose` and drive `handler` with CloudFront-shaped events.
- Scripts must not be imported into the edge bundle.

---

## Fail signals

- Growing Webpack bundle toward Lambda@Edge size limits
- Auth checks that fail open
- Cookie / scope / issuer changes without client coordination
- Runtime or handler name drift vs `template.yaml` (`index.handler`)
