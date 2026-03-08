const PRODUCTION_SENTRY_HOST = "bath.garden";

export function shouldEnableSentry(dsn: string | undefined, hostname: string): boolean {
  if (!dsn) return false;
  return hostname === PRODUCTION_SENTRY_HOST;
}

export { PRODUCTION_SENTRY_HOST };
