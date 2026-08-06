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

| Package       | Held at     | Latest blocked | Why                                                                          |
| ------------- | ----------- | -------------- | ---------------------------------------------------------------------------- |
| `typescript`  | `^5.9.3`    | 6.x / 7.x      | `@typescript-eslint` peers `typescript >=4.8.4 <6.1.0`                       |
| `lint-staged` | `^16.4.0`   | 17.x           | `lint-staged@17` requires Node `>=22.22.1`; CI and Lambda target Node **20** |
| `@types/node` | `^20.19.43` | 22+/26.x       | Align type defs with Lambda/CI Node **20** (`nodejs20.x`)                    |

ESLint **10.x** is intentional here (no `eslint-config-next`). Re-validate `@typescript-eslint` peers on each upgrade.

Do **not** run `npm audit fix --force`.

### Residual audit (post-upgrade)

`npm audit` reports **0** vulnerabilities after the latest supported major bump (re-check after future upgrades).

---

## Recent cleanup

- Removed unused runtime `axios` (handler uses `jose` only).
- Removed unused ESLint plugins (`import` / `node` / `promise`) that were not wired in `eslint.config.js`.
- Removed unused `webpack-merge`.

---

## Discouraged without product approval

- LLM provider SDKs in the edge bundle
- React / Next / UI kits
- Global state managers
- Unused HTTP clients

---

## Engines

- Develop and CI against **Node 20** to match `template.yaml` (`nodejs20.x`) and GitHub Actions `node-version: '20'`.
- `package.json` `engines.node` is `>=20 <23`.
