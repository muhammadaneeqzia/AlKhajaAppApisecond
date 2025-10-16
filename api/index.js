import fastify from "fastify";
import proxy from "@fastify/http-proxy";
import cors from "@fastify/cors";
import "dotenv/config";

const server = fastify({ logger: process.env.ENABLE_LOGGING === "true" });

// ✅ Register CORS (no need to manually define OPTIONS route)
await server.register(cors, {
  origin: ["http://localhost:5173", "https://yourfrontenddomain.com"], // adjust domain
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "apikey"],
  credentials: true,
  maxAge: 86400,
});

// ✅ Root route for testing
server.get("/", async () => {
  return { message: "Fastify Supabase Proxy is running!" };
});

const upstream = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!upstream) throw new Error("SUPABASE_URL not provided");
if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY not provided");

const paths = ["/rest/v1", "/auth/v1", "/realtime/v1", "/functions/v1", "/storage/v1"];

for (const path of paths) {
  await server.register(proxy, {
    upstream,
    prefix: path,
    rewritePrefix: path,
    websocket: path === "/realtime/v1",
    replyOptions: {
      rewriteRequestHeaders: (req, headers) => ({
        ...headers,
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
      }),
      // ✅ Add CORS headers to proxied responses
      rewriteHeaders: (headers, req) => ({
        ...headers,
        "Access-Control-Allow-Origin": req.headers.origin || "*",
      }),
    },
  });
}

// ✅ Required by Vercel
export default async function handler(req, res) {
  await server.ready();
  server.server.emit("request", req, res);
}
