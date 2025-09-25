import * as Sentry from "@sentry/react";

// Initialize Sentry for the browser (React)
(() => {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [],
    enabled: true,
    attachStacktrace: true,
    sendClientReports: true,
    ignoreErrors: [
      // common noisy errors that are not actionable
      "ResizeObserver loop limit exceeded",
      "NetworkError when attempting to fetch resource.",
    ],
  });
})();
