---
id: TASK-3.14
title: 'Image: mobile app icon and adaptive icon'
status: To Do
assignee:
  - '@image-generator'
created_date: '2026-10-15 01:52'
labels:
  - image
  - 'est:XS'
dependencies: []
references:
  - docs/design/system.md
parent_task_id: TASK-3
ordinal: 300000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Brief (CH-31, from TASK-3.4). Purpose: app launcher icon and Android adaptive icon foreground for the mobile app. Size: 1024x1024 px PNG icon (assets/app-icon.png) and a 1024x1024 transparent foreground with the mark inside the central 66 percent safe zone (assets/app-icon-foreground.png); background colour lagoon teal #145360. Content: a simple geometric mark, a dotted trail ending at a house shape with one lit window in sun yellow #F7B32B (same motif family as the reunited illustration). Style: flat, no outlines, no gradients, no shadows, no text, no animals or faces. Avoid: text, photographic detail, purple or neon colours. The design lead reviews the brief wording before generation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 assets/app-icon.png and assets/app-icon-foreground.png exist at 1024x1024 px, the mark stays inside the adaptive-icon safe zone and is legible at 48 px on light and dark launchers.
- [ ] #2 The task notes list the files and the background colour for app.config.ts; the mobile scaffold owner wires them.
<!-- AC:END -->
