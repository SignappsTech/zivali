'use client';

import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { GlobeSimpleIcon } from '@phosphor-icons/react/dist/ssr/GlobeSimple';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { TrayIcon } from '@phosphor-icons/react/dist/ssr/Tray';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { type Locale, useLocale, useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import { type ComponentProps, type KeyboardEvent, type MouseEvent, type ToggleEvent, useRef, useState } from 'react';

import { routeTemplate } from '@/components/analytics/screen-views';
import { Button } from '@/components/ui/button';
import { overlayClass } from '@/components/ui/dialog';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getPathname, Link, usePathname } from '@/i18n/navigation';
import type { Viewer } from '@/lib/viewer';

import { ringClass } from './page';
import { LanguageSwitch, Logo, shellVariant } from './parts';

type Href = ComponentProps<typeof Link>['href'];

// Pages whose content has its own primary action, so "Prijavi" is secondary there (system 10.7): P3 home hero,
// T5/T6 shelters, P9 report detail, P22 partners.
const OWN_PRIMARY = new Set(['/', '/shelters', '/shelters/[slug]', '/r/[code]', '/advertise']);

// TODO(TASK-31.4): C15 has no map filter query yet; `type` uses the C4 report types.
const LINKS = (signedIn: boolean) =>
	[
		['/map', 'map'],
		[{ pathname: '/map', query: { type: 'lost' } }, 'lost'],
		[{ pathname: '/map', query: { type: 'found' } }, 'found'],
		signedIn ? (['/my-pets', 'my_pets_reports'] as const) : (['/how-it-works', 'how_it_works'] as const),
	] as const;

// The sighted row starts the found flow too: its first question is whether the animal is with you (P7, C4 `sighted`).
const REPORT = [
	{ key: 'report_lost', href: '/report/lost', Icon: MegaphoneIcon, tone: 'text-status-lost-subtle-foreground' },
	{ key: 'report_found', href: '/report/found', Icon: HandHeartIcon, tone: 'text-status-found-subtle-foreground' },
	{ key: 'report_sighted', href: '/report/found', Icon: EyeIcon, tone: 'text-status-sighted-subtle-foreground' },
] as const;

const ACCOUNT = [
	['/account', 'account_profile', UserCircleIcon],
	['/account/alerts', 'account_alerts', BellIcon],
	['/account/payments', 'account_payments', CreditCardIcon],
] as const;

const navLinkClass = `inline-flex min-h-11 items-center rounded-full px-3 font-semibold whitespace-nowrap text-muted-foreground hover:bg-foreground/10 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 ${ringClass}`;
// System 10.9 menu: popover, radius 20, 8 px padding, shadow-pop; rows 48 px, icon 20, 16 semibold.
const popoverClass =
	'absolute inset-auto m-0 max-w-[calc(100vw-40px)] border-0 bg-popover p-2 text-popover-foreground shadow-pop';
const menuRowClass = `flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-semibold text-foreground hover:bg-foreground/10 [&_svg]:size-5 [&_svg]:shrink-0 ${ringClass}`;
// System 10.4 choice row as a menu row (caret instead of check), on `background` inside a popover or card sheet.
const choiceClass = `flex min-h-16 w-full cursor-pointer items-center gap-3.5 rounded-row bg-background px-5 py-3 text-left text-foreground transition-transform duration-[80ms] hover:bg-[linear-gradient(hsl(var(--foreground)/0.1),hsl(var(--foreground)/0.1))] active:scale-[0.98] active:bg-accent motion-reduce:transition-none motion-reduce:active:scale-100 ${ringClass}`;
const separatorClass = 'mx-3 my-1.5 h-px bg-border';

/** Signs out on this device, then reloads home, so no state of the signed-out user stays in memory (C3). */
async function signOut(locale: Locale) {
	// TODO(TASK-9.3): @zivali/api/auth signOut() with the push-token cleanup once configureAuth runs app-wide.
	const { createClient } = await import('@/lib/supabase/client');
	await createClient().auth.signOut({ scope: 'local' });
	window.location.assign(getPathname({ locale, href: '/' }));
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
 * Header popover (P1 A2, B2) on the native Popover API: top layer, light dismiss, Escape closes it and returns focus
 * to its button. It opens under the button, aligned to its end, with focus on the first row. The header stays mounted
 * across navigations, so a followed link closes it.
 */
function usePopover(id: string) {
	const trigger = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);

	return {
		trigger: { ref: trigger, popoverTarget: id, 'aria-expanded': open },
		popover: {
			id,
			popover: 'auto' as const,
			onBeforeToggle: (event: ToggleEvent<HTMLDivElement>) => {
				const rect = trigger.current?.getBoundingClientRect();
				if (event.newState !== 'open' || !rect) return;
				event.currentTarget.style.top = `${rect.bottom + window.scrollY + 12}px`;
				event.currentTarget.style.right = `${Math.max(20, document.documentElement.clientWidth - rect.right)}px`;
			},
			onToggle: (event: ToggleEvent<HTMLDivElement>) => {
				setOpen(event.newState === 'open');
				if (event.newState === 'open') rows(event.currentTarget)[0]?.focus();
			},
			onKeyDown: moveFocus,
			onClick: (event: MouseEvent<HTMLDivElement>) => {
				if ((event.target as Element).closest('a')) event.currentTarget.hidePopover();
			},
		},
	};
}

function ReportChoice({ row }: { row: (typeof REPORT)[number] }) {
	const t = useTranslations('nav');

	return (
		<>
			<row.Icon weight="bold" aria-hidden="true" className={`size-6 shrink-0 ${row.tone}`} />
			<span className="min-w-0 flex-1">
				<span className="block text-control-lg font-bold">{t(`${row.key}_title`)}</span>
				<span className="block text-sm text-muted-foreground">{t(`${row.key}_desc`)}</span>
			</span>
			<CaretRightIcon weight="bold" aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
		</>
	);
}

/** "Prijavi": a popover of three choice rows from md, a bottom sheet below (P1 A2, M3). The one primary in the header. */
function ReportMenu({ secondary }: { secondary: boolean }) {
	const t = useTranslations('nav');
	const tCommon = useTranslations('common');
	const { trigger, popover } = usePopover('report-menu');
	const variant = secondary ? 'secondary' : 'default';
	const label = (
		<>
			<PlusIcon weight="bold" aria-hidden="true" className="lg:hidden" />
			{t('report')}
		</>
	);

	return (
		<>
			<Button {...trigger} size="sm" variant={variant} className="hidden md:inline-flex lg:ml-2">
				{label}
			</Button>
			<div {...popover} aria-labelledby="report-menu-title" className={`${popoverClass} w-[408px] rounded-sheet`}>
				<p id="report-menu-title" className="p-3 font-display text-xl leading-7 font-semibold">
					{t('report_menu_title')}
				</p>
				<ul className="grid gap-2">
					{REPORT.map((row) => (
						<li key={row.key}>
							<Link href={row.href} className={choiceClass}>
								<ReportChoice row={row} />
							</Link>
						</li>
					))}
				</ul>
			</div>
			<Sheet>
				<SheetTrigger asChild>
					<Button size="sm" variant={variant} className="px-4 md:hidden">
						{label}
					</Button>
				</SheetTrigger>
				<SheetContent closeLabel={tCommon('close')} aria-describedby={undefined}>
					<SheetTitle>{t('report_menu_title')}</SheetTitle>
					<ul className="mt-5 grid gap-3">
						{REPORT.map((row) => (
							<li key={row.key}>
								<SheetClose asChild>
									<Link href={row.href} className={choiceClass}>
										<ReportChoice row={row} />
									</Link>
								</SheetClose>
							</li>
						))}
					</ul>
				</SheetContent>
			</Sheet>
		</>
	);
}

function Avatar({ viewer }: { viewer: Viewer }) {
	return (
		<span
			aria-hidden="true"
			className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
		>
			{viewer.initials || <UserIcon weight="bold" className="size-5" />}
		</span>
	);
}

/** Avatar menu (P1 B2): profile, alerts, payments, sign out; between lg and xl also the language (B3). */
function AccountMenu({ viewer }: { viewer: Viewer }) {
	const t = useTranslations('nav');
	const locale = useLocale();
	const { trigger, popover } = usePopover('account-menu');

	return (
		<>
			<Button {...trigger} variant="ghost" size="icon" aria-label={t('account_menu')}>
				<Avatar viewer={viewer} />
			</Button>
			<div {...popover} aria-label={t('account_menu')} className={`${popoverClass} w-[288px] rounded-row`}>
				{ACCOUNT.map(([href, key, Icon]) => (
					<Link key={key} href={href} className={menuRowClass}>
						<Icon weight="bold" aria-hidden="true" />
						{t(key)}
					</Link>
				))}
				<div className={separatorClass} />
				<div className="flex min-h-12 items-center pl-3 xl:hidden">
					<GlobeSimpleIcon weight="bold" aria-hidden="true" className="mr-1.5 size-5 text-foreground" />
					<LanguageSwitch full />
				</div>
				<div className={`${separatorClass} xl:hidden`} />
				<button type="button" onClick={() => void signOut(locale)} className={menuRowClass}>
					<SignOutIcon weight="bold" aria-hidden="true" />
					{t('account_sign_out')}
				</button>
			</div>
		</>
	);
}

/** Below lg: the menu button and its sheet, full height below md and a 360 px side sheet from md (P1 T2, M2). */
function MenuSheet({
	viewer,
	links,
	route,
}: {
	viewer: Viewer | null;
	links: ReturnType<typeof LINKS>;
	route: string;
}) {
	const t = useTranslations('nav');
	const locale = useLocale();
	const [open, setOpen] = useState(false);

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger asChild>
				<Button variant="ghost" size="icon" aria-label={t('menu_open')} className="lg:hidden">
					<ListIcon weight="bold" aria-hidden="true" />
				</Button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className={`${overlayClass} max-md:hidden`} />
				<Dialog.Content
					aria-describedby={undefined}
					// The header stays mounted across navigations, so any followed link closes the sheet.
					onClick={(event) => (event.target as Element).closest('a') && setOpen(false)}
					className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card text-card-foreground outline-hidden transition-opacity duration-[220ms] starting:opacity-0 motion-reduce:duration-[80ms] md:left-auto md:w-[360px] md:shadow-pop"
				>
					<Dialog.Title className="sr-only">{t('main_label')}</Dialog.Title>
					<div className="flex h-16 shrink-0 items-center gap-2 px-5 md:h-[88px] md:px-6">
						<Logo className="md:hidden" />
						<Dialog.Close asChild>
							<Button variant="ghost" size="icon" aria-label={t('menu_close')} className="ml-auto">
								<XIcon weight="bold" aria-hidden="true" />
							</Button>
						</Dialog.Close>
					</div>
					<div className="px-5 pt-3 pb-10 md:px-6 md:pt-0">
						<nav aria-label={t('main_label')}>
							<ul className="grid gap-1">
								{links.map(([href, key]) => (
									<li key={key}>
										<Link
											href={href as Href}
											aria-current={href === route ? 'page' : undefined}
											className={`-mx-3 flex min-h-14 items-center rounded-xl px-3 font-display text-2xl leading-[30px] font-semibold tracking-[-0.01em] hover:bg-foreground/10 aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 ${ringClass}`}
										>
											{t(key)}
										</Link>
									</li>
								))}
							</ul>
						</nav>
						{viewer ? (
							<div role="group" aria-label={t('account_menu')} className="-mx-3 mt-7">
								<Link href="/inbox" className={menuRowClass}>
									<TrayIcon weight="bold" aria-hidden="true" />
									{t('inbox')}
								</Link>
								{ACCOUNT.map(([href, key, Icon]) => (
									<Link key={key} href={href} className={menuRowClass}>
										<Icon weight="bold" aria-hidden="true" />
										{t(key)}
									</Link>
								))}
								<button type="button" onClick={() => void signOut(locale)} className={menuRowClass}>
									<SignOutIcon weight="bold" aria-hidden="true" />
									{t('account_sign_out')}
								</button>
							</div>
						) : (
							<Button asChild variant="secondary" className="mt-8 w-full">
								<Link href="/sign-in">{t('sign_in')}</Link>
							</Button>
						)}
						<LanguageSwitch full className="mt-6 -ml-1.5 md:hidden" />
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

/**
 * P1 web header: 88 px (64 below md), no border, on `background`. Content variant: logo, four links from lg, language,
 * sign-in or inbox and account, "Prijavi" and, below lg, the menu. Flow variant: logo and close.
 */
export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
	const t = useTranslations('nav');
	const tCommon = useTranslations('common');
	const pathname = usePathname();
	const variant = shellVariant(pathname);
	const route = routeTemplate(pathname);
	const links = LINKS(!!viewer);
	const bar = 'mx-auto box-content flex h-16 w-full max-w-[1120px] items-center gap-2 px-5 md:h-[88px] md:px-12';

	if (variant === 'none') return null;
	if (variant === 'flow')
		return (
			<header className={bar}>
				<Logo />
				<Button asChild variant="ghost" size="sm" className="ml-auto">
					<Link href="/">
						<XIcon weight="bold" aria-hidden="true" />
						{tCommon('close')}
					</Link>
				</Button>
			</header>
		);

	return (
		<header className={`${bar} lg:gap-4 xl:gap-8`}>
			<Logo className="mr-auto lg:mr-0" />
			<nav aria-label={t('main_label')} className="hidden lg:block">
				<ul className="flex items-center gap-1 xl:gap-2">
					{links.map(([href, key]) => (
						<li key={key}>
							<Link
								href={href as Href}
								aria-current={href === route ? 'page' : undefined}
								className={navLinkClass}
							>
								{t(key)}
							</Link>
						</li>
					))}
				</ul>
			</nav>
			<div className="flex items-center gap-2 lg:ml-auto">
				<LanguageSwitch
					className={viewer ? 'hidden md:inline-flex lg:hidden xl:inline-flex' : 'hidden md:inline-flex'}
				/>
				{viewer ? (
					<div className="hidden items-center gap-2 lg:flex">
						<Button asChild variant="ghost" size="icon">
							<Link href="/inbox" aria-label={t('inbox')}>
								<TrayIcon weight="bold" aria-hidden="true" />
							</Link>
						</Button>
						<AccountMenu viewer={viewer} />
					</div>
				) : (
					<Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
						<Link href="/sign-in">{t('sign_in')}</Link>
					</Button>
				)}
				<ReportMenu secondary={OWN_PRIMARY.has(route)} />
				<MenuSheet viewer={viewer} links={links} route={route} />
			</div>
		</header>
	);
}
