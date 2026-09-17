import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { URL } from "node:url";
import app from "../artifacts/api-server/src/app.js";

// Vercel treats files under /api as functions. The public URL is rewritten to
// this single adapter while the application and all business logic stay in the
// shared Express app.
const vercelApp = express();

vercelApp.use((req: Request, _res: Response, next: NextFunction) => {
  const url = new URL(req.url, "https://reality.local");
  const route = url.searchParams.get("route");
  if (route) {
    url.searchParams.delete("route");
    const query = url.searchParams.toString();
    req.url = `/${route}${query ? `?${query}` : ""}`;
  }
  next();
});

vercelApp.use(app);

export default vercelApp;
