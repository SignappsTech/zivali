import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { PageMessages } from '@/components/page-messages';
import { LostFlow } from '@/components/report-lost/lost-flow';
import { StoreProvider } from '@/components/store-provider';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { absoluteUrl, breadcrumbLd, jsonLd } from '@/lib/seo';
import { getViewer } from '@/lib/viewer';

const HREF = '/report/lost';
// What the flow's client components translate (PageMessages adds the shell's namespaces).
const NAMESPACES = ['report_lost', 'pets', 'attributes', 'breeds', 'photos', 'location', 'map', 'permissions'] as const;

export async function generateMetadata({ params }: PageProps<'/[locale]/report/lost'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const t = await getTranslations({ locale, namespace: 'report_lost' });
	// The strings carry the brand suffix themselves (P6 content slice §12).
	return {
		title: { absolute: t('seo_title') },
		description: t('seo_description'),
		alternates: { canonical: absoluteUrl(locale, HREF) },
	};
}

/**
 * P6 report lost (`/prijava/izgubljena-zival`, `/en/report/lost`): public and indexable, the steps are client-side.
 * The flow needs an account; signed out, the page asks for one first (TASK-29.4 lets visitors fill the steps before
 * signing in). `?pet=` (from a pet profile) preselects that saved pet. Protected flow: no ad slot (C15).
 */
export default async function ReportLostPage({ params, searchParams }: PageProps<'/[locale]/report/lost'>) {
	const locale = (await params).locale as Locale;
	const pet = (await searchParams).pet;
	const [t, ta, messages, viewer] = await Promise.all([
		getTranslations({ locale, namespace: 'report_lost' }),
		getTranslations({ locale, namespace: 'auth' }),
		getMessages({ locale }),
		getViewer(),
	]);
	const next =
		getPathname({ locale, href: HREF }) + (typeof pet === 'string' ? `?pet=${encodeURIComponent(pet)}` : '');
	const ld = (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: jsonLd({
					'@graph': [
						{
							'@type': 'WebPage',
							url: absoluteUrl(locale, HREF),
							name: t('seo_title'),
							description: t('seo_description'),
							inLanguage: locale,
						},
						breadcrumbLd(locale, t('flow_label'), HREF),
					],
				}),
			}}
		/>
	);

	if (!viewer)
		return (
			<main id="main" className="mx-auto box-content max-w-[560px] px-5 pt-10 pb-16 lg:pt-16 lg:pb-24">
				<h1 className="font-display text-[34px] leading-10 font-bold tracking-[-0.02em] text-balance lg:text-5xl lg:leading-[52px]">
					{t('flow_label')}
				</h1>
				<p className="mt-3 text-lg leading-7">{t('gate_title')}</p>
				<div className="mt-8 grid gap-3">
					<Button asChild size="lg" className="w-full">
						<Link href={{ pathname: '/sign-in', query: { next } }}>{ta('gate_signin')}</Link>
					</Button>
					<Button asChild variant="secondary" className="w-full">
						<Link href={{ pathname: '/sign-up', query: { next } }}>{ta('gate_signup')}</Link>
					</Button>
				</div>
				{ld}
			</main>
		);

	return (
		<PageMessages messages={Object.fromEntries(NAMESPACES.map((ns) => [ns, messages[ns]]))}>
			<StoreProvider>
				<LostFlow initialPet={typeof pet === 'string' ? pet : undefined} />
			</StoreProvider>
			{ld}
		</PageMessages>
	);
}
