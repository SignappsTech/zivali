---
source: 03§P12
page: P12 Chat
stories: TASK-21 (FR-009)
platforms: web, mobile
mockup: docs/design/mockups/P12-chat.html
copy: docs/content/pages/P12-chat.md
---

# P12 Chat

## Purpose

Owner and finder talk in the app without exchanging phone numbers. The screen must make safety obvious without being scary, and work for a signed-in owner and an anonymous finder coming through the private manage link. No ads (FR-030), no payment prompts in the thread.

## Conversation list (Inbox tab, "Conversations" view)

Rows with no dividers: pet photo 64 (the report's pet), pet name or "Found animal", last message line (one line, muted), time right. Unread: the name in bold and a 10 px `primary` dot at the right (the one place a semantic dot is allowed). A status word under the name ("Match confirmed", "Report closed"). Empty state: spot illustration, h3 "No conversations yet", one sentence about how chats start (confirmed match or Contact on a listing).

The Inbox tab has two views switched with a two-option segmented control: Conversations and Notifications (P13).

## Thread

1. **Top bar:** back, pet photo (32) and name, status word, overflow menu (Open report, Report, Block).
2. **Safety banner**, persistent and compact, pinned under the top bar: shield icon, one sentence "Never send money first", text button "Read tips" opening the safety tips (P3). Not dismissible, one line at 390 px.
3. **Messages:**
   - Own: right, `primary` fill, `primary-foreground` text, radius 20 with the tail corner 6.
   - Other: left, `card` surface (on `background`), `foreground` text.
   - Times in 13 px `muted-foreground` under groups; day separators as centred muted text.
   - System messages centred, muted, no bubble ("Match confirmed", "Report closed").
   - **Links** appear as plain text (no preview), with a small caution line under the message: "Be careful with links."
   - Failed message: muted bubble, retry text button, error icon.
4. **Composer** pinned at the bottom: line-style textarea (auto-grow to 4 lines, 17 px), 48 px `primary` round send button with an arrow. Character limit shown only near the limit.

## Variants and states

| State | Behaviour |
|---|---|
| New conversation after a confirmed match | system message first, safety banner, composer focused |
| Anonymous finder (manage-link session) | same thread, no account prompt; top bar shows "Your private session" note once |
| Read-only (report closed) | composer replaced by a `note` "This conversation is closed" |
| Blocked | composer disabled with explanation; thread stays |
| Offline | banner "Offline", messages queue with a clock icon and send on reconnect |
| Sending | message appears at once, spinner icon, then check |
| Delivery | new messages arrive in under 2 s; announced politely (live region) without stealing focus |
| Empty thread | prompt line suggesting what to say (no phone numbers) |
| Loading older | spinner row at the top |
| Reported message | folded with "You reported this message" |
| Photo attachments | not in this phase (hidden) |

Reward escrow (M4) adds one row under the safety banner; leave 56 px of reserved room in the layout.

## Web

`lg`: two panes, list 360 px left and thread right; Enter sends, Shift+Enter adds a line. Below `lg` list and thread are separate screens. Anonymous finders open the thread directly from the manage page.

## Responsive and accessibility

Composer stays above the keyboard; safety banner collapses to an icon plus one line at 320 px. Messages are a `log` region (`aria-live="polite"`), each bubble has author and time in its accessible name, the send button has a label, timestamps are real text, 200 % text keeps bubbles readable, caution text is real text.

## Assets

| File | Brief |
|---|---|
| `assets/empty-inbox.png` | Empty-state illustration for "no conversations or notifications yet". See image task. |

## Mockup scope (`P12-chat.html`)

1. Mobile: list (with unread), empty, thread (own and other messages, link caution, system message), failed message, read-only, blocked, offline queue, anonymous session note.
2. Web 1200 px: two panes.
3. Light and dark.
