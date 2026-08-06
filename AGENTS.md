# AGENTS.md — 100 Letters Project Lambda@Edge

> Complete development rules and constraints for AI agents and human contributors.
> This file is the authoritative reference for coding standards. Precedence: see `CONTEXT.md`.

---

## Repository Overview

| Field                 | Value                                                                          |
| --------------------- | ------------------------------------------------------------------------------ |
| **Project**           | 100 Letters Project Lambda@Edge (`auth-at-edge`)                               |
| **Architecture**      | Single CloudFront viewer-request handler                                       |
| **Platform**          | AWS Lambda@Edge (Node.js 24)                                                   |
| **Core Technologies** | TypeScript, Webpack, Jose, Jest, ESLint, Prettier                              |
| **CI/CD**             | GitHub Actions → S3 artifact + CloudFormation (edge association partly manual) |
| **Git Hooks**         | Husky + lint-staged + Conventional Commits (commitlint)                        |

### Layout

```
100-letters-project-lambda-at-edge/
├── src/
│   ├── index.ts             # CloudFront viewer-request handler
│   └── index.test.ts        # Jest unit tests
├── scripts/                 # bastion SSH, Cognito token helper, preflight
├── cloudformation/          # IAM role + S3 bucket stacks
├── template.yaml            # Lambda function + version stack
├── docs/                    # Governance documentation
├── .cursor/                 # Rules, skills, commands
├── .github/workflows/       # PR, merge, deploy, rollback
├── webpack.config.js
├── CONTEXT.md
├── AGENTS.md                # This file
└── Makefile
```

### Path aliases

This package does **not** use path aliases. Prefer relative imports within `src/`.

---

## Development Commands

Prefer **`make`** targets (see `make help`). Equivalents use npm.

### Setup

| Command           | Description          |
| ----------------- | -------------------- |
| `npm install`     | Install dependencies |
| `npm run prepare` | Install Husky hooks  |

### Quality

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `make lint`      | ESLint with `--fix`             |
| `make typecheck` | `tsc --noEmit`                  |
| `make format`    | Prettier write                  |
| `make test`      | Jest with coverage (≥80%)       |
| `make build`     | Webpack bundle → `dist/`        |
| `make package`   | Zip `dist/` for Lambda upload   |
| `make preflight` | lint + typecheck + test + build |
| `make security`  | `npm audit`                     |

### Local helpers

| Command           | Description                           |
| ----------------- | ------------------------------------- |
| `npm run token`   | Cognito access token (needs `.env`)   |
| `npm run bastion` | SSH to bastion host (needs `.env`)    |
| `npm run commit`  | Commitizen conventional commit prompt |

---

## Language & Framework Rules

### TypeScript

- Keep `strict: true`.
- Prefer explicit types on exported APIs; avoid `any`.
- Use `@types/aws-lambda` types for CloudFront events/results.

### Handler behavior

- Keep the viewer-request path fast and deterministic.
- Admin auth: require Cognito **access** token in cookie `100_letters_cognito_access_token`, verify via JWKS, require scope `aws.cognito.signin.user.admin`.
- Fail closed on `/admin` (403) when cookie/token/scope/JWKS verification fails.
- Preserve deep-link rewrite (extensionless → `.html`) and canonical host redirect (`onehundredletters.com` → `www.onehundredletters.com`).

### Comments

Follow `docs/COMMENTS.md`. Prefer self-documenting names; comments explain **why**.

---

## Architecture Rules

### Layers

```
CloudFront event → handler (uri normalize / redirect / auth) → request or 403 response
```

- Keep auth verification and URI normalization in `src/index.ts` unless a clear module split is approved.
- Do not add a web UI, Next.js app, or regional API gateway code to this repo.
- Scripts under `scripts/` are local/ops only — they are not part of the edge bundle.

### Webpack / bundle

- Entry remains `src/index.ts`; output `dist/index.js` with `libraryTarget: commonjs2`.
- Keep Node built-ins externalized as today; do not bloat the edge package.
- Cognito config is compile-time via `DefinePlugin` — changing secret names requires CI + webpack alignment.

---

## Forbidden Patterns

- Hardcoding Cognito pool IDs, client secrets, passwords, or AWS keys in source
- Lowering Jest coverage thresholds or deleting tests to pass CI
- Weakening TypeScript `strict`
- Adding heavy frameworks (Next, React, Redux, LLM SDKs) without an explicit product decision
- `npm audit fix --force`
- Committing `.env`, private keys, or packaged secrets
- Skipping Husky / commitlint unless the user explicitly requests it

---

## When stuck

1. Re-read `CONTEXT.md` precedence and non-negotiables.
2. Check `docs/ARCHITECTURE.md` and the relevant domain doc.
3. Ask the human before changing deploy topology, CloudFront triggers, or auth cookie contracts.
