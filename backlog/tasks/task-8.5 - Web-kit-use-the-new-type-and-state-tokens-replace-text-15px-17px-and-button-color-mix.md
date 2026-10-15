---
id: TASK-8.5
title: >-
  Web kit: use the new type and state tokens (replace text-[15px]/[17px] and
  button color-mix)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 04:12'
updated_date: '2026-10-15 04:48'
labels:
  - fe
  - 'est:XS'
  - trivial
milestone: m-0
dependencies: []
references:
  - docs/design/system.md
  - docs/design/tokens.json
  - apps/web/components/ui/button.tsx
parent_task_id: TASK-8
ordinal: 311000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tokens 0.5.2 (CH-95) add type steps text-control (15/20) and text-control-lg (17/24) and button state colours bg-primary-hover, bg-primary-pressed, bg-secondary-hover, bg-secondary-pressed, bg-destructive-hover, bg-destructive-pressed. Swap the arbitrary values in the web kit for them. Files: components/ui/{button,label,radio-group,sonner,tabs}.tsx and app/[locale]/dev/kit/kit.tsx. Rebuild packages/tokens first (pnpm build).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No text-[15px] or text-[17px] left in apps/web; text-control and text-control-lg used instead
- [ ] #2 button.tsx has no color-mix; hover uses *-hover, active uses *-pressed for default, secondary (and outline) and destructive; ghost/text hover unchanged
- [ ] #3 typecheck, lint and tests pass; /dev/kit looks unchanged apart from the calmer state shifts
<!-- AC:END -->
