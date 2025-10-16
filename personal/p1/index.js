import fastify from "fastify";
import proxy from "@fastify/http-proxy";
import cors from "@fastify/cors";
import "dotenv/config";

const server = fastify({ logger: process.env.ENABLE_LOGGING === "true" });

server.register(cors, {
  origin: true, // ⚠️ restrict later to your frontend domain
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  maxAge: 86400,
});

const upstream = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!upstream) throw new Error("SUPABASE_URL not provided");
if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY not provided");

const paths = ["/rest/v1", "/auth/v1", "/realtime/v1", "/functions/v1", "/storage/v1"];

for (const path of paths) {
  server.register(proxy, {
    upstream,
    prefix: path,
    rewritePrefix: path,
    websocket: path === "/realtime/v1",
    replyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        return {
          ...headers,
          apikey: supabaseAnonKey,
          authorization: `Bearer ${supabaseAnonKey}`,
        };
      },
    },
  });
}

server
  .listen({ port: process.env.PORT || 3000, host: "0.0.0.0" })
  .then((val) => console.log("Running :", val));
