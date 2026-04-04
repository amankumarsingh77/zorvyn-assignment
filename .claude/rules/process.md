# Process

## Testing and verification

- Write tests for business logic (services, middleware, auth flows)
- Don't claim work is done until `pnpm typecheck` passes with zero errors
- If adding a new dependency, verify it doesn't break the build
- Run the relevant tests before marking a task complete

## Commits

- Keep commits focused — one logical change per commit
- Write clear commit messages that explain the "why", not just the "what"
