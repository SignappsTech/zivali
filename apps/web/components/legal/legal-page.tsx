import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getFormatter, getTranslations } from 'next-intl/server';

import { ContentPage, h1Class } from '@/components/shell/page';
import { noteClass } from '@/components/shelters/classes';
import { absoluteUrl } from '@/lib/seo';

export type LegalSlug = 'privacy' | 'cookies' | 'terms' | 'imprint' | 'accessibility';

type LegalMeta = { title: string; description: string; updated: string; headings: { id: string; text: string }[] };

// The MDX files hold the content strategist's drafts (docs/content/legal) with the SEO strings and the heading list as `meta`.
async function load(locale: Locale, slug: LegalSlug) {
	const mod = (await import(`@/content/legal/${locale}/${slug}.mdx`)) as {
		default: React.ComponentType;
		meta: LegalMeta;
	};
	return mod;
}

export async function legalMetadata(locale: Locale, slug: LegalSlug): Promise<Metadata> {
	const { meta } = await load(locale, slug);
	return {
		// The title carries the brand suffix itself, so not through the layout template.
		title: { absolute: meta.title },
		description: meta.description,
		alternates: { canonical: absoluteUrl(locale, `/${slug}`) },
	};
}

const tocLinkClass =
	'inline-flex min-h-11 items-center rounded-lg underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

// The MDX files use literal HTML tags (<h2 id>, <table>), which skip mdx-components.tsx, so the same T4 Article styles are applied to descendants here.
export const legalBodyClass = [
	'[&_h2]:mt-10 [&_h2]:scroll-mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2:first-child]:mt-0',
	'[&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold',
	'[&_p]:mt-4 [&_p]:leading-7',
	'[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:leading-7',
	'[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:leading-7',
	'[&_a]:underline [&_a]:underline-offset-4',
	'[&_table]:mt-4 [&_table]:w-full [&_table]:min-w-[560px] [&_table]:border-collapse [&_table]:text-left [&_table]:text-control',
	'[&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_th]:align-top [&_th]:font-bold',
	'[&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top',
].join(' ');

/** T4 Legal (P3): h1, last updated, draft note, "On this page" list (sticky from lg, a disclosure below), numbered body. */
export async function LegalPage({ locale, slug }: { locale: Locale; slug: LegalSlug }) {
	const [{ default: Body, meta }, t, format] = await Promise.all([
		load(locale, slug),
		getTranslations({ locale, namespace: 'legal' }),
		getFormatter({ locale }),
	]);
	const toc = (
		<ol className="grid gap-0.5">
			{meta.headings.map(({ id, text }) => (
				<li key={id}>
					<a href={`#${id}`} className={tocLinkClass}>
						{text}
					</a>
				</li>
			))}
		</ol>
	);

	return (
		<ContentPage>
			<div className="lg:grid lg:grid-cols-[240px_minmax(0,640px)] lg:gap-12">
				<nav aria-label={t('toc')} className="print:hidden lg:sticky lg:top-6 lg:self-start">
					<details className="mb-6 rounded-row bg-muted px-[18px] lg:hidden">
						<summary className="min-h-11 cursor-pointer py-3 font-bold">{t('toc')}</summary>
						<div className="pb-3">{toc}</div>
					</details>
					<div className="hidden lg:block">
						<p className="font-bold">{t('toc')}</p>
						<div className="mt-2">{toc}</div>
					</div>
				</nav>
				<article>
					<h1 className={h1Class}>{meta.title.replace(' · Najdimo', '')}</h1>
					<p className="mt-3 text-muted-foreground">
						{t('last_updated', { date: format.dateTime(new Date(meta.updated), { dateStyle: 'long' }) })}
					</p>
					<p role="note" className={`${noteClass} mt-6`}>
						<InfoIcon
							weight="fill"
							aria-hidden="true"
							className="mt-px size-[22px] shrink-0 text-primary"
						/>
						<span>{t('draft_note')}</span>
					</p>
					<div className={`mt-8 ${legalBodyClass}`}>
						<Body />
					</div>
				</article>
			</div>
		</ContentPage>
	);
}
