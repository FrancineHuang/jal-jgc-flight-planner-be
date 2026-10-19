import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import { createLspRouter } from "./lsp/routes.js";
import { demoLspPolicy } from "./lsp/policy.js";
import type { LspPolicy } from "./lsp/policy.js";

interface AppOptions {
  policy?: LspPolicy;
  frontendOrigin?: string;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.use(cors({ origin: options.frontendOrigin ?? process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "JGC Flight Planner API" });
  });

  app.use("/api/v1/lsp", createLspRouter(options.policy ?? demoLspPolicy));

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const type = typeof error === "object" && error !== null && "type" in error ? error.type : undefined;
    if (type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } });
      return;
    }
    if (type === "entity.too.large") {
      res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds 100kb" } });
      return;
    }
    console.error(error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
  };
  app.use(handleError);

  return app;
}
