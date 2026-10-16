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
import { NextIntlClientProvider, useLocale, useMessages, useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { Viewer } from '@/lib/viewer';

import { Logo, ringClass } from './page';
import {
	HeaderPopover,
	InboxDot,
	LanguageSwitch,
	NavLinks,
	ShellButton,
	ShellDialog,
	ShellSlot,
	SignOutButton,
} from './parts';

type Href = Parameters<typeof getPathname>[0]['href'];

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

const bar = 'mx-auto box-content flex h-16 max-w-[1120px] items-center gap-2 px-5 md:h-[88px] md:px-12';
const navLinkClass = `inline-flex min-h-11 items-center rounded-full px-3 font-semibold whitespace-nowrap text-muted-foreground hover:bg-foreground/10 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 ${ringClass}`;
const sheetLinkClass = `-mx-3 flex min-h-14 items-center rounded-xl px-3 font-display text-2xl leading-[30px] font-semibold tracking-[-0.01em] hover:bg-foreground/10 aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 ${ringClass}`;
// System 10.9 menu: popover, radius 20, 8 px padding, shadow-pop; rows 48 px, icon 20, 16 semibold.
const popoverClass =
	'absolute inset-auto m-0 max-w-[calc(100vw-40px)] border-0 bg-popover p-2 text-popover-foreground shadow-pop';
const menuRowClass = `flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-semibold text-foreground hover:bg-foreground/10 [&_svg]:size-5 [&_svg]:shrink-0 ${ringClass}`;
// System 10.4 choice row as a menu row (caret instead of check), on `background` inside a popover or card sheet.
const choiceClass = `flex min-h-16 w-full cursor-pointer items-center gap-3.5 rounded-row bg-background px-5 py-3 text-left text-foreground transition-transform duration-[80ms] hover:bg-[linear-gradient(hsl(var(--foreground)/0.1),hsl(var(--foreground)/0.1))] active:scale-[0.98] active:bg-accent motion-reduce:transition-none motion-reduce:active:scale-100 ${ringClass}`;
const separatorClass = 'mx-3 my-1.5 h-px bg-border';
// Native modal dialogs with the kit sheet look (system 10.7, 10.9): card surface, scrim backdrop.
const dialogClass =
	'm-0 overflow-y-auto overscroll-contain border-0 bg-card p-0 text-card-foreground backdrop:bg-scrim';

/** Signed in only: the inbox dot (store and code load lazily) with the messages it needs, not on public pages (TASK-90.5). */
function InboxLabel(props: ComponentProps<typeof InboxDot>) {
	const { notifications } = useMessages();
	return (
		<NextIntlClientProvider locale={useLocale()} messages={{ notifications }}>
			<InboxDot {...props} />
		</NextIntlClientProvider>
	);
}

/**
 * P1 web header, a server component: 88 px (64 below md), no border, on `background`. Content variant: logo, four links
 * from lg, language, sign-in or inbox and account, "Prijavi" (popover from md, bottom sheet below) and, below lg, the
 * menu sheet. Flow variant: logo and close.
 */
export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
	const t = useTranslations('nav');
	const tCommon = useTranslations('common');
	const locale = useLocale();
	const href = (target: Href) => getPathname({ locale, href: target });
	// TODO(TASK-31.4): C15 has no map filter query yet; `type` uses the C4 report types.
	const links = [
		{ route: '/map', href: href('/map'), label: t('map') },
		{ href: href({ pathname: '/map', query: { type: 'lost' } }), label: t('lost') },
		{ href: href({ pathname: '/map', query: { type: 'found' } }), label: t('found') },
		viewer
			? { route: '/my-pets', href: href('/my-pets'), label: t('my_pets_reports') }
			: { route: '/how-it-works', href: href('/how-it-works'), label: t('how_it_works') },
	];
	const report = (extra: string): [string, string] => [
		cn(buttonVariants({ size: 'sm' }), extra),
		cn(buttonVariants({ size: 'sm', variant: 'secondary' }), extra),
	];
	const reportLabel = (
		<>
			<PlusIcon weight="bold" aria-hidden="true" className="lg:hidden" />
			{t('report')}
		</>
	);
	const choices = REPORT.map(({ key, href, Icon, tone }) => (
		<li key={key}>
			<Link href={href} className={choiceClass}>
				<Icon weight="bold" aria-hidden="true" className={`size-6 shrink-0 ${tone}`} />
				<span className="min-w-0 flex-1">
					<span className="block text-control-lg font-bold">{t(`${key}_title`)}</span>
					<span className="block text-sm text-muted-foreground">{t(`${key}_desc`)}</span>
				</span>
				<CaretRightIcon weight="bold" aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
			</Link>
		</li>
	));
	const accountRows = ACCOUNT.map(([target, key, Icon]) => (
		<Link key={key} href={target} className={menuRowClass}>
			<Icon weight="bold" aria-hidden="true" />
			{t(key)}
		</Link>
	));
	const signOut = (
		<SignOutButton className={menuRowClass}>
			<SignOutIcon weight="bold" aria-hidden="true" />
			{t('account_sign_out')}
		</SignOutButton>
	);
	// First stop in the tab order, to `main#main` (ContentPage).
	const skip = (
		<a
			href="#main"
			className={`sr-only z-[60] items-center rounded-full bg-popover px-5 font-bold text-popover-foreground shadow-pop focus:not-sr-only focus:fixed focus:top-5 focus:left-5 focus:inline-flex focus:min-h-11 md:focus:left-12 ${ringClass}`}
		>
			{tCommon('skip_to_content')}
		</a>
	);

	return (
		<>
			<ShellSlot variant="content">
				{skip}
				<header className={`${bar} lg:gap-4 xl:gap-8`}>
					<Logo className="mr-auto lg:mr-0" />
					<nav aria-label={t('main_label')} className="hidden lg:block">
						<NavLinks
							links={links}
							className="flex items-center gap-1 xl:gap-2"
							linkClassName={navLinkClass}
						/>
					</nav>
					<div className="flex items-center gap-2 lg:ml-auto">
						{/* From md; signed in it moves into the account menu between lg and xl (P1 B3). */}
						<div className={viewer ? 'hidden md:block lg:hidden xl:block' : 'hidden md:block'}>
							<LanguageSwitch />
						</div>
						{viewer ? (
							<div className="hidden items-center gap-2 lg:flex">
								<Button asChild variant="ghost" size="icon" className="relative">
									<Link href="/inbox">
										<TrayIcon weight="bold" aria-hidden="true" />
										<InboxLabel label={t('inbox')} live className="absolute top-1.5 right-1.5" />
									</Link>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									aria-label={t('account_menu')}
									popoverTarget="account-menu"
								>
									<span
										aria-hidden="true"
										className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
									>
										{viewer.initials || <UserIcon weight="bold" className="size-5" />}
									</span>
								</Button>
								{/* P1 B2 and, between lg and xl, B3 with the language. */}
								<HeaderPopover
									id="account-menu"
									aria-label={t('account_menu')}
									className={`${popoverClass} w-[288px] rounded-row`}
								>
									{accountRows}
									<div className={separatorClass} />
									<div className="flex min-h-12 items-center pl-3 xl:hidden">
										<GlobeSimpleIcon
											weight="bold"
											aria-hidden="true"
											className="mr-1.5 size-5 text-foreground"
										/>
										<LanguageSwitch full />
									</div>
									<div className={`${separatorClass} xl:hidden`} />
									{signOut}
								</HeaderPopover>
							</div>
						) : (
							<Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
								<Link href="/sign-in">{t('sign_in')}</Link>
							</Button>
						)}
						<ShellButton looks={report('hidden md:inline-flex lg:ml-2')} popoverTarget="report-menu">
							{reportLabel}
						</ShellButton>
						<HeaderPopover
							id="report-menu"
							aria-labelledby="report-menu-title"
							className={`${popoverClass} w-[408px] rounded-sheet`}
						>
							<p id="report-menu-title" className="p-3 font-display text-xl leading-7 font-semibold">
								{t('report_menu_title')}
							</p>
							<ul className="grid gap-2">{choices}</ul>
						</HeaderPopover>
						<ShellButton looks={report('px-4 md:hidden')} dialog="report-sheet" aria-haspopup="dialog">
							{reportLabel}
						</ShellButton>
						<ShellDialog
							id="report-sheet"
							aria-labelledby="report-sheet-title"
							className={`${dialogClass} mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-[560px] rounded-t-sheet shadow-lg`}
						>
							<div className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
								<form method="dialog">
									<button
										aria-label={tCommon('close')}
										className="-mb-3 flex h-11 w-full cursor-pointer items-center justify-center rounded-t-sheet before:h-[5px] before:w-10 before:rounded-[3px] before:bg-input focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring"
									/>
								</form>
								<h2
									id="report-sheet-title"
									className="pt-3 font-display text-2xl leading-[30px] font-bold tracking-[-0.015em] text-balance"
								>
									{t('report_menu_title')}
								</h2>
								<ul className="mt-5 grid gap-3">{choices}</ul>
							</div>
						</ShellDialog>
						<ShellButton
							dialog="menu-sheet"
							aria-label={t('menu_open')}
							aria-haspopup="dialog"
							className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'lg:hidden')}
						>
							<ListIcon weight="bold" aria-hidden="true" />
						</ShellButton>
						{/* P1 M2 (full height below md) and T2 (360 px side sheet from md). */}
						<ShellDialog
							id="menu-sheet"
							aria-label={t('main_label')}
							className={`${dialogClass} h-dvh max-h-none w-full max-w-none md:ml-auto md:w-[360px] md:shadow-pop`}
						>
							<div className="flex h-16 items-center gap-2 px-5 md:h-[88px] md:px-6">
								<Logo className="md:hidden" />
								<form method="dialog" className="ml-auto">
									<Button variant="ghost" size="icon" aria-label={t('menu_close')}>
										<XIcon weight="bold" aria-hidden="true" />
									</Button>
								</form>
							</div>
							<div className="px-5 pt-3 pb-10 md:px-6 md:pt-0">
								<nav aria-label={t('main_label')}>
									<NavLinks links={links} className="grid gap-1" linkClassName={sheetLinkClass} />
								</nav>
								{viewer ? (
									<div role="group" aria-label={t('account_menu')} className="-mx-3 mt-7">
										<Link href="/inbox" className={menuRowClass}>
											<TrayIcon weight="bold" aria-hidden="true" />
											<InboxLabel label={t('inbox')} visible className="ml-auto" />
										</Link>
										{accountRows}
										{signOut}
									</div>
								) : (
									<Button asChild variant="secondary" className="mt-8 w-full">
										<Link href="/sign-in">{t('sign_in')}</Link>
									</Button>
								)}
								<LanguageSwitch full className="mt-6 -ml-1.5 md:hidden" />
							</div>
						</ShellDialog>
					</div>
				</header>
			</ShellSlot>
			<ShellSlot variant="flow">
				{skip}
				<header className={bar}>
					<Logo />
					<Button asChild variant="ghost" size="sm" className="ml-auto">
						<Link href="/">
							<XIcon weight="bold" aria-hidden="true" />
							{tCommon('close')}
						</Link>
					</Button>
				</header>
			</ShellSlot>
		</>
	);
}
