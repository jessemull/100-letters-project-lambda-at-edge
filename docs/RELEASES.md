# Releases

> **AI agents — read this file when:** shipping, deploying, or rolling back.

---

## Model

This function ships as a **Webpack-bundled Lambda zip** to S3, then CloudFormation updates the Lambda function/version.

1. Merge to `main` triggers the merge workflow (deploys **dev**).
2. Manual `deploy.yml` (`workflow_dispatch`) deploys to **dev** or **prod**.
3. `rollback.yml` restores a prior S3 artifact via CloudFormation change set.
4. **Associating a Lambda version with a CloudFront trigger is still partly manual** in the AWS console — CloudFormation alone does not fully automate edge association here.

---

## Versioning

- `package.json` version is informational; artifacts are named with version + commit + timestamp.
- Prefer Conventional Commit history as the changelog signal unless a human asks for a formal CHANGELOG entry.
- S3 keeps a pruned set of recent packages (pipeline retains latest five).

---

## Pre-release checklist

- [ ] `make preflight` green
- [ ] Cognito env/secrets correct for target environment
- [ ] Bundle size still appropriate for Lambda@Edge
- [ ] No secrets in source; build uses CI secrets for DefinePlugin
- [ ] After deploy: confirm CloudFront is on the intended Lambda version if association is manual

---

## Hotfix / rollback

Use GitHub Actions `rollback` workflow with a known S3 key rather than hand-editing Lambda code when possible. Coordinate with humans for production and CloudFront trigger updates.
