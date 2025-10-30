import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  const method = event.httpMethod || event.requestContext?.http?.method || "GET";
  const path = event.path || event.rawPath || "/";
  
  console.log("🔵 Netlify Function handler invoked", {
    method,
    path,
    rawPath: event.rawPath,
  });

  if (!cachedHandler) {
    try {
      console.log("📦 Initializing Express server...");
      const app = await createServer();
      
      // Use basePath to tell serverless-http where this function is mounted
      // Netlify routing: /api/* → /.netlify/functions/api/:splat
      // So we need to strip /.netlify/functions/api from the path
      cachedHandler = serverless(app, {
        basePath: "/.netlify/functions/api",
        provider: "aws",
      });
      
      console.log("✅ Express app ready with serverless-http");
    } catch (error) {
      console.error("❌ Failed to initialize:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server init failed" }),
        headers: { "Content-Type": "application/json" },
      };
    }
  }

  try {
    const result = await cachedHandler(event, context);
    console.log(`✅ ${method} ${path} → ${result.statusCode}`);
    return result;
  } catch (error) {
    console.error(`❌ Error: ${method} ${path}`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Handler failed" }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
