# Finance Backend — Implementation Plan Index

Execute plans in the order listed below. Each phase builds on the previous one.
Verify each phase works before moving to the next.

## Execution Order

| Order | Phase | Spec | Plan | Status |
|---|---|---|---|---|
| 1 | Project Setup | [spec](../specs/phase-1-project-setup.md) | [plan](phase-1-project-setup.md) | Not Started |
| 2 | Auth & Middleware | [spec](../specs/phase-2-auth-middleware.md) | [plan](phase-2-auth-middleware.md) | Not Started |
| 3 | User Management | [spec](../specs/phase-3-user-management.md) | [plan](phase-3-user-management.md) | Not Started |
| 4 | Financial Records | [spec](../specs/phase-4-financial-records.md) | [plan](phase-4-financial-records.md) | Not Started |
| 5 | Dashboard & Analytics | [spec](../specs/phase-5-dashboard-analytics.md) | [plan](phase-5-dashboard-analytics.md) | Not Started |
| 6 | Seed Data & Tests | [spec](../specs/phase-6-seed-and-tests.md) | [plan](phase-6-seed-and-tests.md) | Not Started |
| 7 | Documentation & Cleanup | [spec](../specs/phase-7-documentation.md) | [plan](phase-7-documentation.md) | Not Started |

## Verification checkpoints

After each phase, verify:
- `npm run dev` still starts without errors
- Any new endpoints respond correctly (use curl or similar)
- No TypeScript compilation errors (`npx tsc --noEmit`)

## Reference

- Design spec: [../specs/2026-04-02-finance-backend-design.md](../specs/2026-04-02-finance-backend-design.md)
