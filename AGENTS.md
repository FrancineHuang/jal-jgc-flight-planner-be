Read `AGENTS.md`, `package.json`, `tsconfig.json` and `src/index.ts` before making changes.

Implement the first LSP calculation API for JGC Flight Planner.

**Endpoint:** `POST /api/v1/lsp/estimates`

Use Express 5, TypeScript, Zod for request validation, and Vitest + Supertest for testing.

Requirements:

1. Accept a total airfare in JPY and an array of flight segments.
2. Each segment should contain origin, destination, departure date, marketing carrier, and eligibility status.
3. Support `eligible`, `ineligible`, and `unknown` eligibility statuses.
4. Implement a separate, configurable and versioned LSP policy engine.
5. Use 5 LSP per eligible domestic segment as **unverified demonstration data only**.
6. Return estimated total LSP, JPY per LSP, calculation breakdown, policy identifier and verification status.
7. Return `null` for total estimates when eligibility is unknown.
8. Handle invalid input and zero-point scenarios.
9. Preserve the existing `/api/health` endpoint.
10. Separate Express app initialization from server startup to support API testing.

Demo scenario: HND → OKA → HND, total airfare ¥35,000, two manually eligible segments. Expected result: 10 demo LSP and ¥3,500/LSP.

First propose the file structure and implementation plan. Then implement the API and tests.

Do not introduce Prisma, PostgreSQL, authentication, or external airfare APIs yet. Run type checks, build and tests, and report the results.