import express from "express";
import app from "../artifacts/api-server/src/app";

// Keep a direct Express import in this supported root entrypoint so Vercel's
// zero-config Express detector creates the serverless function. The full app
// remains shared with the standalone Node server in artifacts/.
const vercelApp = express();
vercelApp.use(app);

export default vercelApp;
