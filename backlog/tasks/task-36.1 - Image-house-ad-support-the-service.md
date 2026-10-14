---
id: TASK-36.1
title: 'Image: house ad, support the service'
status: To Do
assignee:
  - '@image-generator'
created_date: '2026-10-14 21:50'
labels:
  - image
  - 'est:XS'
dependencies: []
references:
  - docs/design/system.md
parent_task_id: TASK-36
priority: medium
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Brief. Purpose: House ad creative (4:3, crop-safe to 1:1 at the centre) for "keep the service free" (P21). Size: 1200x900 px (4:3 where stated), PNG. File name: assets/house-ad-support.png. Content: a simple heart shape in sun yellow resting on soft lagoon hills, a small dotted trail beneath. Keep the key shape inside the central square so a 1:1 crop still works. Style: flat geometric illustration in the Najdimo palette (lagoon teal #145360, lagoon tints #D3ECEE and #EBF6F7, mist #E8EEEE, sun yellow #F7B32B as the only warm accent). Soft shapes, no outlines, no gradients, no shadows, no text, no faces, no animals or people, nothing photographic. Calm, warm and hopeful. Avoid: text or numbers in the image, cartoon or cute characters, sad-pet clichés, purple or neon colours, heavy texture, anything that could be mistaken for a real report photo. Decorative image, so alt text is empty unless the page slice says otherwise.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the brief, when the image is generated, then assets/house-ad-support.png exists at 1200x900 px and is visually reviewed against the style rules (palette, flat shapes, no text, no faces).
- [ ] #2 Given the image on a mist (#E8EEEE) page and on the dark teal page background, when previewed, then it remains legible and in the Najdimo palette in both.
- [ ] #3 Given the file, when handed over, then the task notes include a suggested alt text (or the instruction to use an empty alt for a decorative image).
<!-- AC:END -->
