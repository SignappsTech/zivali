import { ImageResponse } from 'next/og';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { colors } from '@zivali/tokens/values';
import { about } from '@/content/pages/about';
import { faq } from '@/content/pages/faq';
import { forShelters } from '@/content/pages/for-shelters';
import { howItWorks } from '@/content/pages/how-it-works';
import { safety } from '@/content/pages/safety';
import { routing } from '@/i18n/routing';
import { OG_PAGES, type OgPage } from '@/lib/seo';

// Open Graph cards for the P3 pages (lib/seo pageMetadata), one per page and locale, built at build time: logo,
// wordmark and the page heading in the brand colours, until the image task delivers og-home.png. The URLs end in .png,
// so the proxy (locale rewrite) skips them.
export const dynamicParams = false;
export const generateStaticParams = () =>
	routing.locales.flatMap((locale) => OG_PAGES.map((page) => ({ image: `${locale}-${page}.png` })));

const ARTICLES = { 'how-it-works': howItWorks, safety, faq, 'for-shelters': forShelters, about };
const HOME = { sl: sl.pages.home.hero_title, en: en.pages.home.hero_title };

export async function GET(_request: Request, { params }: RouteContext<'/og/[image]'>) {
	const [, locale, page] = /^(sl|en)-([a-z-]+)\.png$/.exec((await params).image) ?? [];
	if (!(locale === 'sl' || locale === 'en') || !OG_PAGES.includes(page as OgPage))
		return new Response(null, { status: 404 });
	const heading = page === 'home' ? HOME[locale] : ARTICLES[page as Exclude<OgPage, 'home'>][locale].h1;
	const c = colors.light;

	return new ImageResponse(
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: 80,
				background: c.primary,
				color: c['primary-foreground'],
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
				<svg width="80" height="80" viewBox="0 0 48 48">
					<g
						fill={c['primary-foreground']}
						stroke={c['primary-foreground']}
						strokeWidth="1.6"
						strokeLinejoin="round"
					>
						<path d="M24 45.5 C24 45.5 10.5 33.2 10.5 24.4 A13.5 13.5 0 0 1 37.5 24.4 C37.5 33.2 24 45.5 24 45.5 Z M24 17.9 A6.5 6.5 0 1 0 24 30.9 A6.5 6.5 0 1 0 24 17.9 Z" />
						<path d="M12.2 19.6 L11.2 5 L22.6 11.4 Z" />
						<path d="M35.8 19.6 L25.4 11.4 L36.8 5 Z" />
					</g>
					<circle cx="24" cy="24.4" r="3.6" fill={c['status-reunited']} />
				</svg>
				<div style={{ fontSize: 56, letterSpacing: '-0.03em' }}>Najdimo</div>
			</div>
			<div style={{ display: 'flex', maxWidth: 1000, fontSize: 76, lineHeight: 1.1, letterSpacing: '-0.025em' }}>
				{heading}
			</div>
		</div>,
		{ width: 1200, height: 630 }
	);
}
