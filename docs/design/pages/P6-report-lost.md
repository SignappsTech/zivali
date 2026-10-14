---
source: 03§P6
page: P6 Report lost
stories: TASK-29 (FR-005, FR-003, FR-002)
platforms: web, mobile
mockup: docs/design/mockups/P6-report-lost.html
copy: docs/content/pages/P6-report-lost.md
---

# P6 Report lost

## Purpose

An owner reports a lost pet in a few minutes, calmly, one question per screen. Matching and nearby alerts start the moment it is submitted. No ad and no payment prompt appears anywhere in the flow (P-2); the only support moment is a collapsed, optional row on the confirmation screen.

## Flow (Flow variant of the shell: flow top bar with back, step bars, close)

The step count depends on the path. The bars show the real count.

| Step | Question (h1) | Control | Notes |
|---|---|---|---|
| 1 Pet | Which animal? | choice rows: each saved pet (photo, name) plus "Another animal" | Signed-out visitors and users without pets see only "Enter details". |
| 2 Photos | Add photos | camera and gallery tiles, thumbnails 1 to 5, remove and reorder | New pet only. At least one photo is required. Upload progress per photo, retry on failure. AI suggestion (M3, P-extension) appears here as the "Is this right?" sentence from the found flow. |
| 3 Details | Tell us about it | species choice rows, size choice rows, colours (toggle pills plus "other"), name, chip number (optional), collar, special notes | New pet only. Grouped under h3 labels; no boxes. Chip: line field with format hint; invalid or short numbers are accepted with a warning note (FR-002). |
| 4 Where | Where was it last seen? | location picker (P5) with radius | |
| 5 When | When was it last seen? | choice rows: Just now, Today, Yesterday, Another time (date and time fields) | Default Just now. Future dates rejected; older than 30 days shows a warning note. |
| 6 Circumstances | What happened? | textarea (optional) and contact preference (chat only, selected, with the one-line safety reason) | |
| 7 Review | Check and publish | plain summary list: photo, name, area, time (each row with an "Edit" text button) | Primary `lg` "Publish search". |

With a saved pet the path is 1, 4, 5, 6, 7 (five bars). With a new pet it is 1 to 7.

## Sign-in gate

A visitor can fill every step. When pressing Publish, a bottom sheet (web: dialog) offers "Continue with account": Sign in, Create account, Google, Apple (P16) with the note that nothing entered is lost. After auth the report is created with all data and the flow continues to the confirmation. Unverified email: the report is saved and published, alerts and chat show the verify prompt (P16).

## Confirmation screen

- Reunited-calm tone, spot illustration optional, h1 "Your search is published".
- "What happens next" as a plain list of three rows (we notify neighbours, we look for matches, you will see matches in the inbox).
- One primary: "Download poster" (P18). Text buttons: "Share", "Open my report".
- Optional support row, **collapsed by default**: "Help keep this free"; expands to 2, 3, 5 EUR pills (none selected) and a button (P15). Shown once per report; skipping hides it.
- Never an ad.

## States

| State | Behaviour |
|---|---|
| Draft | saved locally on every step ("Draft saved" quiet line); resumable from the Map tab and My reports |
| Validation | inline per field, error message under the line, focus moved to the first error; Next stays enabled so the error is explained |
| Duplicate open report | after step 1 or at review: note "You already have an open search for this animal" with choice rows "Update it" (primary) and "Create a new one" |
| Upload failure | per photo retry; publishing blocked until at least one photo is uploaded |
| Rate limited or network failure | calm note with retry; draft kept |
| Success | confirmation screen |
| Pet limit | adding a second profile offers Premium as a quiet text note (never blocks reporting) |

## Web differences

Centred 560 px column, flow shell, step bars in a row under the header, Back and Next at the bottom of the column (Next primary). On `lg` the review step may show the summary left and the photo right. Keyboard: Enter advances, errors announced.

## Responsive and accessibility

Mobile first; Next button sticky at the bottom with 44 px bottom padding; works with 200 % text. One question per screen, labels above fields, focus placed on the heading on step change, step bars have `role="progressbar"`, camera and gallery tiles are buttons with names, thumbnail removal has an accessible name, the contact-preference rows are a `radiogroup`.

## Assets

None. The confirmation screen is text and icons only.

## Mockup scope (`P6-report-lost.html`)

1. Mobile: steps 1 to 7 (new pet path), the shorter path summary, sign-in gate sheet, confirmation (collapsed and expanded support row), duplicate-report note, validation error, upload failure.
2. Web: steps 2, 4, 7 and the confirmation.
3. Light and dark.
