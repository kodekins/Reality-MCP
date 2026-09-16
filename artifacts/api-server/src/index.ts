import app from "./app";
import { logger } from "./lib/logger";
import { initializeRealityStateOnce } from "./lib/reality-state";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  const hydrated = await initializeRealityStateOnce();
  if (hydrated) logger.info("Loaded latest Reality state from Supabase");
} catch (error) {
  logger.warn(
    { err: error },
    "Could not load Reality state from Supabase; using demo state",
  );
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
