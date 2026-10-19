import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createLspPolicy, demoLspPolicy } from "../src/lsp/policy.js";
import { demoRequest } from "./fixtures.js";

const app = createApp();
const endpoint = "/api/v1/lsp/estimates";
const segment = demoRequest().segments[0]!;

describe("POST /api/v1/lsp/estimates", () => {
  it("returns the HND–OKA–HND demo with full segment details and policy provenance", async () => {
    const input = demoRequest();
    const response = await request(app).post(endpoint).send(input).expect(200).expect("Content-Type", /json/);

    expect(response.body).toMatchObject({
      totalAirfareJpy: 35000, estimatedTotalLsp: 10, jpyPerLsp: 3500,
      policy: { id: "jgc-domestic-demo", version: "1.0.0", verificationStatus: "unverified", usage: "demonstration_only" },
      warnings: [expect.stringContaining("Unverified demonstration data only")],
    });
    expect(response.body.breakdown).toEqual(input.segments.map((item, segmentIndex) => ({
      ...item, segmentIndex, estimatedLsp: 5, reason: "eligible_domestic_demo",
    })));
  });

  it("returns null totals while retaining known segment points when eligibility is unknown", async () => {
    const input = demoRequest();
    input.segments[1]!.eligibility = "unknown";
    const { body } = await request(app).post(endpoint).send(input).expect(200);

    expect(body).toMatchObject({
      estimatedTotalLsp: null, jpyPerLsp: null,
      breakdown: [{ estimatedLsp: 5 }, { estimatedLsp: null, reason: "eligibility_unknown" }],
    });
  });

  it("returns zero LSP and a null cost for an all-ineligible itinerary", async () => {
    const input = demoRequest();
    input.segments.forEach((item) => { item.eligibility = "ineligible"; });
    const { body } = await request(app).post(endpoint).send(input).expect(200);

    expect(body).toMatchObject({ estimatedTotalLsp: 0, jpyPerLsp: null });
  });

  it("returns null totals for an eligible international route outside the domestic demo scope", async () => {
    const { body } = await request(app).post(endpoint).send({ totalAirfareJpy: 35000, segments: [{ ...segment, destination: "LAX" }] }).expect(200);

    expect(body).toMatchObject({ estimatedTotalLsp: null, jpyPerLsp: null, breakdown: [{ reason: "route_outside_policy_scope" }] });
  });

  it("uses an injected policy in the API", async () => {
    const policy = createLspPolicy({ ...demoLspPolicy, domesticAirports: [...demoLspPolicy.domesticAirports], version: "1.1.0", lspPerEligibleDomesticSegment: 10 });
    const { body } = await request(createApp({ policy })).post(endpoint).send(demoRequest()).expect(200);

    expect(body).toMatchObject({ estimatedTotalLsp: 20, jpyPerLsp: 1750, policy: { version: "1.1.0" } });
  });

  it.each([
    ["missing airfare", { segments: [segment] }],
    ["negative airfare", { totalAirfareJpy: -1, segments: [segment] }],
    ["fractional airfare", { totalAirfareJpy: 1.5, segments: [segment] }],
    ["string airfare", { totalAirfareJpy: "35000", segments: [segment] }],
    ["null airfare", { totalAirfareJpy: null, segments: [segment] }],
    ["unsafe airfare", { totalAirfareJpy: Number.MAX_SAFE_INTEGER + 1, segments: [segment] }],
    ["empty segments", { totalAirfareJpy: 35000, segments: [] }],
    ["missing segments", { totalAirfareJpy: 35000 }],
    ["too many segments", { totalAirfareJpy: 35000, segments: Array.from({ length: 101 }, () => segment) }],
    ["unexpected field", { ...demoRequest(), policy: "verified" }],
    ["array body", []],
  ])("rejects %s", async (_name, input) => {
    const { body } = await request(app).post(endpoint).send(input).expect(400);

    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.issues.length).toBeGreaterThan(0);
    expect(body).not.toHaveProperty("estimatedTotalLsp");
  });

  it.each([
    ["lowercase origin", { origin: "hnd" }],
    ["invalid destination", { destination: "TOKYO" }],
    ["same origin and destination", { destination: "HND" }],
    ["non-ISO date", { departureDate: "11/01/2026" }],
    ["impossible date", { departureDate: "2026-02-30" }],
    ["non-leap February 29", { departureDate: "2026-02-29" }],
    ["missing date", { departureDate: undefined }],
    ["invalid carrier", { marketingCarrier: "JAL" }],
    ["missing carrier", { marketingCarrier: undefined }],
    ["missing eligibility", { eligibility: undefined }],
    ["invalid eligibility", { eligibility: "yes" }],
    ["unexpected segment field", { points: 100 }],
  ])("rejects a segment with %s and identifies its position", async (_name, patch) => {
    const { body } = await request(app).post(endpoint).send({ totalAirfareJpy: 35000, segments: [{ ...segment, ...patch }] }).expect(400);

    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.issues[0].path.slice(0, 2)).toEqual(["segments", 0]);
  });

  it("accepts zero airfare and a real leap day", async () => {
    const { body } = await request(app).post(endpoint).send({ totalAirfareJpy: 0, segments: [{ ...segment, departureDate: "2028-02-29" }] }).expect(200);

    expect(body).toMatchObject({ estimatedTotalLsp: 5, jpyPerLsp: 0 });
  });

  it("reports malformed JSON as a JSON error", async () => {
    const { body } = await request(app).post(endpoint).type("json").send('{"totalAirfareJpy":').expect(400).expect("Content-Type", /json/);

    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("rejects an empty JSON body", async () => {
    const { body } = await request(app).post(endpoint).type("json").send("").expect(400);

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unsupported media types", async () => {
    const { body } = await request(app).post(endpoint).type("text").send(JSON.stringify(demoRequest())).expect(415);

    expect(body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("limits oversized payloads with a JSON response", async () => {
    const { body } = await request(app).post(endpoint).send({ extra: "x".repeat(110000) }).expect(413);

    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("existing app behavior", () => {
  it("preserves the health endpoint", async () => {
    const { body } = await request(app).get("/api/health").expect(200);

    expect(body).toEqual({ status: "ok", service: "JGC Flight Planner API" });
  });

  it("preserves configurable frontend CORS", async () => {
    await request(createApp({ frontendOrigin: "https://planner.example" }))
      .options(endpoint)
      .set("Origin", "https://planner.example")
      .set("Access-Control-Request-Method", "POST")
      .expect(204)
      .expect("Access-Control-Allow-Origin", "https://planner.example");
  });
});
