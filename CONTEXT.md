# CONTEXT.md — 100 Letters Project Lambda@Edge

> **This is the PRIMARY entry point for ALL AI agents working in this repository.**
> Read this file first. Follow the mandatory reading order below before making any changes.

---

## Mandatory Reading Order

Every agent MUST read the following documents **in order** before making any change:

1. **`CONTEXT.md`** (this file) — loading order, source-of-truth precedence, non-negotiable constraints, quality gates
2. **`AGENTS.md`** — complete development rules, architecture constraints, coding standards, and forbidden patterns
3. **`docs/GOVERNANCE.md`** — contribution workflow, PR process, review policy, release process
4. **`docs/ARCHITECTURE.md`** — system design, folder structure, data flow
5. **`docs/TESTING.md`** — testing strategy, coverage requirements
6. **`docs/COMMENTS.md`** — comment policy and documentation standards
7. **`docs/SECURITY.md`** — security policy, secret management
8. **`docs/DEPENDENCIES.md`** — dependency management
9. **`docs/RELEASES.md`** — release and deploy process
10. **`docs/CI_CD.md`** — CI workflows and quality gates

Read items 5–10 on every task. Do not skip them because the work “seems unrelated”; agents cannot know upfront which rules will apply.

Domain docs to load when the task touches that area: `docs/ERROR_HANDLING.md`, `docs/PERFORMANCE.md`.

For PR or repo reviews, also read **`docs/REVIEW.md`**.

---

## Source-of-Truth Precedence

When instructions conflict, the **higher-ranked source wins**:

| Priority    | Source                               | Scope                                         |
| ----------- | ------------------------------------ | --------------------------------------------- |
| 1 (highest) | `CONTEXT.md`                         | Repository-wide constraints and quality gates |
| 2           | `docs/GOVERNANCE.md`                 | Contribution workflow and review policy       |
| 3           | `docs/ARCHITECTURE.md`               | System design and module boundaries           |
| 4           | Domain docs (`ERROR_HANDLING`, etc.) | Domain-specific rules                         |
| 5 (lowest)  | Inline code comments                 | Local implementation notes                    |

**Lower-precedence instructions MUST NOT contradict higher-precedence instructions.** If a conflict is detected, flag it for human review and follow the higher-precedence source.

---

## Non-Negotiable Constraints

These constraints apply to **every change**. No exceptions without explicit human approval.

### Platform & build

- **Lambda@Edge only** — viewer-request handler for CloudFront. Respect edge limits: package size (keep Webpack bundle small; Lambda@Edge limit is 1MB unzipped for viewer request), `Timeout` / `MemorySize` in `template.yaml`, and Node runtime pinned in CloudFormation (`nodejs24.x`).
- **Build-time config** — Cognito pool IDs are injected via Webpack `DefinePlugin` from CI/env at build time. Do not assume runtime Lambda environment variables at the edge the way regional Lambdas do.
- **No Node-native addons** in the edge bundle that break Webpack target `node` + CloudFront edge runtimes.

### Type safety & quality

- **TypeScript `strict: true`** — do not weaken compiler options.
- **No blanket `any`** — prefer typed `aws-lambda` / `jose` APIs; narrow assertions only when justified.
- **≥ 80% Jest coverage** — do not lower the threshold; do not delete tests to greenwash coverage.
- **Conventional Commits** — enforced by commitlint + Husky.

### Secrets & boundaries

- **No hardcoded secrets** — Cognito IDs, passwords, SSH keys, and AWS credentials come from env / GitHub Actions secrets only.
- **Do not commit `.env`** — already gitignored; never force-add it.
- Sibling repos (API, Next client, authorizer) are out of tree — do not copy their product docs or invent cross-repo coupling without a human decision.

---

## Quality Gates

Before considering work complete, agents MUST ensure:

| Gate                  | Command                                      |
| --------------------- | -------------------------------------------- |
| Lint (auto-fix)       | `make lint` or `npm run lint`                |
| Typecheck             | `make typecheck` or `npm run typecheck`      |
| Format                | `make format` or `npm run format`            |
| Unit tests + coverage | `make test` or `npm test`                    |
| Production build      | `make build` or `npm run build`              |
| Full preflight        | `make preflight` or `./scripts/preflight.sh` |

CI runs build, lint, and Jest (with coverage) on PRs — see `docs/CI_CD.md`.

---

## Repository Identity

| Field             | Value                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Project**       | 100 Letters Project — Lambda@Edge (`auth-at-edge`)                                      |
| **Stack**         | TypeScript, Webpack, Jose (JWT), Jest, ESLint 10 flat config                            |
| **Hosting**       | AWS Lambda@Edge on CloudFront (S3 static Next.js site origin)                           |
| **Role**          | Cognito access-token gate for `/admin`, HTML deep-link rewrite, canonical host redirect |
| **Sibling repos** | API, Next client, API authorizer (not in this tree)                                     |

---

## Cursor / agent tooling

- Rules: `.cursor/rules/`
- Skills: `.cursor/skills/`
- Commands: `.cursor/commands/`
- Human ops detail remains in `README.md`; agent rules live in this governance chain.
