# JGC Flight Planner API

Express 5 + TypeScript backend. This release uses **unverified demonstration data only**:
5 demo LSP per manually eligible domestic segment. It does not implement verified JAL
rules, verify eligibility, or obtain fares from an external service.

## Run and verify

```sh
npm ci
npm run dev
# Production: npm run build && npm start

npm run typecheck
npm run build
npm test
```

The server defaults to port `4000` (`PORT` overrides it). CORS defaults to
`http://localhost:3000` (`FRONTEND_ORIGIN` overrides it).
`GET /api/health` retains its existing response:

```json
{ "status": "ok", "service": "JGC Flight Planner API" }
```

## Estimate demo LSP

`POST /api/v1/lsp/estimates`, with `Content-Type: application/json`:

```sh
curl -X POST http://localhost:4000/api/v1/lsp/estimates \
  -H 'Content-Type: application/json' \
  -d '{
    "totalAirfareJpy": 35000,
    "segments": [
      { "origin": "HND", "destination": "OKA", "departureDate": "2026-11-01", "marketingCarrier": "JL", "eligibility": "eligible" },
      { "origin": "OKA", "destination": "HND", "departureDate": "2026-11-03", "marketingCarrier": "JL", "eligibility": "eligible" }
    ]
  }'
```

The response is HTTP 200:

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

### Input contract

- `totalAirfareJpy`: nonnegative integer JPY, at most `Number.MAX_SAFE_INTEGER`.
- `segments`: 1–100 segments. Body size limit: 100kb.
- Each segment requires all five fields shown above. Airport codes must be three
  uppercase letters; origin and destination must differ. Carrier codes must be two
  uppercase letters/digits. Dates must be actual calendar dates in `YYYY-MM-DD` format.
- `eligibility` is `eligible`, `ineligible`, or `unknown`, supplied manually by the caller.
- Extra fields are rejected. Codes are checked for format, not against a real-world registry.
  Dates and carriers are retained in the breakdown; this demo has no date or carrier-specific rules.

### Calculation behavior

| Segment condition | Segment LSP | Reason |
| --- | --- | --- |
| Eligible, both airports in policy scope | 5 by default | `eligible_domestic_demo` |
| Ineligible | 0 | `ineligible` |
| Unknown eligibility | `null` | `eligibility_unknown` |
| Eligible, either airport outside policy scope | `null` | `route_outside_policy_scope` |

If any segment has a null estimate, **both `estimatedTotalLsp` and `jpyPerLsp` are null**;
known segment estimates remain visible in the breakdown. A route outside this limited
airport list is unsupported, rather than assumed to be international or worth zero.
All-ineligible itineraries return 0 total LSP and null JPY/LSP. Free airfare is accepted;
its JPY/LSP is 0 when total LSP is positive. Cost is the full airfare divided by total LSP,
without display rounding. Segment indexes are zero-based and preserve request order.

### Policy configuration

`src/lsp/policy.ts` defines the default policy and a validating `createLspPolicy` factory.
To change the rate or supported airport list, create a policy with a distinct ID/version
and inject it with `createApp({ policy })`. Configuration is validated and frozen.
These policies are restricted to `unverified` / `demonstration_only` in this release;
changing the rate does not make a policy verified. Bump the policy version whenever its
rules or supported airports change so a returned estimate remains traceable.

`src/lsp/engine.ts` is a pure function, independent of Express and server startup.
`src/app.ts` constructs the app without listening; `src/index.ts` loads environment
variables and starts the server. Tests exercise the engine and HTTP API separately.

### Errors

Errors are JSON objects with `error.code` and `error.message`:

- HTTP 400 `VALIDATION_ERROR`: invalid request fields; `error.issues` contains field paths
  (for example `["segments", 0, "departureDate"]`) and messages.
- HTTP 400 `INVALID_JSON`: malformed JSON body.
- HTTP 413 `PAYLOAD_TOO_LARGE`: body exceeds 100kb.
- HTTP 415 `UNSUPPORTED_MEDIA_TYPE`: send `application/json`.
- HTTP 500 `INTERNAL_ERROR`: unexpected server failure; internal details are not returned.
