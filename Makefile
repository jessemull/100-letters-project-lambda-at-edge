# 100 Letters Project Lambda@Edge — developer commands.
# Run `make` or `make help` for targets.

.DEFAULT_GOAL := help

.PHONY: help lint lint-fix format typecheck test test-coverage build package preflight security

help: ## Help@show targets
	@printf '100 Letters Project Lambda@Edge — make <target>\n\n'
	@grep -E '^[a-zA-Z0-9_-]+:.* ## ' Makefile \
		| grep -v '^help:' \
		| awk 'BEGIN {FS = ":.* ## "} \
		{ split($$2, p, "@"); \
		  if (p[1] != g) { if (g != "") print ""; printf "%s\n", p[1]; g = p[1] } \
		  printf "  %-20s %s\n", $$1, p[2] }'

# ── Quality ────────────────────────────────────────────────────────

lint: ## Quality@ESLint with --fix
	npm run lint

lint-fix: lint ## Quality@alias for lint (auto-fix)

format: ## Quality@Prettier write
	npm run format

typecheck: ## Quality@tsc --noEmit
	npm run typecheck

test: ## Quality@Jest with coverage
	npm test

test-coverage: test ## Quality@alias for test

build: ## Quality@Webpack Lambda bundle
	npm run build

package: ## Quality@Zip dist/ for Lambda upload
	npm run package

preflight: ## Quality@lint + typecheck + test + build
	./scripts/preflight.sh

security: ## Quality@npm audit
	npm audit --audit-level=high || npm audit
