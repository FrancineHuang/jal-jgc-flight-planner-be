import type { EstimateRequest } from "../src/lsp/schema.js";

export function demoRequest(): EstimateRequest {
  return {
    totalAirfareJpy: 35000,
    segments: [
      { origin: "HND", destination: "OKA", departureDate: "2026-11-01", marketingCarrier: "JL", eligibility: "eligible" },
      { origin: "OKA", destination: "HND", departureDate: "2026-11-03", marketingCarrier: "JL", eligibility: "eligible" },
    ],
  };
}
