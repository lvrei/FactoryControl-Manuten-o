import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    const app = await createServer();
    cachedHandler = serverless(app);
  }
  return cachedHandler(event, context);
};
