---
name: debugging
description: >-
  Systematic debugging for Lambda@Edge auth, redirects, and URI rewrite issues.
---

# Debugging

1. Reproduce with a CloudFront-shaped event in Jest (prefer a failing test)
2. Narrow: redirect vs rewrite vs `/admin` auth
3. Confirm Cognito pool ID used at **build** time (DefinePlugin), not only local shell env
4. Check cookie name and admin scope against the client contract
5. Fix minimally; run `make test` / `make preflight`
