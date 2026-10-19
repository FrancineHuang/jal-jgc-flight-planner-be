import { describe, expect, it } from "vitest";
import { estimateLsp } from "../src/lsp/engine.js";
import { createLspPolicy, demoLspPolicy } from "../src/lsp/policy.js";
import type { FlightSegment } from "../src/lsp/schema.js";
import { demoRequest } from "./fixtures.js";

describe("LSP policy engine", () => {
  it("calculates the round-trip demo and identifies its unverified policy", () => {
    const result = estimateLsp(demoRequest(), demoLspPolicy);

    expect(result.estimatedTotalLsp).toBe(10);
    expect(result.jpyPerLsp).toBe(3500);
    expect(result.policy).toMatchObject({
      id: "jgc-domestic-demo", version: "1.0.0", verificationStatus: "unverified", usage: "demonstration_only",
      lspPerEligibleDomesticSegment: 5,
    });
    expect(result.breakdown.map((segment) => segment.estimatedLsp)).toEqual([5, 5]);
    expect(result.warnings[0]).toContain("Unverified demonstration data only");
  });

  it.each<FlightSegment["eligibility"]>(["eligible", "ineligible", "unknown"])(
    "keeps totals unknown when an unknown segment is combined with %s",
    (eligibility) => {
      const request = demoRequest();
      request.segments[0]!.eligibility = "unknown";
      request.segments[1]!.eligibility = eligibility;
      const result = estimateLsp(request, demoLspPolicy);

      expect(result.estimatedTotalLsp).toBeNull();
      expect(result.jpyPerLsp).toBeNull();
      expect(result.breakdown[0]).toMatchObject({ estimatedLsp: null, reason: "eligibility_unknown" });
      expect(result.breakdown[1]?.estimatedLsp).toBe(eligibility === "eligible" ? 5 : eligibility === "ineligible" ? 0 : null);
    },
  );

  it("counts only eligible segments while using the total airfare for cost", () => {
    const request = demoRequest();
    request.segments[1]!.eligibility = "ineligible";
    const result = estimateLsp(request, demoLspPolicy);

    expect(result.estimatedTotalLsp).toBe(5);
    expect(result.jpyPerLsp).toBe(7000);
    expect(result.breakdown[1]).toMatchObject({ segmentIndex: 1, estimatedLsp: 0, reason: "ineligible" });
  });

  it("returns zero and no cost per LSP when all segments are ineligible", () => {
    const request = demoRequest();
    request.segments.forEach((segment) => { segment.eligibility = "ineligible"; });

    expect(estimateLsp(request, demoLspPolicy)).toMatchObject({ estimatedTotalLsp: 0, jpyPerLsp: null });
  });

  it("supports free airfare and unrounded fractional cost per LSP", () => {
    expect(estimateLsp({ ...demoRequest(), totalAirfareJpy: 0 }, demoLspPolicy).jpyPerLsp).toBe(0);
    expect(estimateLsp({ ...demoRequest(), totalAirfareJpy: 35001 }, demoLspPolicy).jpyPerLsp).toBe(3500.1);
  });

  it.each(["LAX", "ISG"])("does not assume an eligible route to %s is covered by the policy", (destination) => {
    const request = demoRequest();
    request.segments[0]!.destination = destination;

    expect(estimateLsp(request, demoLspPolicy)).toMatchObject({
      estimatedTotalLsp: null,
      jpyPerLsp: null,
      breakdown: [{ estimatedLsp: null, reason: "route_outside_policy_scope" }, { estimatedLsp: 5 }],
    });
  });

  it("returns zero for an explicitly ineligible route outside the policy scope", () => {
    const request = demoRequest();
    request.segments[0]!.destination = "LAX";
    request.segments[0]!.eligibility = "ineligible";

    expect(estimateLsp(request, demoLspPolicy).estimatedTotalLsp).toBe(5);
  });

  it("accepts versioned rate and airport configuration without changing the default or request", () => {
    const policy = createLspPolicy({
      ...demoLspPolicy,
      id: "custom-demo", version: "2.0.0", lspPerEligibleDomesticSegment: 7,
      domesticAirports: [...demoLspPolicy.domesticAirports, "ISG"],
    });
    const request = demoRequest();
    request.segments[0]!.destination = "ISG";
    const original = structuredClone(request);
    const result = estimateLsp(request, policy);

    expect(result).toMatchObject({ estimatedTotalLsp: 14, jpyPerLsp: 2500, policy: { id: "custom-demo", version: "2.0.0" } });
    expect(request).toEqual(original);
    expect(demoLspPolicy.lspPerEligibleDomesticSegment).toBe(5);
    expect(demoLspPolicy.domesticAirports).not.toContain("ISG");
    expect(Object.isFrozen(policy)).toBe(true);
    expect(Object.isFrozen(policy.domesticAirports)).toBe(true);
  });

  it("handles a configured zero-point policy", () => {
    const policy = createLspPolicy({ ...demoLspPolicy, domesticAirports: [...demoLspPolicy.domesticAirports], lspPerEligibleDomesticSegment: 0 });

    expect(estimateLsp(demoRequest(), policy)).toMatchObject({ estimatedTotalLsp: 0, jpyPerLsp: null });
  });

  it.each([-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER])("rejects an invalid policy rate %s", (rate) => {
    expect(() => createLspPolicy({ ...demoLspPolicy, domesticAirports: [...demoLspPolicy.domesticAirports], lspPerEligibleDomesticSegment: rate })).toThrow();
  });
});
