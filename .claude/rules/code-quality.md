# Code Quality

## Type safety

- `strict: true` is non-negotiable — never weaken it with individual overrides
- No `any` — use `unknown` and narrow with type guards instead
- No `@ts-ignore` or `@ts-expect-error` without a comment explaining why
- Avoid type assertions (`as X`) — prefer type guards and narrowing
- Use `readonly` for properties and arrays that shouldn't be mutated
- Use `as const` for literal types and fixed arrays
- Never use `object`, `Function`, or `{}` as types — be specific

## Functions

- Define explicit return types on exported/public functions
- Prefer arrow functions for callbacks, named functions for top-level declarations
- Use function overloads only when union return types lose type information
- Avoid optional parameters when a separate function signature is clearer

## Types & interfaces

- Prefer `interface` for object shapes, `type` for unions/intersections/mapped types
- Prefer discriminated unions over optional fields for variant types
- Use exhaustive `switch` with `never` checks on discriminated unions
- Avoid `enum` — use `as const` objects or string literal unions instead

## Variables & control flow

- Use `const` by default, `let` only when reassignment is needed, never `var`
- Prefer `undefined` over `null` unless an API requires `null`
- Use nullish coalescing (`??`) and optional chaining (`?.`) instead of manual checks
- Prefer `Map`/`Set` over plain objects for dynamic key collections

## Error handling

- Use discriminated union results (`{ ok: true, data } | { ok: false, error }`) for expected failures
- Only throw for truly exceptional/unexpected situations
- Validate at system boundaries (API input, env vars) — trust internal code

## Modules & imports

- Use named exports — avoid default exports
- Import types with `import type` to avoid runtime overhead
- Keep barrel files (`index.ts`) minimal — they hurt tree-shaking and create circular dependency risks

## Async

- Always handle promise rejections — no floating promises
- Use `Promise.all` for independent async operations, not sequential `await`
- Prefer `async/await` over `.then()` chains

## General style

- Prefer immutable operations (`map`, `filter`, `reduce`) over mutating loops
- Keep functions small and single-purpose — if it needs a comment block explaining sections, split it
- No magic numbers/strings — extract to named constants

## Keep code simple

- No premature abstractions — don't create util helpers, wrapper classes, or generic abstractions for things used only once. Three similar lines of code is better than a premature abstraction.
- No speculative features — don't add configurability, feature flags, or extension points "for later"
- No defensive error handling on internal code paths — only validate at system boundaries (API request input, external API responses). Trust internal functions.
- No unnecessary comments — don't add docstrings or comments to self-explanatory code. Only comment when the "why" isn't obvious from the code itself.

## Logging

- Log at service boundaries: request handling, external calls, auth failures
- Include structured context (user ID, request path, duration)
- Don't log inside tight loops or internal helper functions
- Use appropriate log levels: `error` for failures requiring attention, `warn` for recoverable issues, `info` for operational events
