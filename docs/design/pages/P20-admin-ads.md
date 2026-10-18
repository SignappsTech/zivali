---
source: 03§P20
page: P20 Admin ad management
stories: TASK-37 (FR-031)
platforms: web
version: 1.1
mockup: docs/design/mockups/P20-admin-ads.html
copy: docs/content/pages/P20-admin-ads.md
---

# P20 Admin ad management

## Purpose

The admin creates, schedules and reviews ads by hand, sees results, manages the three house ads, and every change is audit-logged. Uses the admin shell (P19) and the placement components (P21) for previews.

## Ads list

Table pattern from P19. Columns: preview thumbnail, title, status word (Draft, Scheduled, Running, Ended, Paused, Deleted), slots, targeting summary (regions, species), dates. Impressions, clicks and CTR columns are added when C14 has totals (not in the as-built list). Filters: status, slot, region, species; they work on the loaded pages, and there is no search field (no copy, no API search). Status words beyond the first four: "Ustavljen" with a pause icon for a paused ad (house ads switched off) and "Izbrisan" with a trash-simple icon for a soft-deleted ad kept for its statistics (its title still opens it), shown in foreground and muted words (CH-394). "Preverjanje slike" (image check) has no API state and is not shown (CH-479). Primary `lg` "New ad". Row actions: Edit, Duplicate, End now, Delete (soft, confirmed).

## Create and edit (single page, sections stacked, no cards)

1. **Creative:** image upload (drop area), required **alt text** field right under it, title (max 60), text (max 120), https link with a visible "opens in a new tab" note.
2. **Where:** slots as toggle pills (Feed, Detail, Reunited, Sidebar); languages (SL, EN) pills.
3. **Who:** region multi-select (12 regions) and municipality search (212), species pills (Dogs, Cats), empty selections mean "all".
4. **When:** start and end date fields; status select (Draft, Scheduled). Exclusive slot checkbox.
5. **Live preview** (sticky right column on `lg`): switch between the four slot previews using the P21 components, in SL and EN, light and dark.

Sticky footer with primary "Save", text "Save as draft" and "Cancel". Unsaved-changes dialog.

### Validation (inline, on blur and on save)

Missing alt text, non-https link, image not the required format (see P21), overlapping dates in an exclusive slot (names the conflicting ad), end before start, text too long. The first error receives focus.

## Ad detail and statistics

- Header: title, status word, quick actions.
- Totals as plain numbers (Impressions, Clicks, CTR), date range select, line chart by day (`chart-1`, direct labels, data table alternative below).
- Breakdown tables by slot and by region (values under 5 shown as "< 5").
- **CSV export** button (text) and a note describing the counting method (aggregate, cookieless, rendered counts, not viewability).
- **History**: audit entries for this ad (who, when, what).

## House ads

A short list of the three house ads (support, partner with us, adopt) with preview, text, link target and status; edit uses the same form with locked slots (all) and no targeting. As built (TASK-37.3, CH-479): each house ad is one language, enabled by its own "Prikazuj" switch (status active or paused). The admin shell's breadcrumb has two levels (Konzola > Oglasi) on the list, not the third level "Nov oglas" the mockup draws.

## States

Empty list with a primary "New ad"; loading skeleton; upload failure with retry; end-now confirmation; saved toast with "Logged"; ended ads read only; conflicting-date error; unsaved changes.

## Responsive and accessibility

Desktop first; form single column below `lg` with the preview as a sheet. Image drop has a keyboard "Choose file" button; alt text field has help text explaining screen reader use; charts have table alternatives; status is a word; dates use native pickers.

## Assets

None.

## Mockup scope (`P20-admin-ads.html`)

1. List with mixed statuses, empty, loading.
2. Create form complete, with each validation error, with the live preview in all four slots (SL, EN).
3. Detail with statistics, CSV note, history.
4. House ads manager.
5. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-394, CH-479: status words and list as built, house ads |
