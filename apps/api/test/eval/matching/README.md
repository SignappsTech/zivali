# Matching evaluation (TASK-43.3, C8 §Visual similarity 9)

`pnpm --filter api eval:matching` scores every lost × found/sighted pair of a labelled set with `scoreMatch` twice, v2 (no visual term) and v3 (with V), and prints a Markdown report. Offline by default: no network, no keys, no database.

- **Candidates**: same species, within `matching.max_distance_km` (30) and `matching.max_days` (30) either way (an approximation of the engine's candidate query, C8 §Engine 2). Reports with the same `animal` are the same animal (a positive). A **hard negative** is a different animal of the same species, size and colours.
- **recall@10**: lost reports whose animal is among their top 10 stored suggestions (score ≥ `matching.threshold`) / lost reports whose animal is in the set.
- **precision**: positives / pairs notified (strength ≥ `matching.notify_min_strength`, `good`); 0 when nothing is notified.
- **Gate**: shipped v3 (floor 0.70, ceiling 0.95, `VISUAL_WEIGHTS`) must not be worse than v2 on both. `eval.test.ts` runs it on the synthetic set in `pnpm verify`; the command exits 1 when it fails.
- **Sweep**: `visual_floor` 0.30…0.85, `visual_ceiling` floor + 0.05…1.00 (steps of 0.05), visual weight 0.2 / 0.3 / 0.4 (the other weights keep `VISUAL_WEIGHTS`' proportions). The band cut-offs stay at V 0.8 / 0.5 / 0.25, the same values as the veto lift and the evidence rule, so floor and ceiling place them in cosine (the report prints them). The best of the configurations not worse than v2 has the highest recall@10, then precision, then notified positives.
- **Geo-time fit** (TASK-43.1 review): for the best configuration the report compares scoreMatch's cap (< 3 km and < 72 h) with looser fits for V ≥ 0.8 (< 10 km and < 72 h, < 3 km any time, < 10 km any time, no cap). Recall@10 does not change; precision and notified positives do.

## Synthetic set (`synthetic.ts`)

60 lost animals (dogs and cats), each with one positive (the same animal found or sighted in another photo, described in one of six ways: complete and near, 5 km and 2 days, photo only, size two steps off, colour misnamed, 8 km and 100 h) and one look-alike. Photos are mock embedder labels `animal/view` (`labelledVector`, C20 §Adapter): the same animal is about 0.9 cosine, different animals about 0.1. The mock cannot make look-alikes look alike, so the synthetic set only guards against regressions; **its picks are not for C8**.

## Real-photo set (`real/`, not committed yet)

Placeholder until the owner approves a photo set and the run. Layout:

- `real/set.json`: `{ "photos": [{ "file", "licence", "source" }], "reports": [<report>] }`. A report is `{ id, type: lost|found|sighted, animal, species, x_km, y_km, hours, size, sex, colours, pattern, photos: [file] }` (position in km on a plane and event time in hours from the set's start; the attributes as a reporter would enter them). Every photo a report uses needs a `photos` entry with a licence and a source, or the run refuses the set.
- `real/<file>.jpg`: the photos, next to `set.json`. At least 50 positive pairs (the same animal in different photos) and 50 hard negatives.
- `real/vectors.json`: written by the run: `{ model, vectors: { <sha256 of the file>: number[1024] } }`. Committed, so later runs send nothing. Vectors of another `embedding.model` count as missing.

**The switch** (off by default): `EVAL_EMBED=voyage` with `VOYAGE_API_KEY` in the environment (the eval never reads `.env` files). Only photos without a cached vector are sent, as `photo.embed` sends them (≤ 1024 px JPEG, quality 80), one every 10 s (`embedding.backfill_per_minute`); the cache is written after each photo, so a failed run resumes. At 1024 px a photo is at most about 1,900 Voyage tokens (560 pixels per token), so 200 photos are about 0.4 M tokens.

```powershell
$env:EVAL_EMBED = 'voyage'; $env:VOYAGE_API_KEY = '<key>'; pnpm --filter api eval:matching
```

Without the switch, a set with missing vectors is reported as skipped. After the run: commit `real/`, put the report and the chosen values in the task notes, and record them with the date and the set in C8 §Visual similarity (a CHANGE).
