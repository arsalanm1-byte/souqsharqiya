// Mirror of public.blocked_email_domains (seeded in the migration), so the
// sign-in form can explain the problem before Supabase rejects the sign-up.
const DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
  "temp-mail.io", "throwawaymail.com", "yopmail.com", "yopmail.net",
  "getnada.com", "nada.email", "trashmail.com", "trashmail.de",
  "dispostable.com", "maildrop.cc", "mailnesia.com", "mintemail.com",
  "mohmal.com", "emailondeck.com", "fakeinbox.com", "tempinbox.com",
  "spamgourmet.com", "mytemp.email", "tempmailo.com", "tempr.email",
  "discard.email", "burnermail.io", "mailpoof.com", "inboxkitten.com",
  "moakt.com", "emailfake.com", "crazymailing.com", "tmail.ws",
  "tmpmail.org", "tmpmail.net", "1secmail.com", "1secmail.org",
  "1secmail.net", "mailcatch.com", "mailtemp.net", "linshiyouxiang.net",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return DOMAINS.has(domain);
}
