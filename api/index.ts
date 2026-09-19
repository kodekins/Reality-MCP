import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import app from "../artifacts/api-server/src/app.js";

const handleRequest = app as unknown as (
  req: IncomingMessage,
  res: ServerResponse,
) => void;

// Vercel treats files under /api as functions. The public URL is rewritten to
// this single adapter while the application and all business logic stay in the
// shared Express app.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "https://reality.local");
  const route = url.searchParams.get("route");
  if (route) {
    url.searchParams.delete("route");
    const query = url.searchParams.toString();
    req.url = `/${route}${query ? `?${query}` : ""}`;
  }
  handleRequest(req, res);
}
