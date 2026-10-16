import { ChartBarIcon } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { ProhibitIcon } from '@phosphor-icons/react/dist/ssr/Prohibit';
import { TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FaqItem, h2Class } from '@/components/content/article';
import { PageMessages } from '@/components/page-messages';
import { AdPreviews } from '@/components/partners/ad-previews';
import { Audience, AudienceSkeleton } from '@/components/partners/audience-section';
import { EnquiryForm } from '@/components/partners/enquiry-form';
import { ContentPage, h1Class, SpotIllustration } from '@/components/shell/page';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { regionOptions } from '@/lib/partners';
import { absoluteUrl, breadcrumbLd, jsonLd, pageMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

// P22 Partners page "Oglašujte pri nas" (FR-032): server-rendered, no ad on it (P21). Client islands: the region
// switch of the live numbers and the enquiry form, with only their own `partners` strings (PageMessages).

/** Section anchors from the content slice, per language. */
const ANCHORS = {
	sl: { audience: 'obcinstvo', placements: 'mesta', vet: 'veterinarski-partner', enquiry: 'povprasevanje' },
	en: { audience: 'audience', placements: 'placements', vet: 'vet-partner', enquiry: 'enquiry' },
} as const;

const FAQ = [1, 2, 3, 4, 5, 6] as const;
const CLIENT_KEYS = /^(region_|stat_|form_|err_|success_|limited$|captcha_failed$|server_error$)/;
const sectionClass = 'grid scroll-mt-6 gap-8';

export async function generateMetadata({ params }: PageProps<'/[locale]/advertise'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const t = await getTranslations({ locale, namespace: 'partners' });
	return pageMetadata(locale, '/advertise', 'partners', {
		title: t('seo_title'),
		description: t('seo_description'),
		heading: t('hero_title'),
		alt: t('og_alt'),
	});
}

function CheckList({ items, className }: { items: string[]; className?: string }) {
	return (
		<ul className={cn('grid content-start gap-3', className)}>
			{items.map((item) => (
				<li key={item} className="flex gap-3">
					<CheckIcon
						weight="bold"
						aria-hidden="true"
						className="mt-[3px] size-[18px] shrink-0 text-primary"
					/>
					<span>{item}</span>
				</li>
			))}
		</ul>
	);
}

export default async function AdvertisePage({ params }: PageProps<'/[locale]/advertise'>) {
	const locale = (await params).locale as Locale;
	const [t, messages] = await Promise.all([
		getTranslations({ locale, namespace: 'partners' }),
		getMessages({ locale }),
	]);
	const id = ANCHORS[locale];
	const faq = FAQ.map((n) => [t(`faq_${n}_q`), t(`faq_${n}_a`)] as const);
	const partners = Object.fromEntries(Object.entries(messages.partners).filter(([key]) => CLIENT_KEYS.test(key)));
	const url = absoluteUrl(locale, '/advertise');

	return (
		<PageMessages messages={{ partners }}>
			<ContentPage>
				<div className="grid gap-16 lg:gap-24">
					<section className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
						<div className="grid justify-items-start gap-6 lg:col-span-7">
							<h1 className={h1Class}>{t('hero_title')}</h1>
							<p className="max-w-[52ch] text-lg leading-7">{t('hero_lede')}</p>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
								<Button asChild size="lg">
									<a href={`#${id.enquiry}`}>{t('hero_primary')}</a>
								</Button>
								<Button asChild variant="text">
									<a href={`#${id.placements}`}>{t('hero_secondary')}</a>
								</Button>
							</div>
						</div>
						{/* Stands in for assets/house-ad-partner.png (P22 §11) until the image task delivers it. */}
						<SpotIllustration className="lg:col-span-5" />
					</section>

					<section id={id.audience} className={sectionClass}>
						<h2 className={h2Class}>{t('audience_title')}</h2>
						<Suspense fallback={<AudienceSkeleton />}>
							<Audience locale={locale} />
						</Suspense>
					</section>

					<section id={id.placements} className={sectionClass}>
						<h2 className={h2Class}>{t('slots_title')}</h2>
						<AdPreviews />
						<div>
							<h3 className="font-bold">{t('format_title')}</h3>
							<p className="mt-1 max-w-[62ch]">{t('format_body')}</p>
						</div>
					</section>

					<section className="grid gap-6 lg:grid-cols-12 lg:gap-12">
						<div className="lg:col-span-5">
							<h2 className={h2Class}>{t('targeting_title')}</h2>
							<p className="mt-3">{t('targeting_body')}</p>
						</div>
						<CheckList
							className="lg:col-span-7"
							items={[
								t('targeting_region'),
								t('targeting_municipality'),
								t('targeting_species'),
								t('targeting_dates'),
							]}
						/>
					</section>

					<section id={id.vet} className={sectionClass}>
						<div className="max-w-[62ch]">
							<h2 className={h2Class}>{t('vet_title')}</h2>
							<p className="mt-3">{t('vet_lede')}</p>
						</div>
						<CheckList
							className="max-w-[62ch]"
							items={[t('vet_1'), t('vet_2'), t('vet_3'), t('vet_4'), t('vet_5')]}
						/>
						<div role="note" className={cn(noteClass, 'max-w-[62ch]')}>
							<HeartIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
							<div>
								<p className="font-bold">{t('vet_free_title')}</p>
								<p>{t('vet_free_body')}</p>
							</div>
						</div>
						<div>
							<Button asChild variant="secondary">
								<a href={`#${id.enquiry}`}>{t('vet_cta')}</a>
							</Button>
						</div>
					</section>

					<section className={sectionClass}>
						<h2 className={h2Class}>{t('trust_title')}</h2>
						<ul className="grid max-w-[62ch] gap-5">
							{(
								[
									[TagIcon, t('trust_1')],
									[ProhibitIcon, t('trust_2')],
									[ChartBarIcon, t('trust_3')],
								] as const
							).map(([Icon, text]) => (
								<li key={text} className="flex gap-4">
									<Icon aria-hidden="true" className="size-6 shrink-0 text-primary" />
									<p>{text}</p>
								</li>
							))}
						</ul>
					</section>

					<section className={sectionClass}>
						<div className="max-w-[62ch]">
							<h2 className={h2Class}>{t('pricing_title')}</h2>
							<p className="mt-3">{t('pricing_body')}</p>
						</div>
						{/* The media kit link (partners.media_kit) stays out until the PDF exists (content slice §7). */}
						<ol className="grid max-w-[62ch] gap-5">
							{[t('step_1'), t('step_2'), t('step_3')].map((step, index) => (
								<li key={step} className="flex gap-4">
									<span
										aria-hidden="true"
										className="w-5 shrink-0 font-display text-xl leading-6 font-bold text-primary tabular-nums"
									>
										{index + 1}
									</span>
									<p>{step}</p>
								</li>
							))}
						</ol>
					</section>

					<section id={id.enquiry} className="grid max-w-[560px] scroll-mt-6 gap-6">
						<EnquiryForm regions={regionOptions(locale)} />
					</section>

					<section className={sectionClass}>
						<h2 className={h2Class}>{t('faq_title')}</h2>
						<div className="grid max-w-[820px] gap-3">
							{faq.map(([question, answer]) => (
								<FaqItem key={question} question={question} answer={answer} />
							))}
						</div>
					</section>
				</div>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: jsonLd({
							'@graph': [
								{
									'@type': 'WebPage',
									name: t('hero_title'),
									description: t('seo_description'),
									url,
									inLanguage: locale,
								},
								breadcrumbLd(locale, t('hero_title'), '/advertise'),
								{
									'@type': 'FAQPage',
									url,
									inLanguage: locale,
									mainEntity: faq.map(([question, answer]) => ({
										'@type': 'Question',
										name: question,
										acceptedAnswer: { '@type': 'Answer', text: answer },
									})),
								},
							],
						}),
					}}
				/>
			</ContentPage>
		</PageMessages>
	);
}
