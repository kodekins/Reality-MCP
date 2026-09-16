import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleRealityMcpRequest } from "./lib/mcp-http";
import { realityMcpToolNames } from "./lib/reality-mcp";
import { initializeRealityStateOnce } from "./lib/reality-state";
import { getSupabaseMode } from "./lib/supabase-reality";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((_req, _res, next) => {
  void initializeRealityStateOnce()
    .then(() => next())
    .catch((error: unknown) => {
      logger.warn(
        { err: error },
        "Could not load Reality state from Supabase; using demo state",
      );
      next();
    });
});

app.use("/api", router);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "reality-mcp",
    supabase: getSupabaseMode(),
    vision: process.env.GEMINI_API_KEY ? "gemini" : "mock",
  });
});

app.get("/mcp-info", (_req, res) => {
  res.json({
    name: "Reality",
    version: "0.2.0",
    transport: "streamable-http",
    endpoint: "/mcp",
    authentication: "none",
    data_source: getSupabaseMode(),
    tools: realityMcpToolNames,
  });
});

app.all("/mcp", (req, res, next) => {
  void handleRealityMcpRequest(req, res).catch(next);
});

const webDist = path.resolve(
  process.env.WEB_DIST_DIR ??
    path.join(process.cwd(), "artifacts/reality/dist/public"),
);
if (process.env.VERCEL) {
  app.get("/{*path}", (_req, res) => res.redirect(307, "/index.html"));
} else if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(webDist, "index.html")),
  );
}

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err: error }, "Unhandled request error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default app;
