// Shared by the T5/T6 server pages and the search (client), so not in a 'use client' module.

/** System §10.6 note: muted surface, radius 20, icon 22 + text 15/22. */
export const noteClass = 'flex gap-3 rounded-row bg-muted px-[18px] py-4 text-control leading-[22px]';

/** Shelter name links (answer card, rows): foreground, underlined on hover, 44 px target. */
export const titleLinkClass =
	'inline-flex min-h-11 items-center rounded-lg underline-offset-4 hover:underline hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';
