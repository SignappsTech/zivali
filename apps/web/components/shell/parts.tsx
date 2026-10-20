'use client';

import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ComponentProps, Fragment, type KeyboardEvent, type ReactNode } from 'react';

import { routeTemplate } from '@/components/analytics/screen-views';
import { useRoute } from '@/i18n/client-navigation';
import { localisedPath } from '@/i18n/route';
import { routing } from '@/i18n/routing';
import { useLocaleSwitch } from '@/i18n/use-locale-switch';

import type { LanguageLabels } from './page';

// The client islands of the P1 shell. Header and footer are server components, so their icons, buttons and the
// tailwind-merge behind `cn` never ship to the browser; these parts need the current route or the browser. Native
// popovers and dialogs instead of a menu library: top layer, light dismiss, Escape and focus return come with them.
// No next-intl here: the route comes from @/i18n/client-navigation and the strings from the server components that render these
// parts, so the shell ships no intl runtime (TASK-90.7).

// The header's inbox dot, signed in only: it brings the Redux store, so it loads with its first use instead of with
// every page's shell (TASK-90.5).
export const InboxDot = dynamic(() => import('@/components/notifications/unread-dot').then((m) => m.UnreadDotIsland));

// P1 Flow variant (reduced header, one-row footer, no sidebar): the C15 report, manage, auth, chat and payment flows.
const FLOW = new Set([
	'/report/lost',
	'/report/found',
	'/m',
	'/sign-in',
	'/sign-up',
	'/reset-password',
	'/inbox/[id]',
	'/payments/return',
]);
// Pages whose content has its own primary action, so "Prijavi" is secondary there (system 10.7): P3 home hero, the
// closing rows of How it works and For shelters, T5/T6 shelters, P9 report detail, P22 partners.
const OWN_PRIMARY = new Set([
	'/',
	'/how-it-works',
	'/for-shelters',
	'/shelters',
	'/shelters/[slug]',
	'/r/[code]',
	// P11 match review ("To je moja žival").
	'/r/[code]/matches',
	'/advertise',
]);

/** P1 layout variant of an internal pathname. Admin and portal (P19) and the dev galleries bring their own shell. */
export function shellVariant(pathname: string): 'content' | 'flow' | 'none' {
	if (/^\/(admin|portal|dev)(\/|$)/.test(pathname)) return 'none';
	return FLOW.has(routeTemplate(pathname)) ? 'flow' : 'content';
}

/** Renders its children on pages of `variant` only: the layout, and so the shell, stays mounted across navigations. */
export function ShellSlot({ variant, children }: { variant: 'content' | 'flow'; children: ReactNode }) {
	return shellVariant(useRoute().pathname) === variant ? children : null;
}

/**
 * Links (localised on the server) with `aria-current="page"` on the current one. Links can share a route and differ
 * by the `type` filter (P4: Izgubljene `?type=lost`, Najdene `?type=found`): the one with the URL's `type` is current,
 * else the one without (Zemljevid for no or several types). The drawer changes `type` in the URL, so this follows it.
 */
export function NavLinks({
	links,
	className,
	linkClassName,
}: {
	links: { href: string; label: string; route?: string; type?: string }[];
	className?: string;
	linkClassName: string;
}) {
	const route = routeTemplate(useRoute().pathname);
	const type = useSearchParams().get('type') ?? undefined;
	const onRoute = links.filter((link) => link.route === route);
	const current = onRoute.find((link) => link.type === type) ?? onRoute.find((link) => !link.type);

	return (
		<ul className={className}>
			{links.map((link) => (
				<li key={link.href}>
					<NextLink
						href={link.href}
						aria-current={link === current ? 'page' : undefined}
						className={linkClassName}
					>
						{link.label}
					</NextLink>
				</li>
			))}
		</ul>
	);
}

/**
 * A header button. With `looks` ([primary, secondary] classes) it is "Prijavi", secondary on pages with their own
 * primary action; with `dialog` it opens that native dialog.
 */
export function ShellButton({
	looks,
	dialog,
	className,
	...props
}: ComponentProps<'button'> & { looks?: [string, string]; dialog?: string }) {
	const secondary = OWN_PRIMARY.has(routeTemplate(useRoute().pathname));

	return (
		<button
			type="button"
			{...props}
			data-variant={looks && (secondary ? 'secondary' : 'default')}
			className={looks ? looks[secondary ? 1 : 0] : className}
			onClick={dialog ? () => document.querySelector<HTMLDialogElement>(`#${dialog}`)?.showModal() : undefined}
		/>
	);
}

const rows = (popover: HTMLElement) =>
	[...popover.querySelectorAll<HTMLElement>('a[href], button')].filter((row) => row.checkVisibility());

/** Arrow keys, Home and End move between the rows of a popover. */
function moveFocus(event: KeyboardEvent<HTMLElement>) {
	const all = rows(event.currentTarget);
	const index = all.indexOf(document.activeElement as HTMLElement);
	const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: all.length - 1 }[event.key];
	if (next === undefined) return;
	event.preventDefault();
	all[(next + all.length) % all.length]?.focus();
}

/**
 * Header popover (P1 A2, B2) for the button with `popoverTarget={id}`: under the button, aligned to its end, focus on
 * the first row, arrow keys between rows. A followed link closes it.
 */
export function HeaderPopover({ id, ...props }: ComponentProps<'div'> & { id: string }) {
	return (
		<div
			{...props}
			id={id}
			role="group"
			popover="auto"
			onBeforeToggle={(event) => {
				const rect = document.querySelector(`[popovertarget="${id}"]`)?.getBoundingClientRect();
				if (event.newState !== 'open' || !rect) return;
				event.currentTarget.style.top = `${rect.bottom + window.scrollY + 12}px`;
				event.currentTarget.style.right = `${Math.max(20, document.documentElement.clientWidth - rect.right)}px`;
			}}
			onToggle={(event) => {
				if (event.newState === 'open') rows(event.currentTarget)[0]?.focus();
			}}
			onKeyDown={moveFocus}
			onClick={(event) => {
				if ((event.target as Element).closest('a')) event.currentTarget.hidePopover();
			}}
		/>
	);
}

/**
 * Native modal dialog (the menu and report sheets): focus stays inside, Escape and a `<form method="dialog">` button
 * close it, focus returns to the opener. A click on the backdrop or a followed link closes it too.
 */
export function ShellDialog(props: ComponentProps<'dialog'>) {
	return (
		<dialog
			{...props}
			onClick={(event) => {
				if (event.target === event.currentTarget || (event.target as Element).closest('a'))
					event.currentTarget.close();
			}}
		/>
	);
}

/** Footer "Cookie settings": reopens the P17 consent banner in its Customise view (withdrawal as easy as giving). */
export function CookieSettingsButton(props: ComponentProps<'button'>) {
	return (
		<button
			type="button"
			aria-haspopup="dialog"
			{...props}
			onClick={() => window.dispatchEvent(new Event('zz:cookie-settings'))}
		/>
	);
}

/**
 * Signs out on this device: GoTrue revokes this session on the server (`/logout`, scope local) and supabase-js
 * deletes the session cookies, so the server pages see a visitor; then home loads afresh, so no state of the
 * signed-out user stays in memory (C3). First the report, pet and photo drafts of this browser go (CH-401).
 */
export function SignOutButton(props: ComponentProps<'button'>) {
	const { locale } = useRoute();

	return (
		<button
			type="button"
			{...props}
			onClick={async () => {
				try {
					const idb = await import('idb-keyval');
					await idb.delMany((await idb.keys()).filter((key) => /^(draft|photos):/.test(String(key))));
				} catch {
					// No IndexedDB here (nothing was kept), or its chunk failed offline: the sign-out still goes ahead.
				}
				const { createClient } = await import('@/lib/supabase/client');
				await createClient().auth.signOut({ scope: 'local' });
				window.location.assign(localisedPath({ locale, href: '/' }));
			}}
		/>
	);
}

/**
 * Text toggle "SL / EN" (or the full names), current language underlined. Plain links to the same page in each
 * language (hreflang, works without JS); with JS a click goes through useLocaleSwitch, which saves a signed-in user's
 * profile locale first (FR-036). `labels` come from useLanguageLabels (./page.tsx) where the switch is rendered.
 */
export function LanguageSwitch({
	labels,
	full = false,
	className = '',
}: {
	labels: LanguageLabels;
	full?: boolean;
	className?: string;
}) {
	const { locale, switchLocale } = useLocaleSwitch();
	const { pathname, params } = useRoute();

	return (
		<div
			role="group"
			aria-label={labels.label}
			className={`inline-flex flex-wrap items-center text-control font-semibold text-muted-foreground ${className}`}
		>
			{routing.locales.map((next, index) => (
				<Fragment key={next}>
					{index > 0 && (
						<span aria-hidden="true" className={full ? 'px-1' : undefined}>
							/
						</span>
					)}
					<a
						// The page's own URL in that language (SL unprefixed); the switch itself prefixes /sl (useLocaleSwitch).
						href={localisedPath({ locale: next, href: { pathname, params } })}
						lang={next}
						hrefLang={next}
						aria-current={next === locale ? 'true' : undefined}
						aria-label={full ? undefined : `${labels.short[next]} – ${labels.full[next]}`}
						onClick={(event) => {
							if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
							event.preventDefault();
							void switchLocale(next);
						}}
						className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-1.5 whitespace-nowrap hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=true]:text-foreground aria-[current=true]:underline aria-[current=true]:decoration-primary aria-[current=true]:decoration-2 aria-[current=true]:underline-offset-6"
					>
						{labels[full ? 'full' : 'short'][next]}
					</a>
				</Fragment>
			))}
		</div>
	);
}
