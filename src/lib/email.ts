import "server-only";

/**
 * Sends a notification email through Resend's HTTP API. Without
 * RESEND_API_KEY it logs and skips, so local development works offline.
 * (Sign-in links are sent by Supabase Auth itself, configured to use Resend SMTP.)
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Souq Sharqiya <no-reply@souqsharqiya.com>";
  if (!key) {
    console.info(`[email skipped: RESEND_API_KEY not set] to=${to} subject=${subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    console.error(`[email failed] ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
