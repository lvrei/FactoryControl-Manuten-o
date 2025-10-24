import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  // Log detailed information about incoming request
  const path = event.path || event.rawPath || "/";
  const method = event.httpMethod || event.requestContext?.http?.method || "GET";

  console.log("🔵 Handler invoked:", {
    path,
    method,
    rawPath: event.rawPath,
    requestPath: event.requestContext?.path,
  });

  if (!cachedHandler) {
    console.log("📦 Creating new server instance...");
    const app = await createServer();
    console.log("✅ Server created, routes registered");

    // Create the serverless handler without basePath - we'll handle normalization in middleware
    cachedHandler = serverless(app);
  }

  try {
    const result = await cachedHandler(event, context);
    console.log("✅ Handler result status:", result.statusCode);
    return result;
  } catch (error) {
    console.error("❌ Handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
