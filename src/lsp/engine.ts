import type { EstimateRequest, FlightSegment } from "./schema.js";
import { DEMO_WARNING } from "./policy.js";
import type { LspPolicy } from "./policy.js";

type SegmentReason = "eligible_domestic_demo" | "ineligible" | "eligibility_unknown" | "route_outside_policy_scope";

export interface SegmentEstimate extends FlightSegment {
  segmentIndex: number;
  estimatedLsp: number | null;
  reason: SegmentReason;
}

export interface LspEstimate {
  totalAirfareJpy: number;
  estimatedTotalLsp: number | null;
  jpyPerLsp: number | null;
  breakdown: SegmentEstimate[];
  policy: LspPolicy;
  warnings: string[];
}

// Pure calculation: no Express, environment variables, network calls, or carrier lookups.
export function estimateLsp(request: EstimateRequest, policy: LspPolicy): LspEstimate {
  const domesticAirports = new Set(policy.domesticAirports);
  const breakdown = request.segments.map((segment, segmentIndex): SegmentEstimate => {
    if (segment.eligibility === "unknown") {
      return { ...segment, segmentIndex, estimatedLsp: null, reason: "eligibility_unknown" };
    }
    if (segment.eligibility === "ineligible") {
      return { ...segment, segmentIndex, estimatedLsp: 0, reason: "ineligible" };
    }
    if (!domesticAirports.has(segment.origin) || !domesticAirports.has(segment.destination)) {
      return { ...segment, segmentIndex, estimatedLsp: null, reason: "route_outside_policy_scope" };
    }
    return {
      ...segment,
      segmentIndex,
      estimatedLsp: policy.lspPerEligibleDomesticSegment,
      reason: "eligible_domestic_demo",
    };
  });

  const estimatedTotalLsp = breakdown.some((segment) => segment.estimatedLsp === null)
    ? null
    : breakdown.reduce((total, segment) => total + (segment.estimatedLsp ?? 0), 0);

  return {
    totalAirfareJpy: request.totalAirfareJpy,
    estimatedTotalLsp,
    jpyPerLsp: estimatedTotalLsp !== null && estimatedTotalLsp > 0
      ? request.totalAirfareJpy / estimatedTotalLsp
      : null,
    breakdown,
    policy,
    warnings: [DEMO_WARNING],
  };
}
