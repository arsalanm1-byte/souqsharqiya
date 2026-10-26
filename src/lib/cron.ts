import "server-only";

/** Vercel Cron calls with `Authorization: Bearer $CRON_SECRET`. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
