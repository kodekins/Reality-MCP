import app from "../artifacts/api-server/src/app";

// Vercel discovers this root entrypoint and adapts the Express app to a
// serverless function. The standalone Node server remains in artifacts/.
export default app;
