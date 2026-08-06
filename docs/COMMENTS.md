# Comments

> **AI agents — read this file when:** writing or reviewing comments.

---

## Philosophy

Comments are maintenance cost. Prefer clear names, types, structure, and tests. Comments explain **why**, not **what**.

---

## Decision tree

1. Can a rename/extract/type make the comment unnecessary? Do that instead.
2. If intent, constraint, or trade-off is invisible in code — add a short comment.
3. Delete comments that restate the next line of code.

---

## Spacing (mechanical)

### Standalone comments in TS/JS

- Empty line **above and below** a standalone comment.
- Exception: first line of a block — empty line **below** only.
- Exception: last line of a block — empty line **above** only.

### JSDoc

- Place directly above the declaration (no blank line between JSDoc and export).

### Trailing / “ellipsis” style

Existing codebase sometimes uses `// ...` section trailers — acceptable for section breaks; do not sprinkle noise.

---

## Forbidden

- Commented-out code committed long-term (delete or restore)
- TODOs without context or owner/ticket when they block quality
- Comments that contradict the code
