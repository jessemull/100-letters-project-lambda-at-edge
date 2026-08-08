# Dependencies

> **AI agents — read this file when:** adding, removing, or upgrading npm packages.

---

## Principles

- Prefer packages already in the tree (`jose`, Webpack, Jest, ESLint/Prettier).
- New runtime dependencies need a clear problem statement in the PR — edge bundle size matters.
- Prefer official / widely used libraries for JWT and AWS tooling.
- Stay on the latest major/minor that the toolchain supports; document intentional holds below.

---

## Process

1. Check whether an existing dependency already solves the need.
2. Add with a caret range consistent with the repo.
3. Run `make preflight` (lint + typecheck + test + build).
4. Run `make security` / `npm audit` and note residual risk.
5. Document notable upgrades in the PR body.
6. Confirm the Webpack bundle remains well under Lambda@Edge size limits.

---

## Intentional version holds

| Package       | Held at    | Latest blocked | Why                                                                 |
| ------------- | ---------- | -------------- | ------------------------------------------------------------------- |
| `typescript`  | `^6.0.3`   | 6.1+ / 7.x     | `@typescript-eslint@8` peers `typescript >=4.8.4 <6.1.0` (6.0.x OK) |
| `@types/node` | `^24.13.3` | 26.x           | Align type defs with Lambda/CI Node **24** (`nodejs24.x`)           |

ESLint **10.x** is intentional here (no `eslint-config-next`). Re-validate `@typescript-eslint` peers on each upgrade.

Do **not** run `npm audit fix --force`.

### Residual audit (post-upgrade)

`npm audit` reports **0** vulnerabilities after the latest supported major bump (re-check after future upgrades).

Latest patch bumps applied 2026-08-08: `eslint@10.8.1`, `@aws-sdk/client-cognito-identity-provider@3.1106.0`. All other direct deps already at latest within the holds above (`typescript` capped by `@typescript-eslint@8` peer `<6.1.0`; `@types/node` capped to 24.x to match `nodejs24.x`).

---

## Recent cleanup

- Removed unused runtime `axios` (handler uses `jose` only).
- Removed unused ESLint plugins (`import` / `node` / `promise`) that were not wired in `eslint.config.js`.
- Removed unused `webpack-merge`.
- Migrated Lambda/CI from deprecated `nodejs20.x` to **`nodejs24.x`** (current Lambda@Edge-supported Node LTS).

---

## Discouraged without product approval

- LLM provider SDKs in the edge bundle
- React / Next / UI kits
- Global state managers
- Unused HTTP clients

---

## Engines

- Develop and CI against **Node 24** to match `template.yaml` (`nodejs24.x`) and GitHub Actions `node-version: '24'`.
- `package.json` `engines.node` is `>=24 <25`.
- Do **not** pin back to Node 20 or 22 — use the current Lambda@Edge-supported Node runtime.
