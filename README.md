# JGC Flight Planner · Backend

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

A flight planning backend for Japan Airlines (JAL) enthusiasts pursuing JGC membership through “shugyō” flights. It estimates Life Status Points (LSP) and cost per point, making it easier to compare routes, segment combinations, and airfare budgets.

## Background

For travelers working toward JAL Global Club (JGC) membership or continuing to accumulate LSP, planning a “shugyō” trip means weighing airfare, flight segments, and the cost of earning points.

JAL’s Life Status Program awards Life Status Points for qualifying flights and lifestyle services. Reaching the applicable point levels and meeting other requirements can provide access to benefits or eligibility for JGC membership. See [JAL’s official Life Status Program introduction](https://www.jal.co.jp/jp/ja/jmb/jmbapp/tips/23/index.html) for background.

This project focuses on one question: **Given a set of flight segments and a total airfare, how many LSP could the trip earn, and what would each point cost?** The backend validates inputs, applies calculation policies, and returns a breakdown through a consistent API for the frontend.

The project is currently a prototype with its first LSP estimate endpoint. **The rate of 5 LSP per eligible domestic segment is unverified demonstration data only; it does not represent an implementation or verification of official JAL rules.** Segment eligibility is supplied manually by the caller. The project does not verify actual earning eligibility and is not affiliated with JAL.

## Current features

- Accept a total airfare in JPY and flight segments to estimate total LSP and cost per point (JPY/LSP).
- Support three manually supplied eligibility statuses: `eligible`, `ineligible`, and `unknown`.
- Return a segment breakdown, policy identifier, version, and verification status.
- Keep calculation rules in a separate, configurable policy engine.
- Provide a health check, request validation, and JSON error responses.

Estimates currently use manually entered fares and segments. The project does not yet include a database, authentication, or external airfare services.

## Tech stack

| Technology | Purpose |
| --- | --- |
| Node.js + npm | Backend runtime and dependency management |
| TypeScript | Strict type checking with ESM / NodeNext modules |
| Express 5 | HTTP server and routing |
| Zod | Request and policy configuration validation |
| cors | Frontend cross-origin configuration |
| dotenv | Load local environment variables from `.env` |
| tsx | Run TypeScript and watch for changes during development |
| Vitest + Supertest | Policy engine unit tests and HTTP API tests |

See `package.json` and `package-lock.json` for dependency versions.

## Local setup

### 1. Prerequisites

Install Node.js (22.x or 24.x can be used) and its bundled npm. You can also use curl to call the API manually.

```sh
node --version
npm --version
```

You do not need a database, a JAL account, or a third-party API key to run the backend locally.

### 2. Install dependencies

After checking out the project, run the following from the parent directory of the backend:

```sh
cd jal-jgc-flight-planner-be
npm ci
```

If your terminal is already in the backend directory, run `npm ci` directly. It installs dependencies according to the lockfile.

### 3. Configure environment variables (optional)

Create a `.env` file in the backend root:

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Backend listening port |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed frontend origin for CORS, including protocol and port |

The server also starts with these defaults without a `.env` file. `.env` is included in `.gitignore`.

### 4. Start the development server

```sh
npm run dev
```

The default server address is `http://localhost:4000`. Development mode watches source files and restarts the server when they change.

Check the server from another terminal:

```sh
curl http://localhost:4000/api/health
```

Expected response:

```json
{ "status": "ok", "service": "JGC Flight Planner API" }
```

### 5. Build and run the compiled server

```sh
npm run build
npm start
```

Compiled files are written to `dist/`. Stop the development server before running `npm start`, or use a different `PORT` to avoid a port conflict.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Start the development server and watch for changes |
| `npm run typecheck` | Type-check source and test code |
| `npm run build` | Compile source files into `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Run all Vitest tests |

Before submitting changes, run:

```sh
npm run typecheck
npm run build
npm test
```

HTTP tests use local temporary ports through Supertest. You do not need to start the development server first.

## API usage

### Health check

`GET /api/health`

Returns the service status. See the startup example above.

### Estimate LSP

`POST /api/v1/lsp/estimates`

Send requests with `Content-Type: application/json`. This example covers Haneda → Naha → Haneda, a total airfare of ¥35,000, and two segments manually marked as eligible:

```sh
curl -i -X POST http://localhost:4000/api/v1/lsp/estimates \
  -H 'Content-Type: application/json' \
  -d '{
    "totalAirfareJpy": 35000,
    "segments": [
      { "origin": "HND", "destination": "OKA", "departureDate": "2026-11-01", "marketingCarrier": "JL", "eligibility": "eligible" },
      { "origin": "OKA", "destination": "HND", "departureDate": "2026-11-03", "marketingCarrier": "JL", "eligibility": "eligible" }
    ]
  }'
```

Expected HTTP 200 response: **10 demo LSP at ¥3,500/LSP**.

```json
{
  "totalAirfareJpy": 35000,
  "estimatedTotalLsp": 10,
  "jpyPerLsp": 3500,
  "breakdown": [
    {
      "origin": "HND", "destination": "OKA", "departureDate": "2026-11-01",
      "marketingCarrier": "JL", "eligibility": "eligible", "segmentIndex": 0,
      "estimatedLsp": 5, "reason": "eligible_domestic_demo"
    },
    {
      "origin": "OKA", "destination": "HND", "departureDate": "2026-11-03",
      "marketingCarrier": "JL", "eligibility": "eligible", "segmentIndex": 1,
      "estimatedLsp": 5, "reason": "eligible_domestic_demo"
    }
  ],
  "policy": {
    "id": "jgc-domestic-demo",
    "version": "1.0.0",
    "verificationStatus": "unverified",
    "usage": "demonstration_only",
    "lspPerEligibleDomesticSegment": 5,
    "domesticAirports": ["HND", "NRT", "OKA", "ITM", "KIX", "CTS", "FUK", "NGO"]
  },
  "warnings": [
    "Unverified demonstration data only. This estimate does not represent verified JAL LSP rules. Eligibility is supplied manually and is not verified."
  ]
}
```

#### Request fields

| Field | Requirements |
| --- | --- |
| `totalAirfareJpy` | Total airfare in JPY; a nonnegative integer no greater than `Number.MAX_SAFE_INTEGER` |
| `segments` | 1–100 segments, each containing all five fields below |
| `segments[].origin` | Three-letter uppercase IATA airport code, such as `HND` |
| `segments[].destination` | Three-letter uppercase IATA airport code; must differ from the origin |
| `segments[].departureDate` | Valid calendar date in `YYYY-MM-DD` format |
| `segments[].marketingCarrier` | Two-character uppercase alphanumeric IATA marketing carrier code, such as `JL` |
| `segments[].eligibility` | `eligible`, `ineligible`, or `unknown`, supplied manually by the caller |

The request body limit is 100kb, and extra fields are rejected. Airport and carrier codes are checked for format without consulting a real-world registry. Dates and carriers are retained in the breakdown; the demo policy has no date-specific or carrier-specific rules.

#### Calculation behavior

| Segment condition | Segment LSP | Breakdown reason |
| --- | --- | --- |
| `eligible`, with both airports in the policy scope | 5 by default | `eligible_domestic_demo` |
| `ineligible` | 0 | `ineligible` |
| `unknown` | `null` | `eligibility_unknown` |
| `eligible`, with either airport outside the policy scope | `null` | `route_outside_policy_scope` |

If any segment estimate is `null`, **both `estimatedTotalLsp` and `jpyPerLsp` are `null`**. Known segment results remain in the breakdown. The default airport list covers only the demo scope; airports outside it are not automatically classified as international or worth zero points.

When every segment is `ineligible`, total LSP is 0 and cost per point is `null`. Zero airfare is accepted. When total LSP is positive, cost per point is the full airfare divided by total LSP, without display rounding. `segmentIndex` starts at 0 and follows the request order.

#### Error responses

Errors are returned as JSON with `error.code` and `error.message`.

| HTTP status | Error code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid request fields; `error.issues` provides field paths and reasons |
| 400 | `INVALID_JSON` | The request body is not valid JSON |
| 413 | `PAYLOAD_TOO_LARGE` | The request body exceeds 100kb |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Use `application/json` |
| 500 | `INTERNAL_ERROR` | Unexpected server error; internal details are not returned to the client |

For manual checks, set either segment to `unknown`, set both to `ineligible`, or make the airfare negative to inspect unknown estimates, zero-point results, and validation failures.

## Project structure

```text
src/
  index.ts                 # Load environment variables and start the server
  app.ts                   # Create the Express app, routes, and error middleware
  lsp/
    schema.ts              # Request validation and types
    policy.ts              # Demo policy configuration, versioning, and validation
    engine.ts              # Independent LSP calculation function
    routes.ts              # LSP API routes
tests/
  fixtures.ts              # Shared demo request
  lsp-engine.test.ts        # Policy engine tests
  lsp-api.test.ts           # HTTP API and health check tests
tsconfig.json              # Source compilation configuration
tsconfig.test.json         # Type-check configuration including tests
```

`app.ts` does not listen on a port, so tests can create the app directly. `index.ts` starts the server.

## Policy configuration and versioning

The default policy is defined in `src/lsp/policy.ts`. Create a policy with `createLspPolicy` and inject it using `createApp({ policy })` to configure points per segment and supported airports. The factory validates and freezes the configuration. Calculation logic lives separately in `src/lsp/engine.ts`.

Update the policy version when changing rules or supported airports. Use a distinct ID for a different policy so returned estimates can be traced to their configuration. All policies in this release are restricted to `unverified` / `demonstration_only`; changing the configuration does not make a policy a verified implementation of official rules.
