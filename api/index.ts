import express from "express";
import app from "../artifacts/api-server/src/app";

// Vercel treats files under /api as functions. The public URL is rewritten to
// this single adapter while the application and all business logic stay in the
// shared Express app.
const vercelApp = express();

vercelApp.use((req, _res, next) => {
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
