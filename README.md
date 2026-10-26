# Souq Sharqiya · سوق الشرقية

Free, bilingual (Arabic/English) classifieds for the Eastern Province of Saudi Arabia: cars, housing, jobs and used electronics. Phase 1 (MVP).

Stack: Next.js 16 (App Router, TypeScript, Tailwind CSS 4) on Vercel, Supabase (Postgres, Auth, Storage, Realtime), Resend for email, Cloudflare for the domain.

## What's in the MVP

- **Browse without an account.** Home, search with per-category filters, SEO pages such as `/en/khobar/housing/rent-apartment`, and ad pages. Arabic (RTL, default) and English.
- **Sign in to act.** Email sign-in link, plus Google and Apple. Posting, chat, showing a phone number, saving, rating and reporting all send visitors to sign in and then back to the same page.
- **Posting** in 3 steps (category, details, photos). Up to 10 photos, compressed to WebP in the browser. Ads run 30 days and can be renewed, closed, edited or marked sold.
- **Moderation.** A new account's first 2 ads go to a review queue; banned words and photos reused from other sellers' ads also go to review. New accounts can post 3 ads a day (20 after a week). Throwaway email domains are refused.
- **Contact.** In-app chat (live, with an email alert when the other person is away), and call/WhatsApp buttons the seller can switch off. Phone numbers are revealed one ad at a time, logged, and capped at 40 a day per user.
- **Two-way ratings.** The seller marks the ad sold to someone who chatted about it; then both rate each other. Profiles show "as seller" and "as buyer" scores separately.
- **Price rating** (Great / Good / Fair / High) against the median of at least 10 similar ads from the last 90 days, widening once before giving up. Electronics priced above Cartlow's refurbished price are rated High from day one, and show a "Sponsored link" to Cartlow.
- **Verified business badge** after an admin checks the CR number (and FAL licence for agencies). Property sales and agency ads require a REGA ad licence number.
- **Saved ads and saved searches** with daily email alerts.
- **Admin panel** (`/en/admin`): review queue, reports, business verification, Cartlow prices with click counts, banning users.

Not in phase 1: price offers and the AI negotiator, paid placements, CV uploads.

## Project layout

```
supabase/migrations/   database schema, security rules, price rating (SQL)
supabase/tests/        database tests (run on plain PostgreSQL)
src/app/[lang]/        pages, under /ar and /en
src/app/actions/       server actions
src/app/api/cron/      nightly price re-rating, saved-search alerts
src/lib/categories.ts  categories, subcategories and their fields (drives forms and filters)
src/lib/locations.ts   cities and districts
src/lib/catalog.ts     car makes/models and device brands/models
src/lib/i18n/          Arabic and English text
```

## Setting it up

You need four accounts. Each has a free tier that is enough while building; the paid plans are listed at the end.

### 1. Supabase (database, sign-in, photos)

1. Create a project at [supabase.com](https://supabase.com). Choose the **Frankfurt (eu-central-1)** region, next to the Vercel region in `vercel.json`.
2. **SQL Editor → New query**: paste all of `supabase/migrations/20261026000000_init.sql` and run it.
3. **Authentication → URL Configuration**: set *Site URL* to your domain (e.g. `https://souqsharqiya.com`) and add these *Redirect URLs*:
   `https://souqsharqiya.com/auth/callback`, `http://localhost:3000/auth/callback`, and your Vercel preview URL pattern (e.g. `https://*-yourteam.vercel.app/auth/callback`).
4. **Authentication → Emails → Magic Link** template: change the link so it also works when opened in a different browser:
   ```html
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to Souq Sharqiya</a>
   ```
   Do the same for the *Confirm signup* template (with `type=email`).
5. **Authentication → Emails → SMTP Settings**: turn on custom SMTP using Resend (step 3): host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key. Supabase's built-in sender only allows a few emails an hour.
6. **Authentication → Providers**: enable **Google** (create an OAuth client in Google Cloud Console; the redirect URI is shown on that Supabase page). **Apple** is optional and needs an Apple Developer account (USD 99/year); if you enable it, set `NEXT_PUBLIC_AUTH_PROVIDERS=google,apple`.
7. **Project Settings → API keys**: copy the URL, the publishable (anon) key and the secret (service role) key for step 2.
8. After you sign in for the first time, make yourself an admin (SQL Editor):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### 2. Vercel (hosting)

1. Import this GitHub repository at [vercel.com/new](https://vercel.com/new).
2. Add the variables from `.env.example` under *Settings → Environment Variables* (Production and Preview). Generate `CRON_SECRET` with any long random string.
3. Deploy. The two daily jobs in `vercel.json` (price re-rating at 04:00 and saved-search alerts at 08:00 Saudi time) start automatically.

### 3. Resend (email)

1. Create an account at [resend.com](https://resend.com) and add your domain. It shows DNS records (SPF, DKIM); add them in Cloudflare so emails don't land in spam.
2. Create an API key and use it for `RESEND_API_KEY` and for Supabase SMTP (step 1.5).

### 4. Cloudflare (domain)

1. Register `souqsharqiya.com` (about SAR 50/year) in Cloudflare Registrar.
2. In Vercel *Settings → Domains*, add the domain; then add the records Vercel shows in Cloudflare DNS with the proxy **off** (grey cloud), so Vercel can issue the certificate.

### After launch

- Apply to the **Cartlow affiliate program** (DCMnetwork) once the domain is live, then enter prices for the top phones and laptops in *Admin → Cartlow prices* with your affiliate links. Prices older than 35 days are flagged.
- Review the draft **privacy policy** and **terms** pages with a lawyer (PDPL, REGA e-platform rules).
- Extend the district lists in `src/lib/locations.ts` as ads come in.

## Running locally

```bash
cp .env.example .env.local   # fill in your Supabase keys
npm install
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run lint
npm run typecheck
npm test          # unit tests (validation, search, helpers, translations)
npm run test:db   # applies the migration to a throwaway PostgreSQL and runs the SQL tests
```

`test:db` uses `$DATABASE_URL` if set, otherwise a local PostgreSQL install. CI runs all of these on every pull request.

## Monthly running costs (approx.)

| Service | Plan | SAR / month |
| --- | --- | --- |
| Vercel | Pro (USD 20) | 75 |
| Supabase | Pro (USD 25; 8 GB database, 100 GB photos) | 94 |
| Resend | Free up to 3,000 emails/month | 0 |
| Cloudflare | Domain only | ~5 |
| **Total** | | **~175** |

During development the free tiers of Vercel and Supabase are enough (Supabase pauses free projects after a week without activity).
