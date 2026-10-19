import { RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { useLocale, useTranslations } from 'next-intl';
import type * as React from 'react';

import { formatDistanceBand, formatRelative, type Locale } from '@zivali/i18n/format';
import type { PublicReport } from '@zivali/types';
import { Badge } from '@/components/ui/badge';
import { type Status, StatusLabel } from '@/components/ui/status-label';
import { Link } from '@/i18n/navigation';
import { photoCrop } from '@/lib/photo';
import { cn } from '@/lib/utils';

import { distanceBand, distanceKm, type Point } from './filters';

type Translate = ReturnType<typeof useTranslations<'browse'>>;

/** Row title: the pet's name, else "Izgubljen pes", "Najdena mačka" … (content slice §2). Map pins carry no name. */
export const reportTitle = (
	t: Translate,
	r: Pick<PublicReport, 'type' | 'species'> & { name?: string | null }
): string => (r.name ? t('row_title_named', { name: r.name }) : t(`row_title_${r.type}`, { species: r.species }));

/** Status word and its icon: the report type while open, "Spet doma" or "Zaključeno" once it ends. */
export function reportStatus(
	t: Translate,
	r: Pick<PublicReport, 'type'> & { status?: PublicReport['status'] }
): { status: Status; word: string } {
	if (r.status === 'reunited') return { status: 'reunited', word: t('status_reunited') };
	return { status: r.type, word: r.status === 'closed' ? t('status_closed') : t(`status_${r.type}`) };
}

/** The distance band to `area` ("1–3 km"), empty without a centre. */
export function useDistance(center: Point | null, area: Point): string {
	const t = useTranslations('browse');
	const locale = useLocale() as Locale;
	return center
		? t('row_distance', { band: formatDistanceBand(distanceBand(distanceKm(center, area)), locale) })
		: '';
}

export const rowId = (code: string) => `row-${code}`;

/**
 * P4 pet row (system §10.6): photo 64 radius 20, title 20/28, status word · time, the `premium` pill under it when
 * boosted, distance band on the right (only with a centre). A link to the report whose name comes from the visible title, status,
 * time and distance (no aria-label, WCAG 2.5.3), so the list offers what a marker press does on the map.
 */
export function ReportRow({
	report,
	center,
	selected,
	...events
}: {
	report: PublicReport;
	center: Point | null;
	/** Its marker's preview is open (P4 web). */
	selected?: boolean;
} & Pick<React.ComponentProps<'a'>, 'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur'>) {
	const t = useTranslations('browse');
	const locale = useLocale() as Locale;
	const title = reportTitle(t, report);
	const { status, word } = reportStatus(t, report);
	const time = formatRelative(report.event_at, locale);
	const distance = useDistance(center, report.area);
	const photo = report.photos[0];
	return (
		<Link
			id={rowId(report.short_code)}
			href={{ pathname: '/r/[code]', params: { code: report.short_code } }}
			data-selected={selected || undefined}
			className="-m-2 flex items-center gap-4 rounded-row p-2 text-foreground hover:bg-foreground/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-accent active:text-accent-foreground data-selected:bg-foreground/10"
			{...events}
		>
			{photo ? (
				// eslint-disable-next-line @next/next/no-img-element -- a 64 px thumbnail from the media host
				<img
					src={photo.thumb_url}
					alt=""
					width={64}
					height={64}
					loading="lazy"
					className={cn('size-16 shrink-0 rounded-row bg-muted', photoCrop)}
				/>
			) : (
				<span aria-hidden="true" className="size-16 shrink-0 rounded-row bg-muted" />
			)}
			<span className="min-w-0 flex-1">
				<span className="block font-display text-xl leading-7 font-semibold tracking-[-0.01em]">{title}</span>
				<span className="flex flex-wrap items-center gap-x-2 text-sm">
					<StatusLabel status={status}>{word}</StatusLabel>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<span className="text-muted-foreground tabular-nums">{time}</span>
				</span>
				{report.boosted && (
					<Badge variant="premium" className="mt-2">
						<RocketLaunchIcon weight="fill" aria-hidden="true" />
						{t('boosted')}
					</Badge>
				)}
			</span>
			{distance && <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{distance}</span>}
		</Link>
	);
}
