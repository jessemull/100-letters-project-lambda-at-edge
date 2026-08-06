# CI / CD

> **AI agents — read this file when:** changing workflows, interpreting CI failures, or documenting deploy gates.

---

## Workflows

| Workflow                             | Trigger                          | Role                                                            |
| ------------------------------------ | -------------------------------- | --------------------------------------------------------------- |
| `.github/workflows/pull-request.yml` | PR → `main`                      | Build+package, lint, Jest (+ coverage artifact)                 |
| `.github/workflows/merge.yml`        | Push / merge → `main`            | Quality gates → S3 upload → CloudFormation change set (**dev**) |
| `.github/workflows/deploy.yml`       | `workflow_dispatch` (dev / prod) | Quality gates → S3 upload → CloudFormation change set           |
| `.github/workflows/rollback.yml`     | `workflow_dispatch`              | CloudFormation rollback to a prior S3 artifact key              |

Do **not** rewrite these lightly. Document changes in the PR and treat as human-review required (`docs/GOVERNANCE.md`).

### Quality jobs (PR)

| Job   | Blocking? | Notes                                                                     |
| ----- | --------- | ------------------------------------------------------------------------- |
| Build | Yes       | `npm run build` + `npm run package` with Cognito secrets for DefinePlugin |
| Lint  | Yes       | `npm run lint`                                                            |
| Test  | Yes       | Jest; coverage thresholds enforced by `jest.config.js` (≥80%)             |

PR workflow uses Node **20** (`actions/setup-node`).

### Deploy notes

- Deploy/merge build Cognito IDs from environment-specific GitHub secrets.
- Artifacts land in `100-letters-project-auth-at-edge-{env}` under `auth-at-edge/`.
- Region for Lambda@Edge artifacts / CFN is typically **us-east-1** (see workflows).
- Edge trigger association may still require a manual CloudFront step after the version exists.

---

## Local parity

```bash
make preflight   # lint + typecheck + test + build
make typecheck
make security    # npm audit
```

Husky: pre-commit runs lint-staged; commit-msg runs commitlint. Skip hooks only with explicit user request (`HUSKY=0` or `--no-verify`).

### Branch protection (manual)

Repo settings (not YAML): require PRs into `main` and status checks as configured by maintainers. Not owned by workflow files alone.
