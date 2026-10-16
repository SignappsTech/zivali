import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { type Locale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@zivali/i18n/format';
import { noteClass } from '@/components/shelters/classes';
import { Skeleton } from '@/components/ui/skeleton';
import { GEO_DATA_DATE, getPartnerStats, regionOptions } from '@/lib/partners';
import { cn } from '@/lib/utils';

import { AudienceStats } from './audience';

const noteIconClass = 'mt-px size-[22px] shrink-0';
const linkClass =
	'underline underline-offset-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Loading (P22 W2): the numbers' final shape, announced once. */
export function AudienceSkeleton() {
	const t = useTranslations('common');

	return (
		<div aria-busy="true" className="grid gap-8">
			<p role="status" className="sr-only">
				{t('loading')}
			</p>
			<Skeleton className="h-[84px] w-full lg:max-w-[320px]" />
			<div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-3 lg:gap-x-12">
				{['w-24', 'w-[72px]', 'w-20'].map((width, index) => (
					<div key={width} className={cn('grid gap-3', index === 2 && 'col-span-2 lg:col-span-1')}>
						<Skeleton className={cn('h-12', width)} />
						<Skeleton className="h-5 w-32 max-w-full" />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * The live numbers from the newest hourly snapshot (C14), masked by the API and shown as they are, small ones
 * included: the pilot note, the date of the figures and the GURS attribution (the figures are by statistical region).
 * A failed call is the error note; the rest of the page is unaffected.
 */
export async function Audience({ locale }: { locale: Locale }) {
	const [stats, t, tc] = await Promise.all([
		getPartnerStats(locale),
		getTranslations({ locale, namespace: 'partners' }),
		getTranslations({ locale, namespace: 'common' }),
	]);
	if (!stats)
		return (
			<p role="status" className={noteClass}>
				<WarningIcon weight="bold" aria-hidden="true" className={noteIconClass} />
				<span>{t('stats_error')}</span>
			</p>
		);
	const generated = new Date(stats.generated_at);
	const attribution = tc('geo_attribution', {
		date: formatDate(GEO_DATA_DATE, locale, locale === 'sl' ? 'short' : 'long'),
	});
	const [before, after] = attribution.split('CC BY 4.0');

	return (
		<>
			<AudienceStats
				stats={{ totals: stats.totals, by_region: stats.by_region }}
				regions={regionOptions(
					locale,
					stats.by_region.map(({ region_slug }) => region_slug)
				)}
			/>
			{stats.pilot && (
				<div role="note" className={noteClass}>
					<InfoIcon weight="bold" aria-hidden="true" className={noteIconClass} />
					<p>{t('pilot_note')}</p>
				</div>
			)}
			<p className="text-sm text-muted-foreground">
				{t('stats_date', {
					datetime: `${formatDate(generated, locale)} ${formatDate(generated, locale, 'time')}`,
				})}{' '}
				{t('stats_source')}
				<br />
				{after === undefined ? (
					attribution
				) : (
					<>
						{before}
						<a href="https://creativecommons.org/licenses/by/4.0/" className={linkClass}>
							CC BY 4.0
						</a>
						{after}
					</>
				)}
			</p>
		</>
	);
}
