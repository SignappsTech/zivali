/**
 * How report and pet photos sit in their frames (TASK-114.43). Owner photos are mostly portrait phone shots with the
 * animal's head in the upper part, and a centre crop in a 4:3 or 1:1 frame cut the head off.
 */

/** Where a cover crop anchors: centred across, near the top (CSS `object-position`, also for next/og images). */
export const PHOTO_FOCUS = '50% 10%';

/** Cards, rows, thumbnails and map markers: the frame stays filled and the crop keeps the head in view. */
export const photoCrop = 'object-cover object-[50%_10%]';

/** Report detail, galleries and other full views: the whole photo, letterboxed on the frame's `bg-muted`. */
export const photoWhole = 'object-contain';
