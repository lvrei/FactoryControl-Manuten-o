import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { createServer } from "../../server";

let handler: Handler;

async function getHandler() {
  if (!handler) {
    const app = await createServer();
    handler = serverless(app) as Handler;
  }
  return handler;
}

export const handler: Handler = async (event, context) => {
  const h = await getHandler();
  return h(event, context);
};
