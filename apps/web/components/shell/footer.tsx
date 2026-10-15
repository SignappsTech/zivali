'use client';

import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { ringClass } from './page';
import { LanguageSwitch, Logo, useShellVariant } from './parts';

// System 10.7 footer order: info row, then the legal row with Cookie settings after Cookies.
const INFO = [
	['/how-it-works', 'how_it_works'],
	['/safety', 'safety'],
	['/faq', 'faq'],
	['/for-shelters', 'for_shelters'],
	['/shelters', 'shelters'],
	['/advertise', 'partners'],
	['/about', 'about'],
] as const;
const LEGAL = [
	['/privacy', 'privacy'],
	['/cookies', 'cookies'],
	// TODO(TASK-13.2): a button (aria-haspopup="dialog") that reopens the P17 consent preferences.
	['/cookies', 'cookie_settings'],
	['/terms', 'terms'],
	['/imprint', 'imprint'],
	['/accessibility', 'accessibility'],
] as const;
const FLOW: string[] = ['privacy', 'terms', 'cookie_settings', 'accessibility'];

type Href = ComponentProps<typeof Link>['href'];
type Key = (typeof INFO | typeof LEGAL)[number][1];

const linkClass = cn(
	'inline-flex min-h-11 min-w-11 items-center rounded-sm text-control leading-[22px] whitespace-nowrap text-muted-foreground underline decoration-1 underline-offset-4 hover:text-foreground',
	ringClass
);

/** P1 footer: logo with tagline, the link rows, language and copyright; flows get one quiet row (system 10.7). */
export function SiteFooter() {
	const t = useTranslations('footer');
	const variant = useShellVariant();
	const list = (links: readonly (readonly [Href, Key])[], className?: string) => (
		<ul className={cn('flex flex-wrap gap-x-5 lg:gap-x-6', className)}>
			{links.map(([href, key]) => (
				<li key={key}>
					<Link href={href} className={linkClass}>
						{t(key)}
					</Link>
				</li>
			))}
		</ul>
	);

	if (variant === 'none') return null;
	if (variant === 'flow')
		return (
			<footer className="mt-auto px-5 py-6 md:px-12">
				<nav aria-label={t('nav_label')}>
					{list(
						LEGAL.filter(([, key]) => FLOW.includes(key)),
						'justify-center'
					)}
				</nav>
			</footer>
		);

	return (
		<footer className="mx-auto mt-auto box-content w-full max-w-[1120px] px-5 pt-12 pb-10 md:px-12">
			<p className="flex items-center gap-3 lg:gap-4">
				<Logo small />
				<span className="text-muted-foreground">{t('tagline')}</span>
			</p>
			<nav aria-label={t('nav_label')} className="mt-3 lg:mt-4 lg:flex lg:items-end lg:gap-8">
				<div className="min-w-0 flex-1">
					{list(INFO)}
					{list(LEGAL, 'mt-3 lg:mt-0')}
				</div>
				<LanguageSwitch className="mt-3 -ml-1.5 lg:mt-0 lg:ml-0" />
			</nav>
			<p className="mt-3 text-sm text-muted-foreground lg:mt-6">
				{t('copyright', { year: new Date().getFullYear() })}
			</p>
		</footer>
	);
}
