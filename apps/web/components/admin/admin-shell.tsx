'use client';

import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { CaretDoubleLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretDoubleLeft';
import { CaretDoubleRightIcon } from '@phosphor-icons/react/dist/ssr/CaretDoubleRight';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { FlaskIcon } from '@phosphor-icons/react/dist/ssr/Flask';
import { GlobeSimpleIcon } from '@phosphor-icons/react/dist/ssr/GlobeSimple';
import { LaptopIcon } from '@phosphor-icons/react/dist/ssr/Laptop';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { DropdownMenu, Tooltip } from 'radix-ui';
import * as React from 'react';

import { signOut, useRequireAuth } from '@zivali/api/auth';
import { Logo, LogoMark, ringClass } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';
import { usePathname, useRouter } from '@/i18n/client-navigation';
import { getPathname, Link } from '@/i18n/navigation';
import type { Env } from '@/lib/env';
import { cn } from '@/lib/utils';

import { adminH1Class, ErrorNote } from './directory/parts';
import { Mfa } from './mfa';
import { ADMIN_NAV, type AdminItem, adminItem, canOpen, itemHref, itemPath, type StaffRole } from './nav';

type AppEnv = Env['APP_ENV'];

const sidebarRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring';
// P19 S1: 44 px rows, radius 12, label 16 semibold, icon 20; hover sidebar-accent, current sidebar-primary and bold.
const itemClass = `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-left leading-5 font-semibold transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary aria-[current=page]:font-bold aria-[current=page]:text-sidebar-primary-foreground motion-reduce:transition-none ${sidebarRing}`;
// System 10.9 menu rows: 48 px, icon 20, 16 semibold.
const menuRowClass =
	'flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-3 font-semibold text-popover-foreground outline-hidden select-none data-[highlighted]:bg-foreground/10 [&_svg]:size-5';

/** Ends the session here and leaves the console for the public home page. */
function useLeave() {
	const locale = useLocale();
	return async () => {
		await signOut().catch(() => undefined);
		window.location.assign(getPathname({ locale, href: '/' }));
	};
}

/**
 * P19 admin shell (FR-019), the client half of the (admin) layout, which has checked the signed-in session already.
 * Order of the checks: staff role (anyone else gets the plain refusal, no hint of what exists), then TOTP: enrolment
 * or the code screen until the session is aal2. Only then does any admin page render, so none of their API calls
 * run before. Each page's role comes from the navigation (nav.ts); the API enforces both again (C3).
 */
export function AdminShell({
	env,
	initials,
	aal2,
	children,
}: {
	env: AppEnv;
	initials: string;
	/** The verified session's assurance level, read on the server: below aal2 no page renders. */
	aal2: boolean;
	children: React.ReactNode;
}) {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	const router = useRouter();
	const { gate, role } = useRequireAuth({ role: 'MODERATOR', aal2: true });

	React.useEffect(() => {
		// `next` is the URL as the browser shows it (localised), as the server guards send it.
		if (gate === 'signin')
			router.replace({
				pathname: '/sign-in',
				query: { next: window.location.pathname + window.location.search },
			});
	}, [gate, router]);

	const skip = (
		<a
			href="#main"
			className={`sr-only z-[60] items-center rounded-full bg-popover px-5 font-bold text-popover-foreground shadow-pop focus:not-sr-only focus:fixed focus:top-5 focus:left-5 focus:inline-flex focus:min-h-11 md:focus:left-12 ${ringClass}`}
		>
			{tCommon('skip_to_content')}
		</a>
	);

	if (gate === 'loading' || gate === 'signin')
		return (
			<p role="status" className="sr-only">
				{tCommon('loading')}
			</p>
		);
	if (gate === 'ok' && aal2)
		return (
			<>
				{skip}
				<Console env={env} role={role as StaffRole} initials={initials}>
					{children}
				</Console>
				<Toaster closeLabel={tCommon('close')} label={tCommon('toasts_label')} />
			</>
		);
	return (
		<>
			{skip}
			{gate === 'aal2' || gate === 'ok' ? (
				<AccessFrame env={env}>
					<Mfa />
				</AccessFrame>
			) : gate === 'error' ? (
				<AccessFrame env={env}>
					<h1 className={adminH1Class}>{t('breadcrumb_root')}</h1>
					<div className="mt-8">
						<ErrorNote
							action={
								<Button
									variant="text"
									size="sm"
									className="mt-1 -ml-3"
									onClick={() => window.location.reload()}
								>
									{t('retry')}
								</Button>
							}
						>
							{t('error')}
						</ErrorNote>
					</div>
				</AccessFrame>
			) : (
				<AccessFrame>
					<Denied />
				</AccessFrame>
			)}
		</>
	);
}

/** P19 A2: h1, one sentence, a text button back to the app. */
function Denied() {
	const t = useTranslations('admin');
	return (
		<div>
			<span
				aria-hidden="true"
				className="grid size-22 place-items-center rounded-full bg-secondary text-primary [&_svg]:size-10"
			>
				<LockSimpleIcon weight="bold" />
			</span>
			<h1 className={cn(adminH1Class, 'mt-6')}>{t('denied_title')}</h1>
			<p className="mt-3">{t('denied_body')}</p>
			<Button asChild variant="text" size="sm" className="mt-6 -ml-3">
				<Link href="/">
					<ArrowLeftIcon weight="bold" aria-hidden="true" />
					{t('denied_back')}
				</Link>
			</Button>
		</div>
	);
}

/**
 * Access screens (P19 F7, A1, A2): no sidebar, the 440 px column. With `env` (the TOTP screens of a staff member)
 * the header names the console and the environment and offers sign-out; the refusal shows the logo only.
 */
function AccessFrame({ env, children }: { env?: AppEnv; children: React.ReactNode }) {
	const t = useTranslations('admin');
	const leave = useLeave();
	return (
		<>
			<header className="flex h-16 items-center gap-3 px-5 md:h-[88px] md:px-12">
				<Logo />
				{env && (
					<>
						<span className="font-semibold text-muted-foreground max-[359px]:hidden">
							{t('breadcrumb_root')}
						</span>
						<div className="ml-auto flex items-center gap-4">
							<EnvLabel env={env} className="max-sm:hidden" />
							<Button variant="ghost" size="sm" onClick={leave}>
								{t('sign_out')}
							</Button>
						</div>
					</>
				)}
			</header>
			<main id="main" className="mx-auto box-content max-w-[440px] px-5 pt-6 pb-24 md:pt-[72px]">
				{children}
			</main>
		</>
	);
}

const ENV_ICONS = { local: LaptopIcon, staging: FlaskIcon, production: GlobeSimpleIcon } as const;

function EnvLabel({ env, className }: { env: AppEnv; className?: string }) {
	const t = useTranslations('admin');
	const EnvIcon = ENV_ICONS[env];
	return (
		<span className={cn('inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap', className)}>
			<EnvIcon weight="bold" aria-hidden="true" className="size-4" />
			{t(`env_${env}`)}
		</span>
	);
}

/** Sidebar 280 px (72 collapsed) from lg, a sheet from the left below; top bar 72 px; content max 1280, gutters 48. */
function Console({
	env,
	role,
	initials,
	children,
}: {
	env: AppEnv;
	role: StaffRole;
	initials: string;
	children: React.ReactNode;
}) {
	const t = useTranslations('admin');
	const tNav = useTranslations('nav');
	// next-intl reports the template `/admin/[section]` for a section without a page yet: resolve it to the real path.
	const { section } = useParams<{ section?: string }>();
	const raw = usePathname();
	const pathname = raw === '/admin/[section]' && section ? `/admin/${section}` : raw;
	const item = adminItem(pathname);
	const [collapsed, setCollapsed] = React.useState(false);
	const [sheet, setSheet] = React.useState(false);
	const close = React.useRef<HTMLButtonElement>(null);
	const leave = useLeave();

	return (
		<div className="flex min-h-dvh">
			{/* The whole rail is the landmark: logo, items and the collapse button. */}
			<nav
				aria-label={t('breadcrumb_root')}
				className={cn(
					'sticky top-0 flex h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground max-lg:hidden',
					collapsed ? 'w-18' : 'w-70'
				)}
			>
				<SidebarHead collapsed={collapsed} />
				<SidebarNav role={role} current={item} collapsed={collapsed} landmark={false} />
				<div className={cn('border-t border-sidebar-border py-3', collapsed ? 'px-3.5' : 'px-3')}>
					<button
						type="button"
						aria-label={collapsed ? t('sidebar_expand') : undefined}
						onClick={() => setCollapsed(!collapsed)}
						className={cn(itemClass, collapsed && 'w-11 justify-center p-0')}
					>
						{collapsed ? (
							<CaretDoubleRightIcon weight="bold" aria-hidden="true" className="size-5" />
						) : (
							<>
								<CaretDoubleLeftIcon weight="bold" aria-hidden="true" className="size-5" />
								{t('sidebar_collapse')}
							</>
						)}
					</button>
				</div>
			</nav>

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-18 shrink-0 items-center gap-3 px-5 lg:px-12">
					<Dialog open={sheet} onOpenChange={setSheet}>
						<DialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								aria-label={tNav('menu_open')}
								className="-ml-3 lg:hidden"
							>
								<ListIcon weight="bold" aria-hidden="true" />
							</Button>
						</DialogTrigger>
						<DialogContent
							aria-describedby={undefined}
							onOpenAutoFocus={(event) => {
								event.preventDefault();
								close.current?.focus();
							}}
							className="top-0 left-0 flex h-dvh max-h-none w-70 max-w-full translate-0 flex-col overflow-hidden rounded-none rounded-r-card bg-sidebar p-0 text-sidebar-foreground"
						>
							<DialogTitle className="sr-only">{tNav('main_label')}</DialogTitle>
							<SidebarHead
								action={
									<DialogClose
										ref={close}
										aria-label={tNav('menu_close')}
										className={cn(
											'ml-auto grid size-11 cursor-pointer place-items-center rounded-full hover:bg-sidebar-accent',
											sidebarRing
										)}
									>
										<XIcon weight="bold" aria-hidden="true" className="size-6" />
									</DialogClose>
								}
							/>
							<SidebarNav role={role} current={item} onNavigate={() => setSheet(false)} />
						</DialogContent>
					</Dialog>

					<nav aria-label={t('breadcrumb_label')} className="min-w-0">
						<ol className="flex min-w-0 items-center gap-0.5 text-control font-semibold">
							<li className="flex shrink-0">
								<Link
									href="/admin"
									className={cn(
										'-ml-1.5 inline-flex min-h-11 items-center rounded-lg px-1.5 text-primary underline decoration-1 underline-offset-4 hover:decoration-2',
										ringClass
									)}
								>
									{t('breadcrumb_root')}
								</Link>
							</li>
							{item && (
								<>
									<li aria-hidden="true" className="flex text-muted-foreground">
										<CaretRightIcon weight="bold" className="size-3.5" />
									</li>
									<li className="min-w-0">
										<span aria-current="page" className="block truncate px-1.5">
											{t(item.key)}
										</span>
									</li>
								</>
							)}
						</ol>
					</nav>

					<div className="ml-auto flex shrink-0 items-center gap-4">
						<EnvLabel env={env} className="max-md:hidden" />
						<span aria-hidden="true" className="h-5 w-px bg-input/50 max-md:hidden" />
						<span className="inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap text-muted-foreground max-md:hidden">
							<UserGearIcon weight="bold" aria-hidden="true" className="size-4" />
							{t(role === 'ADMIN' ? 'role_admin' : 'role_moderator')}
						</span>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<button
									type="button"
									aria-label={t('account_menu')}
									className={cn(
										'inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full pr-2.5 pl-1.5 hover:bg-foreground/10',
										ringClass
									)}
								>
									<span className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
										{initials || <UserIcon weight="bold" aria-hidden="true" className="size-5" />}
									</span>
									<CaretDownIcon weight="bold" aria-hidden="true" className="size-4" />
								</button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									align="end"
									sideOffset={4}
									aria-label={t('account_menu')}
									className="z-50 w-60 rounded-row bg-popover p-2 text-popover-foreground shadow-pop"
								>
									<DropdownMenu.Item asChild className={menuRowClass}>
										<Link href="/">
											<ArrowLeftIcon weight="bold" aria-hidden="true" />
											{t('denied_back')}
										</Link>
									</DropdownMenu.Item>
									<DropdownMenu.Item className={menuRowClass} onSelect={leave}>
										<SignOutIcon weight="bold" aria-hidden="true" />
										{t('sign_out')}
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					</div>
				</header>

				<main id="main" className="flex w-full max-w-[1280px] flex-col gap-10 px-5 pt-1 pb-16 lg:px-12">
					{canOpen(pathname, role) ? children : <Denied />}
				</main>
			</div>
		</div>
	);
}

function SidebarHead({ collapsed = false, action }: { collapsed?: boolean; action?: React.ReactNode }) {
	const t = useTranslations('admin');
	return (
		<div className={cn('flex h-18 shrink-0 items-center gap-2', collapsed ? 'justify-center' : 'px-3')}>
			<Link
				href="/admin"
				aria-label={collapsed ? `Najdimo, ${t('breadcrumb_root')}` : undefined}
				className={cn('inline-flex min-h-11 items-center gap-2.5 rounded-sm px-2', sidebarRing)}
			>
				<LogoMark tone="fill-sidebar-foreground stroke-sidebar-foreground" className="size-8 shrink-0" />
				{!collapsed && (
					<span className="flex flex-col">
						<span className="font-display text-xl leading-6 font-bold tracking-[-0.02em]">Najdimo</span>
						<span className="text-sm font-semibold text-sidebar-foreground/75">{t('breadcrumb_root')}</span>
					</span>
				)}
			</Link>
			{action}
		</div>
	);
}

/**
 * Groups and items the role may open; an empty group is left out. Collapsed: icons with tooltips, no group labels.
 * Its own nav landmark unless the surrounding rail is one (`landmark={false}`).
 */
function SidebarNav({
	role,
	current,
	collapsed = false,
	landmark = true,
	onNavigate,
}: {
	role: StaffRole;
	current: AdminItem | undefined;
	collapsed?: boolean;
	landmark?: boolean;
	onNavigate?: () => void;
}) {
	const Wrapper = landmark ? 'nav' : 'div';
	const t = useTranslations('admin');
	const id = React.useId();
	const groups = ADMIN_NAV.map((group) => ({
		...group,
		items: group.items.filter((item) => item.roles.includes(role)),
	})).filter((group) => group.items.length > 0);

	return (
		<Tooltip.Provider delayDuration={0}>
			<Wrapper
				aria-label={landmark ? t('breadcrumb_root') : undefined}
				className={cn('flex-1 overflow-y-auto pt-1 pb-5', collapsed ? 'px-3.5' : 'px-3')}
			>
				{groups.map((group) => (
					<div
						key={group.key}
						className={cn(
							collapsed
								? 'not-first:mt-2 not-first:border-t not-first:border-sidebar-border not-first:pt-2'
								: 'not-first:mt-4'
						)}
					>
						{!collapsed && (
							<p
								id={`${id}-${group.key}`}
								className="mb-1 px-3 text-sm font-semibold text-sidebar-foreground/75"
							>
								{t(group.key)}
							</p>
						)}
						<ul
							aria-labelledby={collapsed ? undefined : `${id}-${group.key}`}
							aria-label={collapsed ? t(group.key) : undefined}
							className="grid gap-0.5"
						>
							{group.items.map((item) => {
								const label = t(item.key);
								const soon = item.section !== undefined;
								const link = (
									<Link
										href={itemHref(item)}
										aria-current={item === current ? 'page' : undefined}
										// "Oglasi, Kmalu": the comma gives screen readers the pause the layout gives the eye.
										aria-label={soon ? `${label}, ${t('coming_badge')}` : undefined}
										onClick={onNavigate}
										className={cn(itemClass, collapsed && 'w-11 justify-center p-0')}
									>
										<item.Icon
											weight={item === current ? 'fill' : 'regular'}
											aria-hidden="true"
											className="size-5 shrink-0"
										/>
										{collapsed ? (
											<span className="sr-only">{label}</span>
										) : (
											<>
												<span className="min-w-0">{label}</span>
												{soon && (
													<span className="ml-auto pl-2 text-sm font-normal whitespace-nowrap opacity-75">
														{t('coming_badge')}
													</span>
												)}
											</>
										)}
									</Link>
								);
								return (
									<li key={itemPath(item)}>
										{collapsed ? (
											<Tooltip.Root>
												<Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
												{/* No portal: it stays in the nav landmark; fixed positioning clears the rail's scroll. */}
												<Tooltip.Content
													side="right"
													sideOffset={12}
													className="z-50 rounded-sm bg-popover px-3 py-2 text-sm font-bold text-popover-foreground shadow-pop"
												>
													{label}
												</Tooltip.Content>
											</Tooltip.Root>
										) : (
											link
										)}
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</Wrapper>
		</Tooltip.Provider>
	);
}
