import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { getCamera, getEvents, getOverview, getState } from "./lib/reality-state";

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

app.get("/mcp", (_req, res) => {
  res.json({
    name: "Reality MCP",
    version: "0.1.0",
    transport: "streamable-http",
    tools: [
      "get_current_state",
      "inspect_zone",
      "find_object",
      "count_objects",
      "search_events",
      "get_recent_changes",
      "get_camera_status",
    ],
  });
});

app.post("/mcp", (req, res) => {
  const request = req.body as { id?: string | number; method?: string; params?: Record<string, unknown> };
  const tool = String(request.params?.name ?? request.method ?? "");
  const args = (request.params?.arguments ?? request.params ?? {}) as Record<string, unknown>;
  let result: unknown;
  if (tool.includes("get_current_state") || tool.includes("inspect_zone")) result = getState();
  else if (tool.includes("get_camera_status")) result = getCamera();
  else if (tool.includes("search_events") || tool.includes("get_recent_changes")) result = getEvents({ query: typeof args.query === "string" ? args.query : undefined, limit: typeof args.limit === "number" ? args.limit : 25 });
  else if (tool.includes("find_object") || tool.includes("count_objects")) {
    const objectName = String(args.object_name ?? "").toLowerCase();
    result = getState().objects.filter((object) => object.name.includes(objectName));
  } else result = { error: "Unknown tool" };
  res.json({ jsonrpc: "2.0", id: request.id ?? null, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
});

export default app;
