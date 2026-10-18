---
source: 03§P16; docs/design/pages/P16-auth.md
page: P16 Sign in and account creation
stories: TASK-9 (FR-001)
copy-for: docs/design/pages/P16-auth.md
version: 0.3
status: Draft, native Slovenian review pending
date: 2026-10-18
---

# P16 Auth: copy

Namespace `auth`. Sign-in is **Vpis** / "vpišite se" everywhere ("Prijava" is the animal report). Auth emails are in `docs/content/notifications-and-emails.md`.

# 1. Sign in

| Key | SL | EN |
|---|---|---|
| auth.signin_title | Vpišite se | Sign in |
| auth.email_label | E-naslov | Email address |
| auth.password_label | Geslo | Password |
| auth.password_show | Pokaži geslo | Show password |
| auth.password_hide | Skrij geslo | Hide password |
| auth.forgot_link | Pozabljeno geslo? | Forgot your password? |
| auth.signin_button | Vpiši se | Sign in |
| auth.or | ali | or |
| auth.google | Nadaljuj z Googlom | Continue with Google |
| auth.apple | Nadaljuj z Applom | Continue with Apple |
| auth.to_signup | Ustvari račun | Create an account |

Apple and Google buttons: where the platform renders its own localised button (iOS `ASAuthorizationAppleIDButton`, Apple JS, Google Identity Services), use the platform text; the strings above are the fallback.

# 2. Create account

| Key | SL | EN |
|---|---|---|
| auth.signup_title | Ustvarite račun | Create an account |
| auth.name_label | Ime | Name |
| auth.name_help | To ime vidijo ljudje, s katerimi se pogovarjate. Lahko je tudi vzdevek. | People you talk to see this name. A nickname is fine. |
| auth.password_hint | Najmanj 8 znakov. Daljše geslo ali več besed je varnejše. | At least 8 characters. A longer password or several words is safer. |
| auth.terms_sentence | Z ustvaritvijo računa se strinjate s <terms>pogoji uporabe</terms>. Kako ravnamo s podatki, piše v <privacy>politiki zasebnosti</privacy>. | By creating an account you agree to the <terms>terms of use</terms>. How we handle your data is explained in the <privacy>privacy policy</privacy>. |
| auth.signup_button | Ustvari račun | Create account |
| auth.to_signin | Že imam račun | I already have an account |

`auth.terms_sentence` is stored with rich tags `<terms>…</terms>` and `<privacy>…</privacy>` instead of markdown links; the code renders them with `t.rich` and points them at `/pogoji-uporabe` and `/zasebnost` (EN `/en/terms`, `/en/privacy`) (CH-165).

Minimum password length (8) to be confirmed by the tech-lead (Supabase Auth setting).

# 3. Check your email and verified

| Key | SL | EN |
|---|---|---|
| auth.check_title | Preverite e-pošto | Check your email |
| auth.check_body | Povezavo smo poslali na {email}. Odprite jo, da potrdite e-naslov. | We have sent a link to {email}. Open it to confirm your email address. |
| auth.check_open_mail | Odpri e-pošto | Open email app |
| auth.check_resend | Pošlji znova | Resend |
| auth.check_resend_wait | Znova lahko pošljete čez {seconds} s. | You can resend in {seconds} s. |
| auth.check_change | Spremeni e-naslov | Change email address |
| auth.check_spam | Ne najdete sporočila? Preverite mapo z neželeno pošto. | Cannot find it? Check your spam folder. |
| auth.verified_title | E-naslov je potrjen | Your email address is confirmed |
| auth.verified_body | Zdaj lahko prejemate opozorila in se pogovarjate. | You can now get alerts and send messages. |
| auth.verified_continue | Nadaljuj | Continue |
| auth.verified_draft_elsewhere | Prijava, ki ste jo začeli, je shranjena v brskalniku, v katerem ste jo izpolnjevali. Povezavo iz e-pošte odprite tam ali se tam vpišite, da jo objavite. | The report you started is saved in the browser where you filled it in. Open the email link there, or sign in there, to publish it. |

`auth.verified_draft_elsewhere` replaces `auth.verified_body` on the "E-naslov je potrjen" view when the link came from a signed-out Publish (`next` with `?handoff=`) but is opened in another browser (viewer signed out); its button then reads `auth.signin_button` ("Vpiši se"). In the same browser the link skips this view and returns to the report, which publishes itself (CH-499, TASK-114.4). Native review: SL reads correctly in the formal "vi" form and follows the "Prijava = report, Vpis = sign-in" rule above, unchanged.

# 4. Forgot and new password

| Key | SL | EN |
|---|---|---|
| auth.forgot_title | Pozabljeno geslo | Forgot your password |
| auth.forgot_body | Vpišite e-naslov in poslali vam bomo povezavo za novo geslo. | Enter your email address and we will send you a link to set a new password. |
| auth.forgot_button | Pošlji povezavo | Send link |
| auth.forgot_done | Če za ta e-naslov obstaja račun, smo nanj poslali povezavo. Zaradi varnosti je odgovor vedno enak. | If there is an account for this address, we have sent a link to it. For your security, this answer is always the same. |
| auth.newpass_title | Novo geslo | New password |
| auth.newpass_label | Novo geslo | New password |
| auth.newpass_button | Shrani geslo | Save password |
| auth.newpass_done | Geslo je spremenjeno. | Your password has been changed. |

# 5. Contextual gate

| Key | SL | EN | Opened from |
|---|---|---|---|
| auth.gate_title_report | Za objavo potrebujete račun | You need an account to publish | report lost (P6 uses its own body) |
| auth.gate_title_contact | Za pogovor potrebujete račun | You need an account to message | contact on a listing (P9) |
| auth.gate_title_alerts | Za opozorila potrebujete račun | You need an account for alerts | alerts |
| auth.gate_title_tip | Za prispevek potrebujete račun | You need an account to contribute | tip (P15) |
| auth.gate_title_pets | Za shranjevanje živali potrebujete račun | You need an account to save pets | My pets |
| auth.gate_kept | Vse, kar ste vnesli, ostane. | Everything you entered is kept. | all |
| auth.gate_signin | Vpiši se | Sign in | |
| auth.gate_signup | Ustvari račun | Create an account | |
| auth.gate_cancel | Prekliči | Cancel | |
| auth.gate_unverified_title | Potrdite svoj e-naslov | Confirm your email address | unverified variant |
| auth.gate_unverified_body | Povezavo smo poslali na {email}. Osnutki medtem delujejo. | We have sent a link to {email}. Your drafts keep working in the meantime. | |
| auth.gate_unverified_resend | Pošlji znova | Resend | |

# 6. Account linking

| Key | SL | EN |
|---|---|---|
| auth.link_title | Povežete ta način vpisa z računom? | Link this sign-in to your account? |
| auth.link_body | Račun z e-naslovom {email} že obstaja. Če ju povežete, se lahko vpisujete na oba načina. | An account with {email} already exists. If you link them, you can sign in either way. |
| auth.link_confirm | Poveži | Link |
| auth.link_cancel | Prekliči | Cancel |
| auth.apple_relay | e-naslov skriva Apple | hidden by Apple |

# 7. Errors and states

| Key | SL | EN |
|---|---|---|
| auth.error_credentials | E-naslov ali geslo ni pravilno. | The email address or password is not correct. |
| auth.error_email_invalid | Vpišite veljaven e-naslov, na primer ime@primer.si. | Enter a valid email address, for example name@example.com. |
| auth.error_password_short | Geslo mora imeti najmanj 8 znakov. | The password must have at least 8 characters. |
| auth.error_name_required | Vpišite ime ali vzdevek. | Enter a name or nickname. |
| auth.error_email_taken | Račun s tem e-naslovom že obstaja. Vpišite se ali ponastavite geslo. | An account with this email address already exists. Sign in or reset your password. |
| auth.error_rate_limited | Preveč poskusov. Poskusite znova čez nekaj minut. | Too many attempts. Please try again in a few minutes. |
| auth.provider_cancelled | Vpis je bil preklican. | Sign-in was cancelled. |
| auth.session_title | Znova se vpišite | Please sign in again |
| auth.session_body | Zaradi varnosti vas moramo znova vpisati. Vaš osnutek je shranjen. | For your security, please sign in again. Your draft is saved. |
| auth.banned_title | Račun je zaprt | This account is closed |
| auth.banned_body | Račun smo zaprli zaradi kršitve pogojev uporabe. Razlog: {reason}. Če menite, da gre za napako, nam pišite. | We closed this account because the terms of use were broken. Reason: {reason}. If you think this is a mistake, please write to us. |

`auth.error_email_taken` is shown on the email field of web sign-up when the address already has a confirmed account (CH-492, supersedes CH-177; owner choice, TASK-114.1). "Vpišite se" and "ponastavite geslo" are links: sign-in (with the address and `next` carried) and forgot-password. Mobile sign-up still behaves the old way until its own task. This slice has no "taken address behaves like success" line to remove.

Captcha failure: `errors.CAPTCHA_FAILED` (P1). `auth.banned_*` is used from M4.

| Key | SL | EN |
|---|---|---|
| auth.link_failed_title | Povezava ne deluje več | This link no longer works |
| auth.link_failed_body | Morda je potekla ali je bila že uporabljena. Zahtevajte novo. | It may have expired or been used already. Please request a new one. |

`auth.link_failed_*` is shown when a confirmation or reset link is expired or already used (mobile `app/auth/callback`; the web reuses it for the same case). Draft, needs native review (CH-165). The primary button is `auth.forgot_button` for a reset link and `auth.check_resend` for a confirmation link.

# 8. SEO and alt text

| Page | SL title | EN title | Indexing |
|---|---|---|---|
| Sign in `/vpis` (CHANGE from `/prijava-v-racun`) | Vpis · Najdimo | Sign in · Najdimo | `noindex` |
| Sign up `/registracija` | Ustvarite račun · Najdimo | Create an account · Najdimo | `noindex` |
| Reset `/pozabljeno-geslo` | Pozabljeno geslo · Najdimo | Forgot password · Najdimo | `noindex` |

`auth.reset_doc_title` (SL "Pozabljeno geslo", EN "Forgot password") is the key for the reset page's document title, before the " · Najdimo" suffix; the EN differs from `auth.forgot_title` ("Forgot your password"). The sign-in title uses `nav.sign_in`, the sign-up title `auth.signup_title` (CH-188).

No meta descriptions needed (not indexed). Alt text: logo `alt=""` beside the wordmark; provider glyphs are part of the button's accessible name.

# Change log

| Date | Change |
|---|---|
| 2026-10-18 | CH-492 (TASK-114.1): `auth.error_email_taken` kept and its web use documented (§7). |
| 2026-10-18 | CH-499 (TASK-114.4): added `auth.verified_draft_elsewhere` (§3). |
| 2026-10-18 | CH-165: `auth.terms_sentence` uses rich tags; added `auth.link_failed_title/_body` (§7). CH-188: `auth.reset_doc_title` documented (§8). Version 0.3. |
