import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/** Locale-aware Link, redirect and router: `<Link href="/map">` renders /zemljevid in SL and /en/map in EN. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
