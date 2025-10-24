import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  // Log incoming request details
  const method =
    event.httpMethod || event.requestContext?.http?.method || "GET";
  const path = event.path || event.rawPath || event.requestContext?.path || "/";
  const queryString = event.rawQueryString || event.queryStringParameters || "";

  console.log("🔵 Netlify Function handler invoked:", {
    method,
    path,
    rawPath: event.rawPath,
    requestPath: event.requestContext?.path,
    queryString,
  });

  if (!cachedHandler) {
    try {
      console.log("📦 Initializing Express server for Netlify Function...");
      const app = await createServer();
      console.log("✅ Express app initialized with all routes");
      cachedHandler = serverless(app);
    } catch (error) {
      console.error("❌ Failed to initialize Express app:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to initialize server" }),
      };
    }
  }

  try {
    const result = await cachedHandler(event, context);
    console.log(`✅ Response: ${method} ${path} → ${result.statusCode}`);
    return result;
  } catch (error) {
    console.error(`❌ Error handling ${method} ${path}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
