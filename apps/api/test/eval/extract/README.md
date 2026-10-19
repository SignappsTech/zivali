# Extraction evaluation (TASK-40.5, ADR-012 §Model decision)

`pnpm --filter api eval:extract [--model <id>]` (default `claude-haiku-5-5`) scores one reply per labelled photo against the ADR-012 bars and prints a Markdown report: per-field results, refusal rate, p95 latency and mean cost per photo. Offline by default: no network, no key, no database. `eval.test.ts` runs the mechanics in `pnpm verify` (synthetic set on the mock adapter, recorded replies, the switch). The command exits 1 when the real set misses a bar.

## Bars (ADR-012 §Model decision, 2026-10-18)

Haiku stays `AI_VISION_MODEL` when it meets every bar; otherwise ADR-012 moves it to `claude-sonnet-5-5` (config only, a recorded decision). Fields are scored on `ok` replies; refusals on all photos. A bar with no photo to score it on counts as missed.

| field                                          | bar    | scored as                                                                                                                       |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| species correct                                | ≥ 0.97 | `animal` equals the label (dog, cat, other, none)                                                                               |
| colours mean Jaccard                           | ≥ 0.75 | colour values (null = none) against the labelled colours, dogs and cats                                                         |
| true breed among the suggestions (pure breeds) | ≥ 0.6  | the labelled pure breed among the returned codes, any confidence                                                                |
| wrong breed suggested at confidence ≥ 0.6      | ≤ 0.1  | dogs and cats with a specific breed other than the label at ≥ 0.6 (`.mixed` and `.unknown` are the safe fallbacks, never wrong) |
| `person_prominent` recall                      | ≥ 0.9  | set on the photos labelled with a prominent person                                                                              |
| p95 latency                                    | ≤ 6 s  | nearest-rank p95 of the call's wall time, every reply                                                                           |
| refusals                                       | ≤ 0.02 | `refused` / all photos                                                                                                          |

Mean cost per photo is `usage` × `domains/ai/pricing.ts`, shown against NFR-AI (EUR 0.05 per 5-photo report); it has no ADR-012 bar. Invalid replies are counted, with no bar.

## Synthetic set (`synthetic.ts`)

42 labels with the composition below, keyed by made-up hashes for the mock adapter (C19 §Mock): three carry the fixture hashes of `test/fixtures/ai/index.json` (refusal, invalid, person), the rest get the mock's derived reply (always a black and white dog). The mock never looks at a photo: **its results are not for ADR-012**, they only show the report works.

## Real-photo set (`real/`, waiting for the owner)

**Rule (TASK-40.11, lead decision):** no pilot photo created on or before `ai.photos_since` (the AI switch-on, deploy/README.md §11) is ever sent; the paid evals TASK-40.9 and TASK-43.7 need the owner's sign-off on the photo set.

- `real/labels.json`: `{ "photos": [{ file, licence, source, animal, breed, colours, person_prominent, poor_light }] }`. `licence` is `CC0 1.0`, `CC BY <version>` (e.g. `CC BY 4.0`) or `owner-provided`; `source` is the URL and author, or the pilot report and the reporter's consent date. `animal` is `dog`, `cat`, `other` or `none`; a dog or cat has its breed code (`<species>.mixed` when not a pure breed; never `.unknown`) and 1 to 3 colours (C4 codes); otherwise `breed` is null and `colours` empty.
- At least 40 photos, at least 2 dogs, 2 cats, 2 mixed breeds, 2 in poor light, 3 with a prominent person and 2 without an animal (`LabelSet` refuses less). Aim for about half dogs and half cats, and at least 15 pure breeds, so the breed bars mean something.
- `real/<file>` (JPEG, PNG or WebP) next to `labels.json`. **Photos are never committed**: `real/.gitignore` lets only `labels.json` and `replies/` into git.
- `real/replies/<model>.json`: written by the run, `{ model, prompt_version, replies: { <file>: { sha256, outcome, input_tokens, output_tokens, latency_ms, extraction? } } }`. Committed, so later runs send nothing. Replies of another `AI_PROMPT_VERSION`, or of a photo whose file changed, count as missing; a photo that is not there (another checkout) keeps its recorded reply.

**The switch** (off by default): `EVAL_EXTRACT=anthropic` with `ANTHROPIC_API_KEY` in the environment (the eval never reads `.env` files). Before anything is sent, every file in `real/` must have a `labels.json` entry with its licence, and every photo without a reply must be there. Only photos without a recorded reply for that model and prompt version are sent, one at a time, through the production adapter (`adapters/ai/anthropic.ts`: same prompt, structured output, effort low, no SDK retries) as `ai.extract` sends them (upright, ≤ 1024 px, JPEG quality 80, no metadata). The replies file is written after each photo, so a failed run resumes; a rejected request (bad key, unknown model) stops the run. About 40 photos × 2 models ≈ USD 0.40 (ADR-012 table).

```powershell
$env:EVAL_EXTRACT = 'anthropic'; $env:ANTHROPIC_API_KEY = '<key>'
pnpm --filter api eval:extract --model claude-haiku-5-5
pnpm --filter api eval:extract --model claude-sonnet-5-5
Remove-Item Env:EVAL_EXTRACT, Env:ANTHROPIC_API_KEY
```

Without the switch, a set with missing replies is reported as skipped. After the run: commit `real/labels.json` and `real/replies/`, put both reports and the recommendation in the TASK-40.5 notes, and record the outcome with the date and the set in ADR-012 §Model decision (a CHANGE).
