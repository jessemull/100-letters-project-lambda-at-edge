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

| Package      | Held at | Latest blocked | Why                                                               |
| ------------ | ------- | -------------- | ----------------------------------------------------------------- |
| `typescript` | `^5.x`  | 6.x / 7.x      | `@typescript-eslint` peers `typescript >=4.8.4 <6.1.0` (re-check) |

Re-validate peers on each upgrade pass. Unlike the Next.js client sibling, this repo does **not** use `eslint-config-next`, so ESLint 10 may be acceptable when `@typescript-eslint` peers allow it.

Do **not** run `npm audit fix --force`.

---

## Discouraged without product approval

- LLM provider SDKs in the edge bundle
- React / Next / UI kits
- Global state managers
- Unused HTTP clients (prefer removing dead runtime deps)

---

## Engines

- Develop and CI against **Node 20** to match `template.yaml` (`nodejs20.x`) and GitHub Actions `node-version: '20'`.
- `package.json` `engines.node` should stay aligned with that runtime.
