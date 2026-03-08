import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installClientConsoleMirror } from "./platform/dev/clientConsoleMirror";
import { shouldEnableSentry } from "./platform/sentry";
import "./index.css";

if (import.meta.env.DEV) {
  installClientConsoleMirror();
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const shouldInitSentry = shouldEnableSentry(sentryDsn, window.location.hostname);

if (shouldInitSentry) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    sendDefaultPii: false,
    debug: import.meta.env.DEV,
  });

  const shouldTriggerSentryTest = new URLSearchParams(window.location.search).get("sentry_test") === "1";
  if (shouldTriggerSentryTest) {
    Sentry.captureException(new Error("Sentry test error: manual trigger via ?sentry_test=1"));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
