# Testing

> **AI agents — read this file when:** adding tests, changing coverage, or choosing what to test.

---

## Goals

Tests build **confidence** and catch regressions. Prefer behavior over implementation details.

---

## Stack

| Layer    | Tool                         |
| -------- | ---------------------------- |
| Unit     | Jest + ts-jest (Node env)    |
| Coverage | Jest `coverageThreshold` 80% |

Coverage: **`npm test`** (Jest `--coverage` via `jest.config.js`) must meet **≥ 80%** branches, functions, lines, and statements. CI fails if tests fail or coverage drops below the threshold.

There is no Cypress / Playwright / Lighthouse suite in this repo.

---

## What to test

- Canonical host redirect (apex → www) including path/query normalization
- Root and extensionless URI rewrite to `.html` / `index.html`
- `/admin` without cookie / without token → 403
- `/admin` with valid mocked JWT → request forwarded
- Invalid token use, missing admin scope, verification errors → 403
- Non-admin paths pass through without JWT work

## What not to overtest

- `jose` / JWKS network internals (mock `jwtVerify` / `createRemoteJWKSet`)
- Webpack / CloudFormation YAML behavior
- Third-party library correctness

---

## Conventions

- Colocate `*.test.ts` next to sources (`src/index.test.ts`).
- Mock `jose` at the suite level.
- Prefer asserting on status, body, `uri`, and redirect `Location` headers.
- Do not lower coverage thresholds or delete tests only to pass CI.

---

## Commands

```bash
make test          # or npm test
npm run test:watch
```
