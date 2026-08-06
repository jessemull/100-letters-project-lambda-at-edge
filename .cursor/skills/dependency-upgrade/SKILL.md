---
name: dependency-upgrade
description: >-
  Upgrade or add npm dependencies safely for the Lambda@Edge package.
---

# Dependency Upgrade

Read `docs/DEPENDENCIES.md`.

1. Justify the change (edge bundle impact if runtime)
2. Install / bump (caret ranges consistent with repo)
3. `make preflight`
4. `make security`
5. Update intentional holds table if needed
6. Note breaking changes in PR

Do not use `npm audit fix --force`.
