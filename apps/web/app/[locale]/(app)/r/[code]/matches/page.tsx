import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { MatchReview } from '@/components/matches/match-review';
import { ContentPage } from '@/components/shell/page';

type Props = PageProps<'/[locale]/r/[code]/matches'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'matches' });
	return { title: t('title'), robots: { index: false } };
}

/**
 * P11 match review (`/r/[code]/ujemanja`, `/en/r/[code]/matches`; C15 group `app`, managers of the lost report, no
 * ads). `?m=<match id>` opens one match: the push, inbox and P9 links land on the list.
 */
export default async function MatchesPage({ params, searchParams }: Props) {
	const [{ code }, { m }] = await Promise.all([params, searchParams]);
	return (
		<ContentPage className="pt-6">
			<MatchReview code={code} selected={typeof m === 'string' ? m : undefined} />
		</ContentPage>
	);
}
