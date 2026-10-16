import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { MapTrifoldIcon } from '@phosphor-icons/react/dist/ssr/MapTrifold';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { type Locale, useLocale, useTranslations } from 'next-intl';
import type * as React from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// P1 page containers and shared patterns. No 'use client' and no server-only API, so server pages and the lazily
// loaded 500 page both use them.

/** The system focus ring (3 px `ring`, 2 px offset). */
export const ringClass = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

export const h1Class = 'font-display text-3xl font-bold tracking-[-0.02em] text-balance lg:text-5xl';

/** The logo mark, decorative; `tone` paints it (primary here, the sidebar foreground in the admin console). */
export function LogoMark({ className, tone = 'fill-primary stroke-primary' }: { className?: string; tone?: string }) {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
			<g className={tone} strokeWidth="1.6" strokeLinejoin="round">
				<path d="M24 45.5 C24 45.5 10.5 33.2 10.5 24.4 A13.5 13.5 0 0 1 37.5 24.4 C37.5 33.2 24 45.5 24 45.5 Z M24 17.9 A6.5 6.5 0 1 0 24 30.9 A6.5 6.5 0 1 0 24 17.9 Z" />
				<path d="M12.2 19.6 L11.2 5 L22.6 11.4 Z" />
				<path d="M35.8 19.6 L25.4 11.4 L36.8 5 Z" />
			</g>
			<circle cx="24" cy="24.4" r="3.6" className="fill-status-reunited" />
		</svg>
	);
}

/** LanguageSwitch's strings, made where the switch is rendered: the switch itself ships no translator (TASK-90.7). */
export function useLanguageLabels() {
	const t = useTranslations('nav');
	const name = (locale: Locale) => t(`language_${locale}_full`);

	return {
		label: t('language_label', { current: name(useLocale()) }),
		short: { sl: t('language_sl'), en: t('language_en') },
		full: { sl: name('sl'), en: name('en') },
	};
}
export type LanguageLabels = ReturnType<typeof useLanguageLabels>;

/** Logo mark and wordmark, a link home named by `nav.home_label`. Below 360 px only the mark shows. */
export function Logo({ small = false, className }: { small?: boolean; className?: string }) {
	const t = useTranslations('nav');

	return (
		<Link
			href="/"
			aria-label={t('home_label')}
			className={cn(
				'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl text-foreground',
				ringClass,
				className
			)}
		>
			<LogoMark className={small ? 'size-7' : 'size-8 md:size-9'} />
			<span
				aria-hidden="true"
				className={cn(
					'font-display font-bold',
					small ? 'text-lg' : 'text-xl tracking-[-0.03em] max-[359px]:hidden md:text-2xl'
				)}
			>
				Najdimo
			</span>
		</Link>
	);
}

/**
 * P1 Content variant: `main#main` (the skip link target) in the 1120 px column, gutters 20 / 48 px, h1 32 px under
 * the header. `sidebar` adds the 320 px right region from lg (the ad slot, C15); pass `true` to reserve it empty, so
 * an ad arriving later shifts nothing.
 */
export function ContentPage({
	children,
	sidebar,
	className,
}: {
	children: React.ReactNode;
	sidebar?: React.ReactNode;
	className?: string;
}) {
	const t = useTranslations('common');
	const aside = sidebar !== undefined && sidebar !== false;

	return (
		<div
			className={cn(
				'mx-auto box-content max-w-[1120px] px-5 md:px-12',
				aside && 'lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8'
			)}
		>
			<main id="main" className={cn('min-w-0 pt-8 pb-12 lg:pb-24', className)}>
				{children}
			</main>
			{aside && (
				<aside aria-label={t('sidebar_label')} className="sticky top-6 mt-8 hidden min-h-[267px] lg:block">
					{sidebar}
				</aside>
			)}
		</div>
	);
}

/** Flat spot illustration in brand tokens; stands in for assets/empty-inbox.png until the image task delivers it. */
export function SpotIllustration({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 320 210" aria-hidden="true" className={cn('h-auto w-full rounded-card', className)}>
			<rect width="320" height="210" className="fill-accent" />
			<circle cx="232" cy="70" r="32" className="fill-status-reunited" />
			<path d="M0 150 C60 112 120 120 172 140 C222 160 272 150 320 120 V210 H0Z" className="fill-secondary" />
			<path d="M0 182 C70 146 130 162 190 180 C240 194 290 186 320 170 V210 H0Z" className="fill-primary" />
			<path
				d="M52 198 C96 160 150 182 196 148"
				fill="none"
				strokeWidth="3"
				strokeLinecap="round"
				strokeDasharray="1 9"
				className="stroke-status-reunited"
			/>
		</svg>
	);
}

/** Page loading (P1): skeleton blocks in the final shape (title, lede, rows), announced once; never a spinner. */
export function PageSkeleton() {
	const t = useTranslations('common');

	return (
		<div aria-busy="true">
			<p role="status" className="sr-only">
				{t('loading_page')}
			</p>
			<Skeleton className="h-9 w-56 lg:h-[52px] lg:w-[380px]" />
			<Skeleton className="mt-4 h-5 w-full max-w-[600px] lg:mt-5" />
			<Skeleton className="mt-2 h-5 w-3/4 max-w-[440px] lg:mt-3" />
			<ul className="mt-10 grid gap-5 lg:mt-12">
				{['w-32', 'w-28', 'w-36', 'w-24'].map((width) => (
					<li key={width} className="flex items-center gap-4">
						<Skeleton className="size-16 shrink-0 rounded-row" />
						<div className="grid flex-1 gap-2">
							<Skeleton className={cn('h-6', width)} />
							<Skeleton className="h-4 w-44" />
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

/** Inline error (P1): note with icon and, from a client component, a retry text button that keeps its label. */
export function InlineError({ onRetry, retrying = false }: { onRetry?: () => void; retrying?: boolean }) {
	const t = useTranslations('common');

	return (
		<div
			role="alert"
			className="flex items-center gap-3 rounded-row bg-muted py-4 pr-2 pl-[18px] text-control leading-[22px]"
		>
			<WarningCircleIcon weight="fill" aria-hidden="true" className="size-[22px] shrink-0 text-destructive" />
			<p className="flex-1">{t('inline_error')}</p>
			{onRetry && (
				<Button variant="text" size="sm" loading={retrying} onClick={onRetry}>
					<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
					{t('inline_error_retry')}
				</Button>
			)}
		</div>
	);
}

const ERROR_COPY = { 404: 'page_404', 410: 'page_410', 500: 'page_500' } as const;

/**
 * P1 error pages: h1, one sentence, spot illustration (right from lg, between text and buttons below), primary
 * "Na zemljevid" and a text button: home, or retry (`onRetry`) on 500. Render it inside ContentPage.
 */
export function ErrorPage({ status, onRetry }: { status: keyof typeof ERROR_COPY; onRetry?: () => void }) {
	const t = useTranslations('errors');
	const tCommon = useTranslations('common');
	const copy = ERROR_COPY[status];

	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-16 lg:gap-y-10">
			<div>
				<h1 className={cn(h1Class, 'lg:max-w-[16ch]')}>{t(`${copy}_title`)}</h1>
				<p className="mt-3 max-w-[44ch] lg:mt-4 lg:text-xl lg:leading-8">{t(`${copy}_body`)}</p>
			</div>
			<SpotIllustration className="lg:col-start-2 lg:row-span-2 lg:row-start-1" />
			<div className="grid gap-1 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
				<Button asChild size="lg">
					<Link href="/map">
						<MapTrifoldIcon weight="bold" aria-hidden="true" />
						{tCommon('go_to_map')}
					</Link>
				</Button>
				{status === 500 ? (
					<Button variant="text" size="lg" onClick={onRetry}>
						<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
						{tCommon('try_again')}
					</Button>
				) : (
					<Button asChild variant="text" size="lg">
						<Link href="/">{tCommon('go_home')}</Link>
					</Button>
				)}
			</div>
		</div>
	);
}

/**
 * 410 "no longer available" (P1, C15): closed > 30 days, hidden or removed reports. The report detail page renders it
 * with HTTP 410 (TASK-18.2); noindex.
 */
export function GonePage() {
	const t = useTranslations('errors');

	return (
		<ContentPage>
			<title>{`${t('page_410_doc_title')} · Najdimo`}</title>
			<meta name="robots" content="noindex" />
			<ErrorPage status={410} />
		</ContentPage>
	);
}

/** A page whose story has not shipped yet: its title and one calm sentence. */
export function Placeholder({ title }: { title: string }) {
	const t = useTranslations('common');

	return (
		<>
			<h1 className={h1Class}>{title}</h1>
			<p className="mt-3 max-w-[58ch] text-lg leading-7 lg:mt-4 lg:text-xl lg:leading-8">
				{t('placeholder_body')}
			</p>
		</>
	);
}
