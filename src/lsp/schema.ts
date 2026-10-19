import { z } from "zod";

const airportCode = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter uppercase IATA airport code");

export const segmentSchema = z.strictObject({
  origin: airportCode,
  destination: airportCode,
  departureDate: z.iso.date(),
  marketingCarrier: z.string().regex(/^[A-Z0-9]{2}$/, "Use a two-character uppercase IATA carrier code"),
  eligibility: z.enum(["eligible", "ineligible", "unknown"]),
}).refine((segment) => segment.origin !== segment.destination, {
  message: "Origin and destination must differ",
  path: ["destination"],
});

export const estimateRequestSchema = z.strictObject({
  totalAirfareJpy: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  segments: z.array(segmentSchema).min(1).max(100),
});

export type FlightSegment = z.infer<typeof segmentSchema>;
export type EstimateRequest = z.infer<typeof estimateRequestSchema>;
