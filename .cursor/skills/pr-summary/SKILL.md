---
name: pr-summary
description: >-
  Draft PR title and summary for Lambda@Edge from branch diff.
---

# PR Summary

```bash
git fetch origin main
git log --oneline origin/main..HEAD
git diff origin/main...HEAD --stat
```

Produce:

- Title (Conventional Commit style)
- Summary bullets (why)
- Test plan (`make preflight`, etc.)
- Risk notes (auth contract, edge bundle, deploy/CloudFront)
