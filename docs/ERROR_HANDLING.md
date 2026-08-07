# Error Handling

> **AI agents — read this file when:** changing auth failure paths, redirects, or JWT verification errors.

---

## Admin auth

- Missing cookie / missing token / verification failure / wrong `token_use` / wrong `client_id` / missing admin scope → return **403** with a short body. Do not forward the request.
- Cookie values are percent-encoded by the client; decode safely before verify (malformed encoding must not crash the viewer-request handler).
- Log verification failures with `console.error` using the error **message only** — never the raw JWT or full cookie header.
- Prefer fail-closed over fail-open on any uncertainty in the auth path.

---

## Redirects & rewrites

- Canonical host redirect uses **301** with a computed `Location`.
- URI normalization errors (unexpected decode failures) should be handled so CloudFront still gets a safe response; do not throw uncaught through the viewer-request handler when avoidable.

---

## Scripts

- Cognito token and bastion helpers should exit non-zero on missing env rather than continuing with empty credentials.
