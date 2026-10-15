# Your to-do list (client actions)

Owner: Primož · Prepared by the Project Lead · 2026-10-15
Put keys into `.env.local` (gitignored) unless noted. Never paste secrets into chat.

## A. Needed for the first deploy (staging), whenever you're ready

### 1. Temporary domain (the ~€1 one)
- [ ] Buy a cheap domain (e.g. a `.xyz` / `.online` / `.site` first-year deal). Use it for **staging only**.
- [ ] Put its DNS on **Cloudflare** (free): add the site in Cloudflare and change the nameservers at the registrar.
- Why it's fine: every URL in the app comes from config (`APP_URL`), so switching to the final domain later is a config change.
- ⚠️ Things that bind to a domain and will need redoing when you switch to the final one:
  - email sender verification
  - Google/Apple OAuth redirect URLs
  - Stripe webhook URL
  - the GA4 stream URL
  - Turnstile hostnames
  - **mobile deep links** (universal/app links are baked into app builds)

  So **don't ship store builds on the temporary domain**.
- ⚠️ Cheap TLDs (.xyz and the like) often land in spam for email. That's fine for staging tests, not for real users.
- 💡 najdimo.si / najdimo.com were still free last night (≈€15–20/year). Grab them whenever you're 100 % sure.

### 2. Hetzner (server, about €4–5/month)
- [ ] Create an account at console.hetzner.cloud, then a project "najdimo".
- [ ] Either **(a)** create an **API token** (Security → API tokens, Read & Write) → `HETZNER_API_TOKEN`, and we create the server; **or (b)** create the server yourself: **CX22** (2 vCPU / 4 GB), **Ubuntu 24.04**, location **Falkenstein or Nuremberg (EU)**, with your SSH key, and send the IP.

### 3. Cloudflare (DNS, photo storage, spam protection, all free tier)
- [ ] **R2**: enable it (Cloudflare asks for a payment method even for the free tier).
  - Create an **R2 API token** (Object Read & Write) → `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
  - We create the 3 buckets (EU jurisdiction) ourselves.
- [ ] **Turnstile** (captcha for anonymous found reports): add a widget for your domain plus `localhost` → `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
- [ ] Optional: a **Cloudflare API token** (Zone DNS Edit for your domain) → `CLOUDFLARE_API_TOKEN`, so we set the DNS records ourselves (server, email SPF/DKIM/DMARC).
- [ ] Optional: **Email Routing** (free): forward e.g. podpora@ and zavetisca@ to your Gmail. That gives you inboxes for free.

### 4. Email sending: Brevo (free, 300 emails/day)
- [ ] Create an account at brevo.com → **API key** → `BREVO_API_KEY`.
- [ ] Add your domain as a sender. It gives you DNS records (we add them if you gave us the Cloudflare DNS token).

### 5. Google login
- [ ] In Google Cloud (your existing project `zivali-511620`), set up the **OAuth consent screen** (External, app name Najdimo) and create **OAuth client ID → Web application**.
  - Authorised redirect URI: `https://omtpppzrugibquukhnyl.supabase.co/auth/v1/callback`
  - Put the result in `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`. We enable it in Supabase.
- Apple sign-in waits for the Apple Developer account (section C).

### 6. GitHub Actions (automatic deploys)
- [ ] Either add the repo secrets yourself (we'll give you the exact list when the deploy task runs), or give us a fine-grained **PAT** for `pbozic/zivali` (Secrets: read/write, Actions: read/write) → `GITHUB_TOKEN`.

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

## Already done ✅
- Supabase project `najdimo` (Frankfurt) with keys
- Vercel token (not needed any more: we host on Hetzner)
- Expo token
- Stripe sandbox keys
- Anthropic key
- GA4 (property, events, dimensions, service account)
- GitHub repo (SSH)
