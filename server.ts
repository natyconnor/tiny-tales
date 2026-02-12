import express from "express";
import cors from "cors";
import generateHandler from "./api/generate";
import modelsHandler from "./api/models";
import * as dotenv from "dotenv";

// Load environment variables from .env.local or .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const app = express();
const PORT = process.env.API_PORT || 3001;
type VercelHandler = (
  req: Parameters<typeof generateHandler>[0],
  res: Parameters<typeof generateHandler>[1]
) => Promise<void> | void;

// Middleware
app.use(cors());
app.use(express.json());

// Convert Express request/response to Vercel format
const runVercelHandler = async (
  req: express.Request,
  res: express.Response,
  handler: VercelHandler
) => {
  // Create a Vercel-compatible request object
  const vercelReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: (req.query || {}) as Record<string, string | string[]>,
    cookies: (req.cookies || {}) as Record<string, string>,
    body: req.body,
  } as Parameters<typeof handler>[0];

  // Create a Vercel-compatible response object
  let statusCode = 200;
  const vercelRes = {
    status: (code: number) => {
      statusCode = code;
      res.status(code);
      return vercelRes;
    },
    json: (body: unknown) => {
      if (!res.headersSent) {
        res.status(statusCode);
        res.json(body);
      }
    },
    // Add other methods that might be needed
    setHeader: (name: string, value: string | string[]) => {
      res.setHeader(name, value);
    },
    getHeader: (name: string) => {
      return res.getHeader(name);
    },
  } as Parameters<typeof handler>[1];

  try {
    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error("Error handling request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
};

app.post("/api/generate", async (req, res) => {
  await runVercelHandler(req, res, generateHandler);
});

app.get("/api/models", async (req, res) => {
  await runVercelHandler(req, res, modelsHandler);
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/generate`);
  console.log(`🧠 Model endpoint: http://localhost:${PORT}/api/models`);
  console.log(
    `🎨 POLLINATIONS_API_KEY: ${
      process.env.POLLINATIONS_API_KEY
        ? `${process.env.POLLINATIONS_API_KEY.slice(0, 8)}...`
        : "NOT SET"
    }`
  );
});
