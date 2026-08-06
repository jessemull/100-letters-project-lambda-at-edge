# Contributing

> **AI agents — read this file when:** opening PRs, setting up a worktree, or explaining the contributor flow.

---

## Setup

```bash
npm install
make preflight
```

Hooks install via `npm prepare` (Husky). Use `npm run commit` for Commitizen prompts.

For local Cognito token or bastion access, create a gitignored `.env` (see README).

---

## Branching & commits

- Branch from `main`.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- Pre-commit runs lint-staged; commit-msg runs commitlint.

---

## Pull requests

1. Keep the change focused; describe What / Why / Testing.
2. Run `make preflight` before opening the PR.
3. Link issues if any.
4. Expect review per `docs/REVIEW.md`.

Governance-only PRs: prefix title with `[governance]`.

---

## Code style

- ESLint + Prettier (`make lint` / `make format`).
- Tests for behavior changes (`docs/TESTING.md`).
- Keep the edge bundle small (`docs/PERFORMANCE.md`).

---

## Where to read next

Start at `CONTEXT.md` → `AGENTS.md` → relevant `docs/*`.
