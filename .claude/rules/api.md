---
paths:
  - "src/routes/**/*.ts"
  - "src/services/**/*.ts"
  - "src/validations/**/*.ts"
---

# API Layer Rules

## Route design

- All routes must be typed end-to-end: request params, request body, and response shape
- Use Zod schemas in `src/validations/` for request validation
- Keep route handlers thin — extract business logic into service functions under `src/services/`
- Group related routes in their own file under `src/routes/`

## Response format

- Always use the `successResponse` and `errorResponse` helpers from `src/helpers/response.ts`
- Success responses: `{ success: true, data: T, meta?: PaginationMeta }`
- Error responses: `{ success: false, error: { code: string, message: string } }`
- Use appropriate HTTP status codes — don't return 200 for errors

## Validation

- Validate all request input (body, params, query) with Zod schemas before processing
- Validation schemas live in `src/validations/`, not inline in route handlers
- Return 400 with a descriptive error when validation fails
