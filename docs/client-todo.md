# Your to-do list (client actions)

Owner: Primož · Prepared by the Project Lead · 2026-10-15
Put keys into `.env.local` (gitignored) unless noted. Never paste secrets into chat.

## A. Needed for the first deploy (staging)

Status 2026-10-15 15:15: tokens checked read-only. Hetzner, Turnstile, Brevo, Google OAuth, GitHub and the Cloudflare zone token work.

### Open now
- [ ] **Repo visibility**: make `pbozic/zivali` private when convenient. `main` is already pushed (you said go ahead).

### Done ✅
- 2026-10-15 (with your OK):
  - Nameservers active on Cloudflare (zone najdimo.si, SSL mode Full; it goes to Full (strict) once the server has its certificate).
  - `main` pushed to GitHub.
  - Google sign-in enabled on the hosted Supabase project najdimo. The site URL and redirect list get the staging domain at the first deploy.
  - R2 buckets created in the EU jurisdiction: `zivali-private` (CORS PUT/GET from najdimo.si, www and staging), `zivali-media`, `zivali-backups` (30-day expiry).
  - Brevo sender domain najdimo.si added; its DKIM, verification and DMARC records are in Cloudflare (authentication requested).
  - Turnstile: the najdimo.si widget covers all subdomains.
  - `CERTBOT_CLOUDFLARE_TOKEN` saved (DNS edit, najdimo.si only) for certificate renewal.
  - `media.najdimo.si` serves the public `zivali-media` bucket (custom domain on the EU bucket works).
- Domain **najdimo.si** bought and added to Cloudflare.
- Hetzner: server `ubuntu-4gb-fsn1-2`, CAX11 arm64, Falkenstein, Ubuntu 24.04, running. `HETZNER_API_TOKEN` and `HETZNER_SERVER_IP` are set.
  - No Cloud Firewall yet. With the first deploy we create one: 80 and 443 open, 22 open with key-only SSH, because GitHub's deploy runners use changing IPs.
- Cloudflare API token (zone access works), Turnstile keys, Brevo key (free plan), Google OAuth client, GitHub fine-grained token (push and Actions-secrets access to `pbozic/zivali`).

### Reference: what the server is
- **CAX11**: Arm64 Ampere, 2 vCPU, 4 GB RAM, 40 GB SSD, €7.31/month. Our images are built for arm64.
- It's enough for staging and for the start of production. At launch, production gets its own CAX11, or a resize to CAX21 (4 vCPU / 8 GB) without a rebuild.
- No backups add-on: the server holds no data, and the database backups go to R2.
- Things that bind to the domain: email sender, OAuth redirect URLs, Stripe webhook, the GA4 stream URL, Turnstile hostnames, mobile deep links. najdimo.si is the final domain, so they're set up once.
- Apple sign-in waits for the Apple Developer account (section C).

## B. Business, legal, money (no rush, but they gate public launch)

- [ ] **Accountant**:
  - **Q-012**: do online card payments need fiscally verified invoices (davčno potrjevanje, ZDavPR)? If yes, which certified provider?
  - **VAT on voluntary tips/contributions** (OQ-001)
  - which legal entity runs Najdimo (Signapps d.o.o. or a new one)
- [ ] **Lawyer**: send `docs/legal/najdimo-pravni-pregled.docx` (33 pages, 34 launch-blocking questions, each with a proposed answer). You already have the file.
- [ ] **Trademark**: search "Najdimo" at tmview.org before printing anything.
- [ ] **Imprint details**: company name, address, registration and VAT number, and the contact emails (podpora@, zavetisca@, zasebnost@).
- [ ] **Native read-through** of the Slovenian terms flagged in the lawyer pack: SCC wording ("standardna pogodbena določila" vs "klavzule"), "revizijski dnevnik" vs "revizijska sled", geokodirnik, geografske ograde, stikalo, lansiranje, AI Act terms.
- [ ] **Stripe** (only when going live): activate the Najdimo account (company, bank, ID), branding (logo and colours), Stripe Tax details. Test mode needs nothing more.

## C. Later (store release, M3+)

- [ ] **Apple Developer** account (US$99/year): iPhone builds, TestFlight, Apple sign-in.
- [ ] **Google Play Console** (US$25 one-off).
- [ ] **Firebase**: add Firebase to project `zivali-511620`, link GA4 property "zivali", and add the Android and iOS apps `si.signapps.zivali`.
  - Download `google-services.json` and `GoogleService-Info.plist` into `.secrets/`.
  - Give the `zivali-analytics` service account the role "Firebase Cloud Messaging API Admin".
- [ ] **Separate production Supabase project** before launch. Today staging and production would share `najdimo`. Create e.g. `najdimo-prod` (Frankfurt, Free tier is fine at first) and put its keys in the production environment only.
- [ ] **EAS env** (once the domain exists): set the mobile API URL, app URL and Supabase publishable key per environment with `eas env:create` (development, preview, production). The EAS profiles are ready (TASK-5.2); no build has been run yet.
- [ ] **Voyage AI** key (photo matching, M3): voyageai.com → `VOYAGE_API_KEY`. The free tier covers about 150k photos.
- [ ] **GA4**: change the web stream URL from `https://test.com` to the real domain; add an internal-traffic filter.

## D. Growth and partners (whenever)

- [ ] A list of the **regional Facebook lost-pet groups** you know (for the share kit).
- [ ] **Pilot shelters**: contact **Gmajnice (Ljubljana)** and **Zavetišče Maribor**. Also ask every shelter for its **list of contract municipalities**: only 74 of 212 are confirmed, and shelters know this best.
- [ ] First **Vet Partner / sponsor** conversations ("founding partner" terms).

## E. Housekeeping

- [ ] Delete the obsolete `klikni-be/apps/api/pool/pool.js` (its password is about 2 years out of date, so nothing to rotate).
- [ ] Review and commit the **devteam plugin** changes in `C:\Users\Primzy\Documents\www\claude-devteam` (new scripts merge/next/review-brief/changes/runs, plus the token-economy rules; all uncommitted).
- [ ] Delete `MAPTILER_API_KEY` from `.env.local` (no longer used; our own geocoder replaced it).
- [ ] Delete leftover folders in `.claude/worktrees/` that Windows kept locked (git no longer tracks them).
- [ ] Keep Docker Desktop running while agents work (local database).
- [ ] Install the **Codex CLI** and sign in with your ChatGPT account: `npm i -g @openai/codex`, then `codex login`. The 8 image tasks wait on it: the app icon, the empty states, the house ads and the reunited illustration.
- [ ] Once the API scaffold (TASK-3.7) is merged, run `pnpm db:reset` once in the repo root. Prisma 7 refuses to reset a database when an AI agent runs it unless you consent, so this step needs you. It checks that migrations and seed build the local DB from zero.
- [ ] Decide whether we may **push `main` to GitHub** (`pbozic/zivali`; make it private first, see A). Only the first setup commit is on GitHub. Some agent worktrees are created from that stale `origin/main`, and agents now have to repair that themselves. Pushing would fix it, and it's also your off-site backup.

## Already done ✅
- Supabase project `najdimo` (Frankfurt) with keys
- Vercel token (not needed any more: we host on Hetzner)
- Expo token
- Stripe sandbox keys
- Anthropic key
- GA4 (property, events, dimensions, service account)
- GitHub repo (SSH)
