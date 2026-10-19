import { Router } from "express";
import { estimateLsp } from "./engine.js";
import type { LspPolicy } from "./policy.js";
import { estimateRequestSchema } from "./schema.js";

export function createLspRouter(policy: LspPolicy): Router {
  const router = Router();

  router.post("/estimates", (req, res) => {
    if (!req.is("application/json")) {
      res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Use application/json" } });
      return;
    }

    const parsed = estimateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid LSP estimate request",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
      });
      return;
    }

    res.json(estimateLsp(parsed.data, policy));
  });

  return router;
}
