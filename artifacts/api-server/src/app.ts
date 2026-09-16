import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleRealityMcpRequest } from "./lib/mcp-http";
import { realityMcpToolNames } from "./lib/reality-mcp";

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "reality-mcp" });
});

app.get("/mcp-info", (_req, res) => {
  res.json({
    name: "Reality",
    version: "0.2.0",
    transport: "streamable-http",
    endpoint: "/mcp",
    authentication: "none",
    data_source: "Supabase via Replit connector",
    tools: realityMcpToolNames,
  });
});

app.all("/mcp", (req, res, next) => {
  void handleRealityMcpRequest(req, res).catch(next);
});

export default app;
