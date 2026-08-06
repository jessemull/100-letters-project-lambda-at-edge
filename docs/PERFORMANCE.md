# Performance

> **AI agents — read this file when:** changing the Webpack bundle, handler hot path, or Lambda settings.

---

## Budgets & signals

- Lambda@Edge viewer-request packages must stay under the platform size limit (1MB unzipped). This project historically ships a Webpack bundle well under **50KB** — treat large dependency adds as a red flag.
- `template.yaml` uses **128 MB** memory and **5 s** timeout — do not raise without human review and a measured need.
- Viewer-request runs on many URLs; keep work per request minimal.

---

## Guidelines

- Prefer `jose` (already in tree) over heavier JWT stacks.
- Avoid adding runtime HTTP clients unless required on the hot path.
- Keep minification (`terser-webpack-plugin`) enabled for production bundles.
- Mock network in tests; do not hit Cognito JWKS from unit tests.

---

## Forbidden shortcuts

- Shipping debug builds / source maps into the edge zip without an explicit decision
- Disabling minify to “fix” a bug and leaving it that way
- Raising memory/timeout to paper over inefficient code without review
