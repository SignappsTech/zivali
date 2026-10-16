import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { Browse } from '@/components/browse/browse';
import { PageMessages } from '@/components/page-messages';
import { StoreProvider } from '@/components/store-provider';
import { absoluteUrl, breadcrumbLd, jsonLd } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/map'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const t = await getTranslations({ locale, namespace: 'browse' });
	return {
		// The string carries the brand suffix itself (content slice §7), so not through the layout template.
		title: { absolute: t('seo_title') },
		description: t('seo_description'),
		// Filtered URLs (query parameters) point to the base URL (content slice §7).
		alternates: { canonical: absoluteUrl(locale, '/map') },
	};
}

/** P4 map and list (/zemljevid, /en/map; FR-007): the browse island with its own namespaces and the store. */
export default async function MapPage({ params }: PageProps<'/[locale]/map'>) {
	const locale = (await params).locale as Locale;
	const [t, tn, messages] = await Promise.all([
		getTranslations({ locale, namespace: 'browse' }),
		getTranslations({ locale, namespace: 'nav' }),
		getMessages({ locale }),
	]);

	return (
		<>
			<PageMessages messages={{ browse: messages.browse, map: messages.map, attributes: messages.attributes }}>
				<StoreProvider>
					<Browse />
				</StoreProvider>
			</PageMessages>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: jsonLd({
						'@graph': [
							{ '@type': 'CollectionPage', name: t('seo_title'), url: absoluteUrl(locale, '/map') },
							breadcrumbLd(locale, tn('map'), '/map'),
						],
					}),
				}}
			/>
		</>
	);
}
