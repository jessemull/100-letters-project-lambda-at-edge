# PR Review Framework

> **Precedence:** CONTEXT.md > GOVERNANCE.md > ARCHITECTURE.md > **REVIEW.md**.
>
> **AI agents — read this file when:** reviewing a PR, writing review comments, or deciding merge blockers.

---

## Severity tiers

### MUST (blocking)

- Breaks Lambda@Edge constraints (bundle too large, wrong runtime assumptions, fail-open auth)
- Security issues (secrets in source, token logging, weakened JWT checks)
- Crash bugs / unhandled null on critical request paths
- Coverage threshold regressions or deleted tests without replacement
- Architecture violations (UI frameworks in edge bundle, wrong layering)
- Type-safety abuse (`any` sprawl without justification)
- Cookie / scope / admin-path contract breaks without coordinated client change

### SHOULD (significant)

- Missing tests for behavior changes
- Performance footguns (unnecessary work on every viewer request, bundle bloat)
- Silent `catch` that swallows auth errors without 403
- Drift between webpack DefinePlugin keys and CI secrets

### NICE TO HAVE (non-blocking)

- Naming polish
- Optional refactors of equivalent approaches
- Extra docs polish

---

## PR hygiene

- [ ] Focused change; Conventional Commits
- [ ] What / Why / Testing described
- [ ] `make preflight` contemplated / CI green
- [ ] No unrelated drive-by edits

---

## Domain checklists (internal — do not paste wholesale into review output)

### TypeScript / Lambda

- Strict types respected; handler export remains `index.handler`
- Node 24 / edge limits respected

### Auth / routing

- `/admin` still fail-closed
- Deep-link and canonical redirect behavior preserved or intentionally changed with tests

### Security

- No secrets; env/CI only; no token logging

### CI / craftsmanship fail signals

- Files ballooning without structure
- Disabled lint/hooks to “make it pass”
- Coverage weakened

---

## Agent review output

Skills `pr-review` and `repo-review` define the fixed section output shape. Use this file for severity definitions only; do not dump checklist tables into the user-facing review.
