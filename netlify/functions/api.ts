import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  console.log("Handler invoked:", event.path, event.httpMethod);

  if (!cachedHandler) {
    console.log("Creating new server instance...");
    const app = await createServer();
    console.log("Server created, routes should be registered");
    cachedHandler = serverless(app);
  }

  const result = await cachedHandler(event, context);
  console.log("Handler result status:", result.statusCode);
  return result;
};
