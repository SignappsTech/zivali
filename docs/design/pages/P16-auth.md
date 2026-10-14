---
source: 03§P16
page: P16 Sign in and account creation
stories: TASK-9 (FR-001)
platforms: web, mobile
mockup: docs/design/mockups/P16-auth.html
copy: docs/content/pages/P16-auth.md
---

# P16 Auth

## Purpose

Quick, trustworthy account creation and sign-in with email, Google or Apple, plus contextual gates ("you need an account to continue") that never lose what the user has entered. No ads, no sidebar (Flow variant). Finders reporting without an account never see these screens.

## Screens

| Screen | Content (top to bottom) |
|---|---|
| Sign in | h1; email and password line fields (show password toggle); text button "Forgot password"; primary `lg` "Sign in"; "or" text; Google and Apple `provider` buttons (system 10.2: equal size, stacked, brand-correct glyphs); text button "Create an account" |
| Create account | h1; name, email, password (strength hint as text, minimum shown); a plain sentence linking Terms and Privacy (no pre-ticked box); primary `lg` "Create account"; Google and Apple; text button "I have an account" |
| Check your email | spot icon (envelope) in a tonal circle, h1, the address, primary "Open mail app" (mobile only), text buttons "Resend" (with cooldown text) and "Change email" |
| Email verified | check icon, h1, primary "Continue" |
| Forgot password | h1, email field, primary "Send link", sentence that the answer is always the same for privacy |
| New password | h1, password field with hint, primary "Save password" |

Apple sign-in follows Apple's button rules on iOS and web (use the platform button or the specified assets); Google follows Google's branding rules. Both appear on every sign-in and sign-up screen as `provider` buttons (system 10.2), the same size as the secondary buttons, identical on the page, in sheets and in dialogs.

## Contextual gate (sheet on mobile, dialog on web)

Opened from report lost, contact on a listing, alerts, tip, My pets. Content: h2 (why an account is needed in one phrase), a line "Everything you entered is kept", primary "Sign in", secondary "Create an account", Google and Apple, text "Cancel". After success the user returns to exactly the same step. Unverified users get a variant: "Confirm your email" with Resend; drafts continue to work.

## Account linking

When the same verified email signs in with another provider: a dialog "Link this sign-in to your account?" with primary "Link" and text "Cancel". Apple relay emails are shown as "hidden by Apple".

## States and errors

| State | Behaviour |
|---|---|
| Wrong credentials | one generic message under the form (not field specific) |
| Field errors | line turns `destructive`, message with icon below |
| Rate limited, captcha failed | calm note with when to retry |
| Unverified | the gate variant, not an error |
| Provider cancelled | quiet toast, form unchanged |
| Session expired | sheet "Sign in again", draft preserved |
| Banned (M4) | page with the reason and a contact link |

## Web

Centred 440 px column, logo above, no side panel, `Enter` submits, autofill and password managers supported (labelled fields, correct `autocomplete`). Mobile: full-screen with close, the keyboard never hides the primary.

## Accessibility

Labels above fields, `autocomplete` values, errors announced and tied with `aria-describedby`, show-password button named, focus on the heading on screen change, captcha does not trap focus, strength hint is text.

## Assets

None.

## Mockup scope (`P16-auth.html`)

1. Mobile: sign in, create account, check email, verified, forgot password, new password, contextual gate (both variants), account linking dialog, error states.
2. Web: sign in, create account, gate dialog.
3. Light and dark.
