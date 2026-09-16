import type { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createRealityMcpServer } from "./reality-mcp";

export async function handleRealityMcpRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const server = createRealityMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    void transport.close().catch(() => undefined);
    void server.close().catch(() => undefined);
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}