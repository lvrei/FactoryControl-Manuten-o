import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  console.log("Handler invoked with:", {
    path: event.path,
    rawPath: event.rawPath,
    httpMethod: event.httpMethod,
    requestContext: event.requestContext?.path,
  });

  if (!cachedHandler) {
    console.log("Creating new server instance...");
    const app = await createServer();
    console.log("Server created, routes should be registered");
    // Tell serverless-http that the function base path is /.netlify/functions/api
    // This ensures that req.url is correctly set for Express routing
    cachedHandler = serverless(app, {
      basePath: "/.netlify/functions/api",
    });
  }

  const result = await cachedHandler(event, context);
  console.log("Handler result status:", result.statusCode);
  return result;
};
