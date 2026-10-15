'use client';

import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { type ComponentProps, Fragment, type KeyboardEvent, type ReactNode } from 'react';

import { routeTemplate } from '@/components/analytics/screen-views';
import { getPathname, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocaleSwitch } from '@/i18n/use-locale-switch';

// The client islands of the P1 shell. Header and footer are server components, so their icons, buttons and the
// tailwind-merge behind `cn` never ship to the browser; these parts need the current route or the browser. Native
// popovers and dialogs instead of a menu library: top layer, light dismiss, Escape and focus return come with them.

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
// Pages whose content has its own primary action, so "Prijavi" is secondary there (system 10.7): P3 home hero,
// T5/T6 shelters, P9 report detail, P22 partners.
const OWN_PRIMARY = new Set(['/', '/shelters', '/shelters/[slug]', '/r/[code]', '/advertise']);

/** P1 layout variant of an internal pathname. Admin and portal (P19) and the dev galleries bring their own shell. */
export function shellVariant(pathname: string): 'content' | 'flow' | 'none' {
	if (/^\/(admin|portal|dev)(\/|$)/.test(pathname)) return 'none';
	return FLOW.has(routeTemplate(pathname)) ? 'flow' : 'content';
}

/** Renders its children on pages of `variant` only: the layout, and so the shell, stays mounted across navigations. */
export function ShellSlot({ variant, children }: { variant: 'content' | 'flow'; children: ReactNode }) {
	return shellVariant(usePathname()) === variant ? children : null;
}

/** Links (localised on the server) with `aria-current="page"` on the current route. */
export function NavLinks({
	links,
	className,
	linkClassName,
}: {
	links: { href: string; label: string; route?: string }[];
	className?: string;
	linkClassName: string;
}) {
	const route = routeTemplate(usePathname());

	return (
		<ul className={className}>
			{links.map((link) => (
				<li key={link.href}>
					<NextLink
						href={link.href}
						aria-current={link.route === route ? 'page' : undefined}
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
	const secondary = OWN_PRIMARY.has(routeTemplate(usePathname()));

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
 * signed-out user stays in memory (C3).
 */
export function SignOutButton(props: ComponentProps<'button'>) {
	const locale = useLocale();

	return (
		<button
			type="button"
			{...props}
			onClick={async () => {
				const { createClient } = await import('@/lib/supabase/client');
				await createClient().auth.signOut({ scope: 'local' });
				window.location.assign(getPathname({ locale, href: '/' }));
			}}
		/>
	);
}

/**
 * Text toggle "SL / EN" (or the full names), current language underlined. Plain links to the same page in each
 * language (hreflang, works without JS); with JS a click goes through useLocaleSwitch, which saves a signed-in user's
 * profile locale first (FR-036).
 */
export function LanguageSwitch({ full = false, className = '' }: { full?: boolean; className?: string }) {
	const t = useTranslations('nav');
	const { locale, switchLocale } = useLocaleSwitch();
	const pathname = usePathname();
	const params = useParams();

	return (
		<div
			role="group"
			aria-label={t('language_label', { current: t(`language_${locale}_full`) })}
			className={`inline-flex items-center text-control font-semibold text-muted-foreground ${className}`}
		>
			{routing.locales.map((next, index) => (
				<Fragment key={next}>
					{index > 0 && (
						<span aria-hidden="true" className={full ? 'px-1' : undefined}>
							/
						</span>
					)}
					<a
						// The page's own URL in that language (SL unprefixed); next-intl's Link would prefix /sl for the switch.
						// @ts-expect-error -- params always belong to the current pathname (next-intl locale switcher pattern).
						href={getPathname({ locale: next, href: { pathname, params } })}
						lang={next}
						hrefLang={next}
						aria-current={next === locale ? 'true' : undefined}
						aria-label={full ? undefined : t(`language_${next}_full`)}
						onClick={(event) => {
							if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
							event.preventDefault();
							void switchLocale(next);
						}}
						className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-1.5 whitespace-nowrap hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=true]:text-foreground aria-[current=true]:underline aria-[current=true]:decoration-primary aria-[current=true]:decoration-2 aria-[current=true]:underline-offset-6"
					>
						{t(full ? `language_${next}_full` : `language_${next}`)}
					</a>
				</Fragment>
			))}
		</div>
	);
}
