---
name: testing
description: >-
  Add or fix Jest tests for the CloudFront viewer-request handler.
---

# Testing

Read `docs/TESTING.md`.

- Prefer behavior tests of `handler` responses
- Mock `jose` (`jwtVerify`, `createRemoteJWKSet`)
- Keep ≥80% coverage
- Commands: `make test`, `npm run test:watch`
