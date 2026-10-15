'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Fragment } from 'react';

import { routeTemplate } from '@/components/analytics/screen-views';
import { getPathname, Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocaleSwitch } from '@/i18n/use-locale-switch';
import { cn } from '@/lib/utils';

import { ringClass } from './page';

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

/** P1 layout variant of an internal pathname. Admin and portal (P19) and the dev galleries bring their own shell. */
export function shellVariant(pathname: string): 'content' | 'flow' | 'none' {
	if (/^\/(admin|portal|dev)(\/|$)/.test(pathname)) return 'none';
	return FLOW.has(routeTemplate(pathname)) ? 'flow' : 'content';
}

/** The variant of the current page. */
export const useShellVariant = () => shellVariant(usePathname());

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
			<svg viewBox="0 0 48 48" aria-hidden="true" className={small ? 'size-7' : 'size-8 md:size-9'}>
				<g className="fill-primary stroke-primary" strokeWidth="1.6" strokeLinejoin="round">
					<path d="M24 45.5 C24 45.5 10.5 33.2 10.5 24.4 A13.5 13.5 0 0 1 37.5 24.4 C37.5 33.2 24 45.5 24 45.5 Z M24 17.9 A6.5 6.5 0 1 0 24 30.9 A6.5 6.5 0 1 0 24 17.9 Z" />
					<path d="M12.2 19.6 L11.2 5 L22.6 11.4 Z" />
					<path d="M35.8 19.6 L25.4 11.4 L36.8 5 Z" />
				</g>
				<circle cx="24" cy="24.4" r="3.6" className="fill-status-reunited" />
			</svg>
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
 * Text toggle "SL / EN" (or the full names in the menu sheet), current language underlined. Plain links to the same
 * page in each language (hreflang, works without JS); with JS a click goes through useLocaleSwitch, which saves a
 * signed-in user's profile locale first (FR-036).
 */
export function LanguageSwitch({ full = false, className }: { full?: boolean; className?: string }) {
	const t = useTranslations('nav');
	const { locale, switchLocale } = useLocaleSwitch();
	const pathname = usePathname();
	const params = useParams();

	return (
		<div
			role="group"
			aria-label={t('language_label', { current: t(`language_${locale}_full`) })}
			className={cn('inline-flex items-center text-control font-semibold text-muted-foreground', className)}
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
						className={cn(
							'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-1.5 whitespace-nowrap hover:text-foreground aria-[current=true]:text-foreground aria-[current=true]:underline aria-[current=true]:decoration-primary aria-[current=true]:decoration-2 aria-[current=true]:underline-offset-6',
							ringClass
						)}
					>
						{t(full ? `language_${next}_full` : `language_${next}`)}
					</a>
				</Fragment>
			))}
		</div>
	);
}
