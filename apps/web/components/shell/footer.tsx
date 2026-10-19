import { type Messages, useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

import { Link } from '@/i18n/navigation';

import { Logo, ringClass, useLanguageLabels } from './page';
import { CookieSettingsButton, LanguageSwitch, ShellSlot } from './parts';

type Href = ComponentProps<typeof Link>['href'];
type Key = Exclude<keyof Messages['footer'], 'copyright'>;
type Item = readonly [Href | null, Key];

// P1 footer (wireframe P1-footer.html v1, owner choices 2026-10-19): four headed columns, Zavetišča under Pomoč;
// null is Cookie settings.
const COLUMNS = [
	[
		'heading_help',
		[
			['/how-it-works', 'how_it_works'],
			['/safety', 'safety'],
			['/faq', 'faq'],
			['/shelters', 'shelters'],
		],
	],
	[
		'heading_organisations',
		[
			['/for-shelters', 'for_shelters'],
			['/advertise', 'partners'],
		],
	],
	[
		'heading_najdimo',
		[
			['/about', 'about'],
			['/imprint', 'imprint'],
			['/accessibility', 'accessibility'],
		],
	],
	[
		'heading_legal',
		[
			['/privacy', 'privacy'],
			['/cookies', 'cookies'],
			['/terms', 'terms'],
			[null, 'cookie_settings'],
		],
	],
] as const satisfies readonly (readonly [Key, readonly Item[]])[];
const FLOW: readonly Item[] = [
	['/privacy', 'privacy'],
	['/terms', 'terms'],
	[null, 'cookie_settings'],
	['/accessibility', 'accessibility'],
];

const operatorLinkClass = `inline-flex min-h-11 min-w-11 items-center rounded-sm text-foreground underline decoration-1 underline-offset-4 ${ringClass}`;
const linkClass = `inline-flex min-h-11 min-w-11 items-center rounded-sm text-left text-control leading-[22px] text-muted-foreground underline decoration-1 underline-offset-4 hover:text-foreground ${ringClass}`;

/** P1 footer, a server component: logo, tagline and language, the four link columns, copyright and operator; flows get one quiet row. */
export function SiteFooter() {
	const t = useTranslations('footer');
	const languages = useLanguageLabels();
	const link = ([href, key]: Item, className = '') =>
		href ? (
			// Thirteen links on every page: no prefetch, so a page view stays one request.
			<Link href={href} prefetch={false} className={`${linkClass} ${className}`}>
				{t(key)}
			</Link>
		) : (
			<CookieSettingsButton className={`cursor-pointer ${linkClass} ${className}`}>{t(key)}</CookieSettingsButton>
		);

	return (
		<>
			<ShellSlot variant="content">
				<footer className="mt-12 border-t border-border px-5 pb-8 md:px-12 lg:mt-24 lg:pb-10">
					<div className="mx-auto grid max-w-[1120px] gap-8 pt-10 lg:grid-cols-[4fr_8fr] lg:gap-x-12 lg:pt-14">
						<div>
							<p className="flex flex-wrap items-center gap-3.5">
								<Logo small />
								<span className="text-muted-foreground">{t('tagline')}</span>
							</p>
							<LanguageSwitch labels={languages} className="mt-2 -ml-1.5" />
						</div>
						<nav aria-label={t('nav_label')} className="grid gap-y-6 lg:grid-cols-4 lg:gap-6">
							{COLUMNS.map(([heading, links]) => (
								<div key={heading}>
									<h2
										id={`footer-${heading}`}
										className="mb-1 font-display text-control-lg font-bold tracking-[-0.01em]"
									>
										{t(heading)}
									</h2>
									<ul aria-labelledby={`footer-${heading}`}>
										{links.map((item) => (
											<li key={item[1]}>{link(item)}</li>
										))}
									</ul>
								</div>
							))}
						</nav>
						<div className="border-t border-border pt-6 text-control text-muted-foreground lg:col-span-2">
							<p>{t('copyright', { year: new Date().getFullYear() })}</p>
							<p className="mt-0.5">
								{t('operator')}{' '}
								<Link href="/imprint" prefetch={false} className={operatorLinkClass}>
									{t('imprint')}
								</Link>
							</p>
						</div>
					</div>
				</footer>
			</ShellSlot>
			<ShellSlot variant="flow">
				<footer className="px-5 py-6 md:px-12">
					<nav aria-label={t('nav_label')}>
						<ul className="flex flex-wrap justify-center gap-x-5 lg:gap-x-6">
							{FLOW.map((item) => (
								<li key={item[1]}>{link(item, 'whitespace-nowrap')}</li>
							))}
						</ul>
					</nav>
				</footer>
			</ShellSlot>
		</>
	);
}
