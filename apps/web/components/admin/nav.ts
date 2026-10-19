import type { Icon } from '@phosphor-icons/react';
import { AddressBookIcon } from '@phosphor-icons/react/dist/ssr/AddressBook';
import { BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import { FlagIcon } from '@phosphor-icons/react/dist/ssr/Flag';
import { GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { ImageSquareIcon } from '@phosphor-icons/react/dist/ssr/ImageSquare';
import { ListChecksIcon } from '@phosphor-icons/react/dist/ssr/ListChecks';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { TrayIcon } from '@phosphor-icons/react/dist/ssr/Tray';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import type messages from '@zivali/i18n/dist/sl.json';
import type { UserRole } from '@zivali/types';

export type StaffRole = Extract<UserRole, 'MODERATOR' | 'ADMIN'>;

type AdminKey = keyof (typeof messages)['admin'];

const STAFF: readonly StaffRole[] = ['MODERATOR', 'ADMIN'];
const ADMIN: readonly StaffRole[] = ['ADMIN'];

/** A built page (its own route folder) or a `section` of /admin/[section], which shows "Kmalu" until it is built. */
export type AdminItem = { key: Extract<AdminKey, `nav_${string}`>; Icon: Icon; roles: readonly StaffRole[] } & (
	| {
			href:
				| '/admin'
				| '/admin/abuse-reports'
				| '/admin/audit-log'
				| '/admin/shelters'
				| '/admin/ads'
				| '/admin/house-ads'
				| '/admin/enquiries';
			section?: never;
	  }
	| { section: string; href?: never }
);

/**
 * P19 sidebar, filtered by role; also the access rule of each page (the API enforces it again, C3). The task that
 * builds a section adds its route and pathname and swaps `section` for `href`.
 */
export const ADMIN_NAV: { key: Extract<AdminKey, `group_${string}`>; items: AdminItem[] }[] = [
	{ key: 'group_overview', items: [{ key: 'nav_dashboard', Icon: SquaresFourIcon, roles: STAFF, href: '/admin' }] },
	{
		key: 'group_content',
		items: [
			{ key: 'nav_ads', Icon: ImageSquareIcon, roles: ADMIN, href: '/admin/ads' },
			{ key: 'nav_house_ads', Icon: PawPrintIcon, roles: ADMIN, href: '/admin/house-ads' },
		],
	},
	{
		key: 'group_safety',
		items: [
			{ key: 'nav_moderation', Icon: ListChecksIcon, roles: STAFF, section: 'moderation' },
			{ key: 'nav_abuse', Icon: FlagIcon, roles: STAFF, href: '/admin/abuse-reports' },
		],
	},
	{
		key: 'group_orgs',
		items: [
			{ key: 'nav_verification', Icon: SealCheckIcon, roles: ADMIN, section: 'verification' },
			{ key: 'nav_organisations', Icon: BuildingsIcon, roles: ADMIN, section: 'organisations' },
			{ key: 'nav_directory', Icon: AddressBookIcon, roles: ADMIN, href: '/admin/shelters' },
		],
	},
	{ key: 'group_people', items: [{ key: 'nav_users', Icon: UsersIcon, roles: ADMIN, section: 'users' }] },
	{
		key: 'group_business',
		items: [
			{ key: 'nav_enquiries', Icon: TrayIcon, roles: ADMIN, href: '/admin/enquiries' },
			{ key: 'nav_vet_partners', Icon: StethoscopeIcon, roles: ADMIN, section: 'vet-partners' },
		],
	},
	{
		key: 'group_system',
		items: [
			{ key: 'nav_audit', Icon: ClockCounterClockwiseIcon, roles: ADMIN, href: '/admin/audit-log' },
			{ key: 'nav_settings', Icon: GearSixIcon, roles: ADMIN, section: 'settings' },
		],
	},
];

const ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/** Internal pathname of an item (next-intl `usePathname()`, no locale). */
export const itemPath = (item: AdminItem) => item.href ?? `/admin/${item.section}`;

/** Link target: the page's own pathname, or /admin/[section] for a section that is not built yet. */
export const itemHref = (item: AdminItem) =>
	item.section === undefined
		? item.href
		: ({ pathname: '/admin/[section]', params: { section: item.section } } as const);

/** The item a page belongs to (its own path or below it); none for an unlisted admin path. */
export function adminItem(pathname: string): AdminItem | undefined {
	return ITEMS.find((item) => {
		const path = itemPath(item);
		return pathname === path || (path !== '/admin' && pathname.startsWith(`${path}/`));
	});
}

/** Unlisted admin paths are admin only: a new page is never open to moderators by accident. */
export const canOpen = (pathname: string, role: StaffRole) => (adminItem(pathname)?.roles ?? ADMIN).includes(role);

/** Sections without a page yet (/admin/[section]). */
export const comingSection = (section: string) => ITEMS.find((item) => item.section === section);
