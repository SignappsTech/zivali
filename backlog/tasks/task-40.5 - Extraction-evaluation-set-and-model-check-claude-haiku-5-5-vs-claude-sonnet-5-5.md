---
id: TASK-40.5
title: >-
  Extraction evaluation set and model check (claude-haiku-5-5 vs
  claude-sonnet-5-5)
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:23'
updated_date: '2026-10-19 00:10'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.3
references:
  - docs/tech/adr/012-ai-attribute-extraction.md§Model decision
  - docs/tech/contracts/C19-ai-extraction.md§Provider call
  - docs/tech/backend.md§Commands
parent_task_id: TASK-40
priority: high
ordinal: 375200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Confirms with data that the cheap model is good enough (ADR-012 gate) before real users see its suggestions, and gives a repeatable check for any later model change.

## Packet

Unblocks on: ai.extract job merged (TASK-40.3); the owner approves the paid run (about USD 0.50) and the photo set source (open question in the M3 breakdown)
The paid run happens once in the main checkout with the owner's ANTHROPIC_API_KEY (never copy .env files into a worktree); CI uses the mock.
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-40.5-extract-eval
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/api/test/eval/extract/ has at least 40 labelled photos (dogs and cats, mixed breeds, poor light, at least 3 with a prominent person, at least 2 without an animal), each with its licence (CC0, CC BY or owner-provided) in labels.json
- [x] #2 pnpm --filter api eval:extract [--model id] prints per-field results against the ADR-012 bars, refusal rate, p95 latency and mean cost per photo; it runs on the mock in pnpm verify (mechanics only)
- [ ] #3 One real run each on claude-haiku-5-5 and claude-sonnet-5-5; the results table and the recommendation are in the task notes, and a CHANGE to ADR-012§Model decision records the outcome
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Harness, offline (backend-dev, 2026-10-19)

Built `pnpm --filter api eval:extract [--model <id>]` (default `claude-haiku-5-5`) in `apps/api/test/eval/extract/` (harness.ts scoring, synthetic.ts, real.ts with the switch, run.ts, eval.test.ts, README.md), on the pattern of the matching eval (TASK-43.3). Offline by default: a synthetic set of 42 labels (the AC#1 composition) on the mock adapter (mechanics only), then the real set from the recorded replies in `real/replies/<model>.json`. `eval.test.ts` runs in pnpm verify. Nothing was sent to Anthropic and ANTHROPIC_API_KEY was not read.

ADR-012 bars the eval checks (`BARS` in harness.ts):

| field | bar | scored as |
|---|---|---|
| species correct | ≥ 0.97 | `animal` equals the label (dog, cat, other, none) |
| colours mean Jaccard | ≥ 0.75 | colour values (null = none) against the labelled colours, dogs and cats |
| true breed among the suggestions (pure breeds) | ≥ 0.6 | the labelled pure breed among the returned codes, any confidence |
| wrong breed suggested at confidence ≥ 0.6 | ≤ 0.1 | a dog or cat with a specific breed other than the label at ≥ 0.6 (`.mixed`/`.unknown` are safe fallbacks) |
| person_prominent recall | ≥ 0.9 | set on the photos labelled with a prominent person |
| p95 latency | ≤ 6 s | nearest-rank p95 of the call's wall time, every reply |
| refusals | ≤ 0.02 | refused / all photos |

Fields are scored on `ok` replies and refusals on all photos. A bar with no photo to score counts as missed. Mean cost per photo (usage × domains/ai/pricing.ts) and invalid replies are reported without a bar.

The switch, off by default: `EVAL_EXTRACT=anthropic` plus `ANTHROPIC_API_KEY` in the environment (never read from .env files). Before anything is sent, every file in `real/` needs a labels.json entry with its licence (CC0 1.0, CC BY <version> or owner-provided). Only photos without a recorded reply for that model and AI_PROMPT_VERSION are sent, through the production adapter and prompt. Replies are written after each photo, so a failed run resumes. `real/.gitignore` keeps the photos out of git; only labels.json and replies/ get committed.

Still open, owner-gated: AC#1 (the real photo set) and AC#3 (one paid run per model, results table, recommendation and the ADR-012 CHANGE).

What the owner must approve before the paid run:
1. The photo set source: at least 40 photos with the composition in the README (at least 2 dogs, 2 cats, 2 mixed breeds, 2 in poor light, 3 with a prominent person, 2 without an animal), each CC0 / CC BY with author and URL, or owner-provided pilot photos with the reporter's consent (the date in `source`).
2. Sending those photos, people in them included, to Anthropic on claude-haiku-5-5 and claude-sonnet-5-5 (the same request as production ai.extract).
3. The spend: about USD 0.40–0.50 in all on the owner's ANTHROPIC_API_KEY, run once in the main checkout (never in a worktree).
4. Committing `real/labels.json` and `real/replies/*.json` (the replies hold model descriptions and marks; no photo data).

Run (main checkout, PowerShell): `$env:EVAL_EXTRACT='anthropic'; $env:ANTHROPIC_API_KEY='<key>'; pnpm --filter api eval:extract --model claude-haiku-5-5; pnpm --filter api eval:extract --model claude-sonnet-5-5; Remove-Item Env:EVAL_EXTRACT, Env:ANTHROPIC_API_KEY`

CHANGE rows for backlog/changes.md. The classifier blocked writing to the main checkout from the worktree, so the lead should move these:

| - | - | docs/tech/adr/012-ai-attribute-extraction.md§Model decision | As built (TASK-40.5), how the gate bars are scored (apps/api/test/eval/extract/README.md): fields on `ok` replies, refusals on all photos; a bar with no photo to score counts as missed. Species = `animal` equals the label (dog/cat/other/none). Colours = mean Jaccard of the values (null = none) against the labelled colours, dogs and cats. "True breed among the suggestions" = the labelled pure breed among the returned codes at any confidence. "Wrong breed ≥ 0.6" = a dog or cat with a specific breed other than the label at ≥ 0.6 (`.mixed` and `.unknown` are the safe fallbacks, never wrong). p95 = nearest rank over the wall time of every call. Labels never use `.unknown`. Set minimum (AC#1): 40 photos, ≥ 2 dogs, 2 cats, 2 mixed breeds, 2 in poor light, 3 with a prominent person, 2 without an animal. Mean cost per photo and invalid replies are reported without a bar. | TASK-40.5 | open |
| - | - | docs/tech/backend.md§Commands | Add row: `pnpm --filter api eval:extract [--model <id>]`: extraction evaluation against the ADR-012 bars (per field, refusals, p95 latency, mean cost per photo); offline on the synthetic set with the mock adapter and the recorded replies in `test/eval/extract/real/replies/`; sends photos only with `EVAL_EXTRACT=anthropic` + `ANTHROPIC_API_KEY` (an owner-approved run); exit 1 when the real set misses a bar. See apps/api/test/eval/extract/README.md. | TASK-40.5 | open |
<!-- SECTION:NOTES:END -->
