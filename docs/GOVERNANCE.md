# Governance

> **Precedence:** CONTEXT.md > **GOVERNANCE.md** > ARCHITECTURE.md > feature docs > inline comments.
>
> **AI agents — read this file when:** making structural decisions, resolving conflicting guidance, determining what requires human review, or changing governance docs.

---

## Source-of-truth precedence

| Rank | Document          | Scope                         |
| ---- | ----------------- | ----------------------------- |
| 1    | `CONTEXT.md`      | Constraints and quality gates |
| 2    | `GOVERNANCE.md`   | Process and authority         |
| 3    | `ARCHITECTURE.md` | Structure and boundaries      |
| 4    | Domain docs       | Error handling, performance   |
| 5    | Inline comments   | Local intent                  |

Resolve conflicts upward, never downward.

---

## Non-negotiable constraints

- Lambda@Edge viewer-request constraints (bundle size, Node 24 runtime, fail-closed `/admin` auth).
- TypeScript strict mode; ≥ 80% Jest coverage.
- Conventional Commits + Husky hooks must remain enabled.
- No hardcoded secrets; Cognito IDs only via build-time env / CI secrets.
- Cookie name and admin scope contract are shared with the client — do not change without coordination.

---

## Decision authority

### Autonomous (no extra human gate beyond normal PR)

- Bug fixes that do not change auth cookie contracts or deploy topology
- Tests and documentation within existing files
- Lint/format fixes
- Internal refactors that preserve handler behavior and package size

### Requires human review

- Changes to governance docs (`CONTEXT.md`, `AGENTS.md`, `docs/*`)
- New third-party dependencies (especially auth/crypto/network)
- CI/CD or CloudFormation changes
- Security-sensitive code (JWT verification, cookie parsing, redirects)
- Changing admin path, cookie name, required Cognito scope, or host redirect rules
- Removing tests or lowering coverage thresholds
- Runtime upgrades (`nodejs24.x` → newer) or memory/timeout changes

### Requires explicit product decision

- New edge behaviors beyond auth / deep-link / canonical redirect
- Embedding LLM or heavy SDKs in the edge bundle
- Changing which routes are protected

---

## Governance doc change process

1. Open a PR with `[governance]` in the title.
2. Explain why, prior guidance, and impact.
3. One human reviewer with write access (two if changing this file).
4. Cascade updates to lower-ranked docs in the same or linked PR.

---

## Review policy

- Use severity tiers in `docs/REVIEW.md` (MUST / SHOULD / NICE).
- MUST items block merge.
- Agents using `.cursor/skills/pr-review` or `repo-review` must follow that output shape.
