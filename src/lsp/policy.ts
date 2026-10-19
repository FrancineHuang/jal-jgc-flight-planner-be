import { z } from "zod";

// Every policy in this first release is demonstration data, never verified JAL rules.
const policySchema = z.strictObject({
  id: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  verificationStatus: z.literal("unverified"),
  usage: z.literal("demonstration_only"),
  lspPerEligibleDomesticSegment: z.number().int().nonnegative(),
  domesticAirports: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1),
}).refine((policy) => Number.isSafeInteger(policy.lspPerEligibleDomesticSegment * 100), {
  message: "Policy must produce safe integer totals for up to 100 segments",
});

export type LspPolicy = Readonly<Omit<z.infer<typeof policySchema>, "domesticAirports">> & {
  readonly domesticAirports: readonly string[];
};

export function createLspPolicy(config: z.input<typeof policySchema>): LspPolicy {
  const parsed = policySchema.parse(config);
  return Object.freeze({ ...parsed, domesticAirports: Object.freeze(parsed.domesticAirports) });
}

// This intentionally limited route scope is configurable; it is not a full airport registry.
export const demoLspPolicy = createLspPolicy({
  id: "jgc-domestic-demo",
  version: "1.0.0",
  verificationStatus: "unverified",
  usage: "demonstration_only",
  lspPerEligibleDomesticSegment: 5,
  domesticAirports: ["HND", "NRT", "OKA", "ITM", "KIX", "CTS", "FUK", "NGO"],
});

export const DEMO_WARNING =
  "Unverified demonstration data only. This estimate does not represent verified JAL LSP rules. Eligibility is supplied manually and is not verified.";
