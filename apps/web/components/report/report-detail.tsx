import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { GiftIcon } from '@phosphor-icons/react/dist/ssr/Gift';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { formatDayMonth } from '@zivali/i18n/format';
import { AdSlot } from '@/components/ads/ad-slot';
import { AreaMap } from '@/components/report/area-map';
import { Gallery } from '@/components/report/gallery';
import { listOf } from '@/components/report/seo';
import { type DetailReport, ReportSlot } from '@/components/report/slots';
import { StatusWord } from '@/components/report/status-word';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ReportPlace } from '@/lib/report';
import { cn } from '@/lib/utils';

const h2Class = 'font-display text-2xl font-bold tracking-[-0.015em] text-balance lg:text-3xl';
const linkClass =
	'font-bold text-primary underline underline-offset-3 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';
// Stands in for the area name while splitting the area line around it, so only the name is bold.
const NAME = '\u0000';
// Patterns the colours already say (glossary §7.3: left out of generated text).
const SILENT_PATTERNS = new Set(['solid', 'bicolour', 'tricolour']);

/** Open or matched: the report still takes actions. Reunited keeps only share; closed has none (P9 status variants). */
export const isActive = (report: Pick<DetailReport, 'status'>) =>
	report.status === 'open' || report.status === 'matched';

/** The h1: the pet's name, else the P4 row title ("Najdena mačka"). */
function useReportTitle(report: Pick<DetailReport, 'name' | 'type' | 'species'>) {
	const t = useTranslations('browse');
	return report.name ?? t(`row_title_${report.type}`, { species: report.species });
}

/** Facts in two columns (three on tablets): label 14 muted over a 16 semibold value; the chip only as "Čip vpisan". */
function Facts({ report }: { report: DetailReport }) {
	const t = useTranslations('report');
	const ta = useTranslations('attributes');
	const locale = useLocale();
	const lower = (text: string) => text.toLocaleLowerCase(locale);
	const colour = [
		report.colours.length
			? listOf(
					report.colours.map((code) => lower(ta(`colours.${code}`))),
					locale
				)
			: '',
		report.pattern && !SILENT_PATTERNS.has(report.pattern) ? lower(ta(`patterns.${report.pattern}`)) : '',
	]
		.filter(Boolean)
		.join(', ');
	const facts = [
		[t('fact_colour'), colour],
		[t('fact_size'), report.size ? lower(ta(`size.${report.size}`)) : ''],
		// The collar text is a manager field; the public view only knows that one was described (CH-308a).
		[
			t('fact_collar'),
			report.is_mine ? (report.collar ?? '') : report.collar_described ? t('collar_described') : '',
		],
		[t('fact_chip'), report.has_chip ? t('chip_on_file') : t('chip_unknown')],
		[t('fact_sex'), report.sex && report.sex !== 'unknown' ? lower(ta(`sex.${report.sex}`)) : ''],
	].filter(([, value]) => value);

	return (
		<dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3 lg:mt-8 lg:grid-cols-2">
			{facts.map(([label, value]) => (
				<div key={label} className="min-w-0">
					<dt className="text-sm text-muted-foreground">{label}</dt>
					<dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{value}</dd>
				</div>
			))}
		</dl>
	);
}

/**
 * The reward line (display only, gift icon; no payment through the app) and the page's one safety note right under
 * it: the reward variant while a reward is shown, the owner's own reminder in their view (content slice §3, §5).
 */
function Safety({ report }: { report: DetailReport }) {
	const t = useTranslations('report');
	const format = useFormatter();
	const { reward } = report;
	const amount =
		reward?.eur != null
			? format.number(reward.eur, {
					style: 'currency',
					currency: 'EUR',
					minimumFractionDigits: 0,
					maximumFractionDigits: 0,
				})
			: undefined;
	const tips = (
		<Link href="/safety" className={linkClass}>
			{t('safety_link')}
		</Link>
	);
	const shield = (
		<ShieldCheckIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
	);

	return (
		<>
			{reward && (
				<p className="mt-6 flex items-center gap-3 font-semibold">
					<GiftIcon weight="fill" aria-hidden="true" className="size-[22px] shrink-0 text-status-reunited" />
					<span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">
						{amount ? t('reward_line_amount', { amount }) : t('reward_line')}
						{/* The owner's note is user text: never translated, never a link. */}
						{reward.note ? ` · ${reward.note}` : ''}
					</span>
				</p>
			)}
			{reward && report.is_mine ? (
				<p className="mt-3 flex gap-3 text-control leading-[22px]">
					{shield}
					<span>
						{t('owner_reward_note')} {tips}
					</span>
				</p>
			) : (
				<div role="note" className={cn(noteClass, reward ? 'mt-3' : 'mt-6')}>
					{shield}
					<p>
						{reward ? t('safety_note_reward') : t('safety_note')} {tips}
					</p>
				</div>
			)}
		</>
	);
}

/** "500 m" / "1,5 km". */
function useRadius(meters: number) {
	const format = useFormatter();
	return meters < 1000
		? `${format.number(meters)} m`
		: `${format.number(meters / 1000, { maximumFractionDigits: 1 })} km`;
}

/** P9 "Kje je bila videna": the fuzzed area on the map, the area and radius as text, the owner's own point. */
function Where({ report, place, title }: { report: DetailReport; place?: ReportPlace; title: string }) {
	const t = useTranslations('report');
	const tl = useTranslations('location');
	const radius = useRadius(report.area.radius_m);
	const type = report.type;
	const own = report.is_mine ? report.location : undefined;

	return (
		<section aria-labelledby="report-where" className="mt-16 lg:mt-24">
			<h2 id="report-where" className={h2Class}>
				{t('where_title')}
			</h2>
			<div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
				<div className="min-w-0 lg:col-span-7">
					<AreaMap
						area={report.area}
						type={type}
						title={title}
						photoUrl={report.photos[0]?.thumb_url}
						own={own}
						ownLabel={tl('exact_own')}
						label={place ? tl('area_map_alt', { area: place.area, radius }) : t('area_note')}
					>
						<p className="mt-2 text-sm text-muted-foreground">
							{place ? tl('area_line', { area: place.area, radius }) : t('area_note')}
						</p>
						{own && (
							<p className="mt-3 text-sm">
								<b>{tl('exact_own')}</b>
								<span className="block text-muted-foreground">{tl('exact_own_help')}</span>
							</p>
						)}
					</AreaMap>
				</div>
			</div>
		</section>
	);
}

/**
 * P9 report detail, web (Content variant, `lg`: photo 7 / info 5, the info column sticky; below `lg` one column with
 * the info before "Kaj se je zgodilo"). Public fields only, plus the manager fields in the owner's own view. The
 * named slots (components/report/slots) hold every action, so feature tasks fill them without layout changes.
 */
export function ReportDetail({ report, place }: { report: DetailReport; place?: ReportPlace }) {
	const t = useTranslations('report');
	const ta = useTranslations('attributes');
	const tbr = useTranslations('breeds');
	const tads = useTranslations('ads');
	const locale = useLocale();
	const title = useReportTitle(report);
	const active = isActive(report);

	const species = ta(`species.${report.species}`);
	const breed = report.breed_codes
		.filter((code) => !code.endsWith('.unknown') && tbr.has(code as Parameters<typeof tbr>[0]))
		.map((code) => tbr(code as Parameters<typeof tbr>[0]))
		.join(', ');
	const subtitle = [
		breed ? t('subtitle', { species, breed }) : species,
		report.sex && report.sex !== 'unknown' ? ta(`sex.${report.sex}`).toLocaleLowerCase(locale) : '',
	]
		.filter(Boolean)
		.join(' · ');
	const [before, after] = t('area_line', { area: NAME }).split(NAME);

	return (
		<main id="main" className="mx-auto box-content max-w-[1120px] px-5 pt-2 pb-12 md:px-12 lg:pb-24">
			<div className="grid gap-y-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-14">
				<div className="min-w-0 lg:col-span-7">
					<Button asChild variant="text" size="sm" className="-ml-3">
						<Link href="/map">
							<CaretLeftIcon weight="bold" aria-hidden="true" />
							{t('back')}
						</Link>
					</Button>
					{report.photos.length > 0 && <Gallery photos={report.photos} className="mt-3" />}
				</div>

				<div className="min-w-0 lg:sticky lg:top-6 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:self-start lg:pt-14">
					<ReportSlot name="matches-note" report={report} className="mb-8" />
					<p className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<StatusWord report={report} />
						{active && (
							<span className="text-muted-foreground">
								{t(`since_${report.type}`, { date: formatDayMonth(report.event_at, locale) })}
							</span>
						)}
					</p>
					<h1 className="mt-2 font-display text-[34px] leading-10 font-bold tracking-[-0.02em] text-balance [overflow-wrap:anywhere] lg:mt-3 lg:text-[64px] lg:leading-[64px]">
						{title}
					</h1>
					<p className="mt-1 text-lg text-muted-foreground lg:mt-2 lg:text-xl">{subtitle}</p>
					{report.status === 'reunited' && (
						<p className="mt-8 max-w-[34ch] text-lg leading-7 lg:text-xl lg:leading-8">
							{report.name ? t('reunited_named', { name: report.name }) : t('reunited')}
						</p>
					)}
					{report.status === 'closed' && (
						<p className="mt-8 text-lg leading-7 lg:text-xl lg:leading-8">{t('closed')}</p>
					)}

					<Facts report={report} />

					{report.status !== 'reunited' && (
						<div className="mt-8 flex gap-3">
							<MapPinAreaIcon
								weight="bold"
								aria-hidden="true"
								className={cn(
									'mt-0.5 size-6 shrink-0',
									active ? 'text-primary' : 'text-muted-foreground'
								)}
							/>
							<div className="min-w-0">
								{place && (
									<p>
										{before}
										<b>{place.area}</b>
										{after}
									</p>
								)}
								<p className="text-sm text-muted-foreground">{t('area_note')}</p>
							</div>
						</div>
					)}

					{/* Managers keep slot A once the report ended: "Ponovno odpri" within the reopen window (P14). */}
					{(active || report.is_mine) && <ReportSlot name="slot-a" report={report} className="mt-8" />}
					{active && <Safety report={report} />}
					<div className="mt-5 -ml-2 flex flex-wrap items-center gap-1 empty:hidden">
						<ReportSlot name="slot-b" report={report} place={place} />
						{active && <ReportSlot name="slot-c" report={report} />}
					</div>
				</div>

				{active && report.circumstances && (
					<section aria-labelledby="report-about" className="min-w-0 lg:col-span-7 lg:row-start-2">
						<h2 id="report-about" className={h2Class}>
							{report.type === 'lost' ? t('about_lost') : t('about_other')}
						</h2>
						<p className="mt-3 max-w-[58ch] whitespace-pre-line [overflow-wrap:anywhere] lg:mt-4">
							{report.circumstances}
						</p>
					</section>
				)}
			</div>

			{/* From lg the P21 sidebar (320 px, sticky) takes the right column beside the sections below the columns. */}
			<div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
				<div className="min-w-0">
					{active && <Where report={report} place={place} title={title} />}
					<ReportSlot name="ad" report={report} className="mt-16 lg:mt-24" />
					<ReportSlot name="near-here" report={report} className="mt-16 lg:mt-24" />
				</div>
				{/* Only an active report: the detail unit and the sidebar are never adjacent (P21). A collapsed sidebar leaves no empty landmark. */}
				{active && (
					<aside
						aria-label={tads('sidebar_label')}
						className="sticky top-6 mt-24 hidden empty:hidden lg:block"
					>
						<AdSlot slot="sidebar" species={report.species} region={report.region_slug} />
					</aside>
				)}
			</div>
		</main>
	);
}
