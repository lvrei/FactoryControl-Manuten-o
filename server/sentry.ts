import * as Sentry from "@sentry/node";

export function initSentryNode() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    attachStacktrace: true,
    sendClientReports: true,
    enabled: true,
  });
  return true;
}

export { Sentry };
