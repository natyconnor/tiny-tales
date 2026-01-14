import express from "express";
import cors from "cors";
import handler from "./api/generate";
import * as dotenv from "dotenv";

// Load environment variables from .env.local or .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Convert Express request/response to Vercel format
app.post("/api/generate", async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/generate`);
  console.log(
    `🔑 GEMINI_API_KEY: ${
      process.env.GEMINI_API_KEY
        ? `${process.env.GEMINI_API_KEY.slice(0, 8)}...`
        : "NOT SET"
    }`
  );
  console.log(
    `🎨 POLLINATIONS_API_KEY: ${
      process.env.POLLINATIONS_API_KEY
        ? `${process.env.POLLINATIONS_API_KEY.slice(0, 8)}...`
        : "NOT SET"
    }`
  );
});
