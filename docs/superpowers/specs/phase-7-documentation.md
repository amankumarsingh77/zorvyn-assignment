# Phase 7: Documentation & Cleanup — Spec

## Goal

Comprehensive README with setup instructions, API documentation, architecture overview, design decisions, assumptions, and tradeoffs. Final verification that everything works.

## Requirements

### R1: README structure

- `README.md` at project root
- Sections in order:
  1. Project title and one-line description
  2. Tech stack (bullet list)
  3. Quick start (prerequisites, setup steps, seeded users)
  4. API documentation (every endpoint with method, path, body, response)
  5. Access control matrix (table)
  6. Error response format
  7. Project structure (tree with descriptions)
  8. Scripts table
  9. Design decisions and tradeoffs (numbered, with reasoning)
  10. Assumptions
  11. Running tests

### R2: Quick start section

- Prerequisites: Node.js 18+, Podman + podman-compose, pnpm
- Step-by-step: clone, install, start postgres, copy env, migrate, seed, start
- Table of seeded user credentials (email, password, role)
- A new developer should have the project running in under 5 minutes

### R3: API documentation

- Every endpoint documented with: method, path, description, required role
- Request body shown as JSON for POST/PATCH endpoints
- Response body shown as JSON for key endpoints (register, login, summary, trends)
- Query params documented for list/filter endpoints
- Auth header format documented

### R4: Design decisions

Must cover:
- Why Hono over Express
- Why flat-by-layer over feature folders
- Why no controllers layer
- Why PostgreSQL over SQLite/MongoDB
- Why shared data model (not per-user)
- Why RESTRICT on user delete
- Why category as normalized string (not separate table)
- Why Decimal for amounts (not float)

### R5: .env.example completeness

- Contains all required env vars with placeholder values
- Comments explaining each variable are optional but welcome

### R6: Final verification

- `pnpm typecheck` passes with zero errors
- `pnpm test` passes all tests
- `pnpm dev` starts server
- Health endpoint responds
- Project is in clean git state

## Acceptance Criteria

1. README covers all sections listed above
2. Quick start instructions are correct and complete
3. Every API endpoint is documented
4. Access control matrix matches the implementation
5. Design decisions explain the "why" not just the "what"
6. `.env.example` has all required variables
7. `pnpm typecheck` passes
8. `pnpm test` passes
9. A person with no context can set up and run the project using only the README
