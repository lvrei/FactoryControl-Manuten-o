import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  // Log detailed information about incoming request
  const path = event.path || event.rawPath || "/";
  const method =
    event.httpMethod || event.requestContext?.http?.method || "GET";

  console.log("🔵 Handler invoked:", {
    path,
    method,
    rawPath: event.rawPath,
    requestPath: event.requestContext?.path,
  });

  if (!cachedHandler) {
    console.log("📦 Creating Express server for Netlify Function...");
    const app = await createServer();
    console.log("✅ Express app initialized, routes registered");

    // Configure serverless-http without basePath
    // Netlify already routes /.netlify/functions/api/* directly to this handler
    // The handler receives req.path without the function prefix
    cachedHandler = serverless(app);
  }

  const result = await cachedHandler(event, context);
  console.log(`✅ Handled ${method} ${path} → ${result.statusCode}`);
  return result;
};
