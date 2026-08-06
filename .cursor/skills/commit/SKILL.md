---
name: commit
description: >-
  Prepare Conventional Commits for the Lambda@Edge repo. Use when staging or committing.
---

# Commit

Read `CONTEXT.md`, `AGENTS.md`, `docs/GOVERNANCE.md`, `docs/TESTING.md` before committing.

## Safety

- Only commit when the user explicitly asks
- Never `--no-verify` unless explicitly requested
- Never force-push `main`
- Prefer atomic Conventional Commits (`feat|fix|refactor|docs|test|chore`)

## Steps

1. `git status` / `git diff` / `git log -5 --oneline`
2. Stage relevant files only (no secrets)
3. Commit via HEREDOC message; run hooks
4. `git status` after

Prefer `npm run commit` (Commitizen) when interactive is available; otherwise craft a conventional message.
