import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { LightbulbIcon } from '@phosphor-icons/react/dist/ssr/Lightbulb';
import { MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { type Locale, useLocale, useTranslations } from 'next-intl';
import { Fragment, type ReactNode } from 'react';

import { ContentPage, h1Class, ringClass } from '@/components/shell/page';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { absoluteUrl, breadcrumbLd, jsonLd } from '@/lib/seo';
import { cn } from '@/lib/utils';

// P3 T2 Article and T3 FAQ as server components: no client JS (the FAQ rows and the mobile "On this page" are native
// <details>). Long copy lives in content/pages/*.ts, not in the catalogues, which go to the client on every page.

/** An internal pathname of the C15 route table (next-intl `pathnames`). */
export type Pathname = Extract<Parameters<typeof getPathname>[0]['href'], string>;

/** One shared contact address until the client names its addresses (P3 content slice, open point 1). */
export const SUPPORT_EMAIL = 'podpora@najdimo.si';

/** A paragraph, a numbered or bulleted list, or the tip note. Text takes inline `**bold**` and `[text](href)`. */
export type Block = string | { ol: string[] } | { ul: string[] } | { tip: string };

type Page = { seo: { title: string; description: string }; crumb: string; h1: string; lede: string };

export type ArticleContent = Page & {
	/** `id` defaults to the title as a slug. */
	sections: { id?: string; title: string; blocks: Block[] }[];
	/** The closing action row: at most one primary. */
	actions?: { label: string; href: Pathname | `mailto:${string}`; primary?: boolean }[];
};

export type FaqContent = Page & {
	groups: { title: string; items: [question: string, answer: string][] }[];
	note: string;
};

export const h2Class = 'hyphens-auto font-display text-2xl font-bold tracking-[-0.015em] text-balance lg:text-3xl';
const ledeClass = 'mt-3 text-lg leading-7 lg:mt-4 lg:text-xl lg:leading-8';
const inlineLinkClass = `rounded-[4px] text-primary underline decoration-1 underline-offset-3 hover:decoration-2 ${ringClass}`;
const tocLinkClass = `flex min-h-11 items-center rounded-xl py-2.5 pr-3 pl-4 text-control leading-5 font-semibold text-muted-foreground hover:bg-foreground/10 hover:text-foreground ${ringClass}`;
// System 10.9 accordion row: card surface, radius 20, plus/minus in primary, hover foreground at 10 %.
const rowClass = 'group rounded-row bg-card text-card-foreground';
const summaryClass = `flex w-full cursor-pointer list-none items-center justify-between gap-4 rounded-row text-left hover:bg-foreground/10 group-open:rounded-b-none [&::-webkit-details-marker]:hidden ${ringClass}`;

const INLINE = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;

const slug = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** `/advertise#vet-partner` → the localised path with its hash; `mailto:` stays as it is. */
function localHref(locale: Locale, href: string, absolute = false) {
	if (!href.startsWith('/')) return href;
	const [path, hash] = href.split('#') as [Pathname, string | undefined];
	return (absolute ? absoluteUrl(locale, path) : getPathname({ locale, href: path })) + (hash ? `#${hash}` : '');
}

/** Inline `**bold**` and `[text](href)`; internal paths are C15 keys, localised here. */
export function Rich({ text }: { text: string }) {
	const locale = useLocale();
	const parts: ReactNode[] = [];
	let last = 0;
	for (const match of text.matchAll(INLINE)) {
		const [whole, bold, label, href = ''] = match;
		parts.push(text.slice(last, match.index));
		parts.push(
			bold ? (
				<b key={match.index}>{bold}</b>
			) : (
				<a
					key={match.index}
					href={localHref(locale, href)}
					className={cn(inlineLinkClass, href.startsWith('mailto:') && '[overflow-wrap:anywhere]')}
				>
					{label}
				</a>
			)
		);
		last = match.index + whole.length;
	}
	parts.push(text.slice(last));
	return <>{parts}</>;
}

/** JSON-LD text: bold dropped, links kept as absolute `<a>` (FAQPage answers allow them). */
const plain = (locale: Locale, text: string) =>
	text.replace(INLINE, (_, bold?: string, label?: string, href?: string) =>
		bold ? bold : `<a href="${localHref(locale, href!, true)}">${label}</a>`
	);

function ToggleIcon() {
	return (
		<>
			<PlusIcon weight="bold" aria-hidden="true" className="size-6 shrink-0 text-primary group-open:hidden" />
			<MinusIcon
				weight="bold"
				aria-hidden="true"
				className="hidden size-6 shrink-0 text-primary group-open:block"
			/>
		</>
	);
}

function BackLink() {
	const t = useTranslations('common');

	return (
		<Button asChild variant="text" size="sm" className="-ml-3">
			<Link href="/">
				<ArrowLeftIcon weight="bold" aria-hidden="true" />
				{t('breadcrumb_back', { page: t('breadcrumb_home') })}
			</Link>
		</Button>
	);
}

function BlockView({ block }: { block: Block }) {
	if (typeof block === 'string')
		return (
			<p className="mt-4">
				<Rich text={block} />
			</p>
		);
	if ('ol' in block)
		return (
			<ol className="mt-4 grid gap-5">
				{block.ol.map((item, index) => (
					<li key={item} className="flex gap-4">
						<span
							aria-hidden="true"
							className="w-5 shrink-0 font-display text-xl leading-6 font-bold text-primary tabular-nums"
						>
							{index + 1}
						</span>
						<p className="min-w-0">
							<Rich text={item} />
						</p>
					</li>
				))}
			</ol>
		);
	if ('ul' in block)
		return (
			<ul className="mt-4 grid list-disc gap-3 pl-[22px] marker:text-muted-foreground">
				{block.ul.map((item) => (
					<li key={item} className="pl-1">
						<Rich text={item} />
					</li>
				))}
			</ul>
		);
	return (
		<div role="note" className={cn(noteClass, 'mt-4')}>
			<LightbulbIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
			<p className="min-w-0">
				<Rich text={block.tip} />
			</p>
		</div>
	);
}

/**
 * T2 Article: back link, h1, lede, body at 640 px with h2 sections, a closing action row. More than five sections get
 * "On this page": a sticky list from lg (240 + 48 + 640 = 928 px), one collapsed row above the body below lg.
 */
export function ArticlePage({
	content,
	href,
	schema,
}: {
	content: ArticleContent;
	href: Pathname;
	schema: 'WebPage' | 'Article' | 'AboutPage';
}) {
	const locale = useLocale();
	const tLegal = useTranslations('legal');
	const sections = content.sections.map((section) => ({ ...section, id: section.id ?? slug(section.title) }));
	const toc = sections.length > 5;
	const tocList = (
		<ul className="grid gap-0.5">
			{sections.map(({ id, title }) => (
				<li key={id}>
					<a href={`#${id}`} className={tocLinkClass}>
						{title}
					</a>
				</li>
			))}
		</ul>
	);
	const org = { '@type': 'Organization', name: 'Najdimo', url: absoluteUrl(locale, '/') };
	const page = { description: content.seo.description, url: absoluteUrl(locale, href), inLanguage: locale };

	return (
		<ContentPage>
			<div className={cn(toc && 'lg:grid lg:grid-cols-[240px_minmax(0,640px)] lg:items-start lg:gap-12')}>
				{toc && (
					<nav aria-labelledby="toc-title" className="sticky top-6 hidden lg:block">
						<p id="toc-title" className="mb-2 pl-4 text-control leading-5 font-bold text-muted-foreground">
							{tLegal('toc')}
						</p>
						{tocList}
					</nav>
				)}
				<article className="max-w-[640px] break-words">
					<BackLink />
					<h1 className={cn(h1Class, 'mt-4 hyphens-auto')}>{content.h1}</h1>
					<p className={ledeClass}>{content.lede}</p>
					{toc && (
						<details className={cn(rowClass, 'mt-8 lg:hidden')}>
							<summary className={cn(summaryClass, 'min-h-14 px-5 py-4 font-bold')}>
								{tLegal('toc')}
								<ToggleIcon />
							</summary>
							<nav aria-label={tLegal('toc')} className="px-2 pb-3">
								{tocList}
							</nav>
						</details>
					)}
					{sections.map(({ id, title, blocks }) => (
						<Fragment key={id}>
							<h2 id={id} className={cn(h2Class, 'mt-10 scroll-mt-6 lg:mt-12')}>
								{title}
							</h2>
							{blocks.map((block, index) => (
								<BlockView key={index} block={block} />
							))}
						</Fragment>
					))}
					{content.actions && (
						<div className="mt-12 grid gap-1 lg:mt-16 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
							{content.actions.map(({ label, href: target, primary }) => {
								const inner = primary ? (
									label
								) : (
									<>
										{label}
										<ArrowRightIcon weight="bold" aria-hidden="true" />
									</>
								);
								return (
									<Button
										key={label}
										asChild
										size="lg"
										variant={primary ? 'default' : 'text'}
										// A lone text button sits flush with the text; otherwise full width below lg (system 10.2).
										className={
											primary || content.actions!.length > 1
												? 'w-full lg:w-auto'
												: '-ml-3 justify-self-start'
										}
									>
										{target.startsWith('mailto:') ? (
											<a href={target}>{inner}</a>
										) : (
											<Link href={target as Pathname}>{inner}</Link>
										)}
									</Button>
								);
							})}
						</div>
					)}
				</article>
			</div>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: jsonLd({
						'@graph': [
							schema === 'Article'
								? { '@type': 'Article', headline: content.h1, author: org, publisher: org, ...page }
								: { '@type': schema, name: content.h1, ...page },
							breadcrumbLd(locale, content.crumb, href),
						],
					}),
				}}
			/>
		</ContentPage>
	);
}

/** One T3 question row (system 10.9 accordion): a native disclosure with the question as h3; P22 reuses it. */
export function FaqItem({ question, answer }: { question: string; answer: string }) {
	return (
		<details className={rowClass}>
			<summary className={cn(summaryClass, 'min-h-16 px-5 py-[18px] lg:min-h-[76px] lg:p-6')}>
				<h3 className="min-w-0 hyphens-auto font-display text-lg leading-7 font-semibold tracking-[-0.005em] lg:text-xl">
					{question}
				</h3>
				<ToggleIcon />
			</summary>
			<p className="max-w-[62ch] px-5 pb-5 lg:px-6 lg:pb-6">
				<Rich text={answer} />
			</p>
		</details>
	);
}

/** T3 FAQ: back link, h1, lede, grouped question rows (native disclosure, h3 inside), a closing contact note. */
export function FaqPage({ content, href }: { content: FaqContent; href: Pathname }) {
	const locale = useLocale();

	return (
		<ContentPage>
			<div className="max-w-[640px] break-words">
				<BackLink />
				<h1 className={cn(h1Class, 'mt-4 hyphens-auto')}>{content.h1}</h1>
				<p className={ledeClass}>{content.lede}</p>
				{content.groups.map(({ title, items }) => (
					<section key={title} className="mt-12">
						<h2 className={h2Class}>{title}</h2>
						<div className="mt-5 grid grid-cols-1 gap-3">
							{items.map(([question, answer]) => (
								<FaqItem key={question} question={question} answer={answer} />
							))}
						</div>
					</section>
				))}
				<div role="note" className={cn(noteClass, 'mt-12')}>
					<EnvelopeSimpleIcon
						weight="fill"
						aria-hidden="true"
						className="mt-px size-[22px] shrink-0 text-primary"
					/>
					<p className="min-w-0">
						<Rich text={content.note} />
					</p>
				</div>
			</div>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: jsonLd({
						'@graph': [
							{
								'@type': 'FAQPage',
								url: absoluteUrl(locale, href),
								inLanguage: locale,
								mainEntity: content.groups.flatMap(({ items }) =>
									items.map(([question, answer]) => ({
										'@type': 'Question',
										name: question,
										acceptedAnswer: { '@type': 'Answer', text: plain(locale, answer) },
									}))
								),
							},
							breadcrumbLd(locale, content.crumb, href),
						],
					}),
				}}
			/>
		</ContentPage>
	);
}
