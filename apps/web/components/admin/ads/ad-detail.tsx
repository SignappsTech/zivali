'use client';

import { CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { StopCircleIcon } from '@phosphor-icons/react/dist/ssr/StopCircle';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { useGetAdStatsQuery } from '@zivali/api/ads';
import { useListAuditLogInfiniteQuery } from '@zivali/api/me';
import { flattenPages } from '@zivali/api/pagination';
import { formatCount, formatDate, timeZone } from '@zivali/i18n/format';
import type { AdminAd, AdStats } from '@zivali/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { Entries, Paging, Region } from '../audit-log';
import { adminH1Class, ErrorNote, noteClass, noteIconClass, tdClass, thClass } from '../directory/parts';
import { adPhase, addDays, byDay, type Counts, ctrOf, dayOf, groupBy, sum, toCsv } from './format';
import { Count, EndDialog, PhaseLabel, type RegionNames, useAdLabels, useAdminAd, useCtrText, useNow } from './parts';

const RANGES = [7, 30, 90] as const;
const h2Class = 'font-display text-2xl font-bold tracking-[-0.015em]';
const h3Class = 'font-display text-xl leading-7 font-semibold';
const tableCardClass = 'rounded-card bg-card px-4 pt-1 pb-2 text-card-foreground';
const tableClass = 'w-full border-collapse text-control leading-[22px] [&_tbody_tr:last-child>td]:border-b-0';
const numClass = cn(tdClass, 'text-right tabular-nums');

function download(name: string, csv: string) {
	const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A line per day (system chart-1), gridlines at 0, half and the top, a tick each week, the series named at its end. */
function DayChart({ label, days, values }: { label: string; days: string[]; values: number[] }) {
	const locale = useLocale();
	const tick = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'sl', {
		day: 'numeric',
		month: 'numeric',
		timeZone,
	});
	// An even top, so the middle gridline is a whole number.
	const top = Math.max(2, 2 * Math.ceil(Math.max(0, ...values) / 2));
	const [left, right, base, peak] = [8, 716, 124, 14];
	const x = (index: number) => left + (days.length > 1 ? (index * (right - left)) / (days.length - 1) : 0);
	const y = (value: number) => base - (value / top) * (base - peak);
	const last = values.length - 1;
	return (
		<svg viewBox="0 0 800 150" role="img" aria-label={label} className="block h-auto w-full overflow-visible">
			{[0, top / 2, top].map((value) => (
				<g key={value}>
					<line x1={left} x2={right} y1={y(value)} y2={y(value)} className="stroke-border" strokeWidth={1} />
					<text x={right + 8} y={y(value) + 4} className="fill-muted-foreground text-[13px]">
						{formatCount(Math.round(value), locale as 'sl' | 'en')}
					</text>
				</g>
			))}
			{days.map(
				(day, index) =>
					index % 7 === 0 && (
						<text
							key={day}
							x={x(index)}
							y={144}
							textAnchor="middle"
							className="fill-muted-foreground text-[13px]"
						>
							{tick.format(Date.parse(`${day}T12:00:00Z`))}
						</text>
					)
			)}
			<polyline
				points={values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')}
				fill="none"
				strokeWidth={2.5}
				strokeLinejoin="round"
				strokeLinecap="round"
				className="stroke-chart-1"
			/>
			{last >= 0 && (
				<>
					<circle cx={x(last)} cy={y(values[last]!)} r={4.5} className="fill-chart-1" />
					<text x={x(last) + 10} y={y(values[last]!) + 4} className="fill-foreground text-[13px] font-bold">
						{label}
					</text>
				</>
			)}
		</svg>
	);
}

/** Impressions, clicks and CTR per row of a breakdown; 1 to 4 read "< 5" and have no CTR. */
function CountsTable({
	caption,
	first,
	rows,
	visibleCaption = false,
}: {
	caption: string;
	first: string;
	rows: (Counts & { key: string; label: string })[];
	visibleCaption?: boolean;
}) {
	const t = useTranslations('admin');
	const ctrText = useCtrText();
	return (
		<div className={tableCardClass}>
			<table className={tableClass}>
				<caption className={visibleCaption ? 'px-3 py-3 text-left font-bold' : 'sr-only'}>{caption}</caption>
				<thead>
					<tr>
						<th scope="col" className={thClass}>
							{first}
						</th>
						<th scope="col" className={cn(thClass, 'text-right')}>
							{t('ads_col_impressions')}
						</th>
						<th scope="col" className={cn(thClass, 'text-right')}>
							{t('ads_col_clicks')}
						</th>
						<th scope="col" className={cn(thClass, 'text-right')}>
							{t('ads_col_ctr')}
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.key}>
							<td className={cn(tdClass, 'tabular-nums')}>{row.label}</td>
							<td className={numClass}>
								<Count value={row.impressions} />
							</td>
							<td className={numClass}>
								<Count value={row.clicks} />
							</td>
							<td className={numClass}>{ctrText(ctrOf(row))}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/** P20 statistics: totals, the days as charts and a table, slot and region breakdowns, the CSV of the rows. */
function Stats({ ad, regions, today }: { ad: AdminAd; regions: RegionNames; today: string }) {
	const t = useTranslations('admin');
	const locale = useLocale() as 'sl' | 'en';
	const labels = useAdLabels(regions);
	const ctrText = useCtrText();
	const [days, setDays] = React.useState<(typeof RANGES)[number]>(30);
	const from = addDays(today, 1 - days);
	const query = useGetAdStatsQuery({ id: ad.id, from, to: today });
	const rows: AdStats['items'] = query.data?.items ?? [];
	const totals = sum(rows);
	const daily = byDay(rows, from, today);
	const dayText = (day: string) => formatDate(`${day}T12:00:00Z`, locale);

	// Admin only: the rows hold exact counts (the screen shows "< 5"), and the CTR is the ratio as a 4-decimal string.
	function exportCsv() {
		const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day) || a.slot.localeCompare(b.slot));
		const csv = toCsv([
			[
				t('ads_col_day'),
				t('ads_preview_slot'),
				t('ads_col_region'),
				t('ads_col_impressions'),
				t('ads_col_clicks'),
				t('ads_col_ctr'),
			],
			...sorted.map((row) => [
				row.day,
				labels.slot(row.slot),
				labels.region(row.region_slug),
				row.impressions,
				row.clicks,
				row.ctr.toFixed(4),
			]),
		]);
		download(`ad-${ad.id.slice(0, 8)}-${from}-${today}.csv`, csv);
	}

	return (
		<section aria-labelledby="ad-stats" className="grid gap-8">
			<h2 id="ad-stats" className="sr-only">
				{t('ads_col_impressions')}, {t('ads_col_clicks')}, {t('ads_col_ctr')}
			</h2>
			<div className="flex flex-wrap items-end justify-between gap-6">
				<dl className="grid grid-cols-3 gap-6 sm:gap-12">
					{(
						[
							['ads_totals_impressions', formatCount(totals.impressions, locale)],
							['ads_totals_clicks', formatCount(totals.clicks, locale)],
							['ads_totals_ctr', ctrText(totals.impressions ? totals.clicks / totals.impressions : null)],
						] as const
					).map(([key, value]) => (
						<div key={key} className="flex flex-col-reverse">
							<dt>{t(key)}</dt>
							<dd className="font-display text-4xl font-bold tracking-[-0.02em] tabular-nums sm:text-5xl">
								{query.isLoading ? <Skeleton className="h-12 w-20" /> : value}
							</dd>
						</div>
					))}
				</dl>
				<FormField label={t('ads_range')} className="w-60">
					<Select value={String(days)} onValueChange={(value) => setDays(Number(value) as typeof days)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{RANGES.map((value) => (
								<SelectItem key={value} value={String(value)}>
									{t('ads_range_days', { days: value })}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
			</div>

			{query.isError ? (
				<ErrorNote
					action={
						<Button
							type="button"
							variant="text"
							size="sm"
							className="mt-1 -ml-3"
							onClick={() => void query.refetch()}
						>
							{t('retry')}
						</Button>
					}
				>
					{t('error')}
				</ErrorNote>
			) : (
				<>
					<figure className="grid gap-2">
						<figcaption className="text-sm text-muted-foreground">{t('ads_chart_alt')}</figcaption>
						<DayChart
							label={t('ads_col_impressions')}
							days={daily.map((day) => day.day)}
							values={daily.map((day) => day.impressions)}
						/>
						<DayChart
							label={t('ads_col_clicks')}
							days={daily.map((day) => day.day)}
							values={daily.map((day) => day.clicks)}
						/>
					</figure>
					<CountsTable
						caption={t('ads_by_day')}
						first={t('ads_col_day')}
						visibleCaption
						rows={[...daily].reverse().map((day) => ({ ...day, key: day.day, label: dayText(day.day) }))}
					/>
					<div className="grid gap-8 lg:grid-cols-2">
						<div className="grid gap-3">
							<h3 className={h3Class}>{t('ads_by_slot')}</h3>
							<CountsTable
								caption={t('ads_by_slot')}
								first={t('ads_preview_slot')}
								rows={groupBy(rows, (row) => row.slot).map((row) => ({
									...row,
									label: labels.slot(row.key as AdStats['items'][number]['slot']),
								}))}
							/>
						</div>
						<div className="grid gap-3">
							<h3 className={h3Class}>{t('ads_by_region')}</h3>
							<CountsTable
								caption={t('ads_by_region')}
								first={t('ads_col_region')}
								rows={groupBy(rows, (row) => row.region_slug ?? '').map((row) => ({
									...row,
									label: labels.region(row.key || null),
								}))}
							/>
						</div>
					</div>
				</>
			)}
			<div className="grid gap-4">
				<div>
					<Button type="button" variant="secondary" size="sm" disabled={!query.data} onClick={exportCsv}>
						<DownloadSimpleIcon weight="bold" aria-hidden="true" />
						{t('ads_export')}
					</Button>
				</div>
				<div className={noteClass} role="note">
					<InfoIcon weight="fill" aria-hidden="true" className={noteIconClass} />
					<p>{t('ads_method')}</p>
				</div>
			</div>
		</section>
	);
}

/** P20 history: this ad's audit entries (who, when, what), newest first. */
function History({ id }: { id: string }) {
	const t = useTranslations('admin');
	const query = useListAuditLogInfiniteQuery({ target_type: 'ad', target_id: id });
	const entries = flattenPages(query.data);
	return (
		<section aria-labelledby="ad-history" className="grid gap-4">
			<h2 id="ad-history" className={h2Class}>
				{t('ads_history')}
			</h2>
			<Region
				query={query}
				empty={
					entries.length === 0 && (
						<p role="status" className="rounded-card bg-card px-4 py-10 text-center">
							{t('empty')}
						</p>
					)
				}
			>
				<Entries entries={entries} caption={t('ads_history')} change />
				<Paging query={query} />
			</Region>
		</section>
	);
}

/** Loading, failed and unknown states of a page that needs one ad. */
export function AdLoader({ id, children }: { id: string; children: (ad: AdminAd) => React.ReactNode }) {
	const t = useTranslations('admin');
	const tErrors = useTranslations('errors');
	const tCommon = useTranslations('common');
	const { ad, query, searching } = useAdminAd(id);
	if (ad) return children(ad);
	if (query.isError)
		return (
			<ErrorNote
				action={
					<Button
						type="button"
						variant="text"
						size="sm"
						className="mt-1 -ml-3"
						onClick={() => void query.refetch()}
					>
						{t('retry')}
					</Button>
				}
			>
				{t('error')}
			</ErrorNote>
		);
	if (searching)
		return (
			<div className="grid gap-4" aria-busy="true">
				<Skeleton className="h-9 w-2/3" />
				<Skeleton className="h-6 w-1/3" />
				<p role="status" className="sr-only">
					{tCommon('loading')}
				</p>
			</div>
		);
	return <ErrorNote>{tErrors('NOT_FOUND')}</ErrorNote>;
}

/** P20 ad detail (admins, aal2): header with quick actions, statistics with CSV, change history. */
export function AdDetail({ id, regions }: { id: string; regions: RegionNames }) {
	return <AdLoader id={id}>{(ad) => <AdDetailView ad={ad} regions={regions} />}</AdLoader>;
}

function AdDetailView({ ad, regions }: { ad: AdminAd; regions: RegionNames }) {
	const t = useTranslations('admin');
	const now = useNow();
	const phase = adPhase(ad, now);
	const [ending, setEnding] = React.useState(false);
	return (
		<>
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
				<div className="grid gap-2">
					<h1 className={cn(adminH1Class, 'break-words')}>{ad.title}</h1>
					<PhaseLabel phase={phase} />
				</div>
				<div className="flex flex-wrap gap-2">
					{phase !== 'ended' && (
						<Button asChild variant="secondary" size="sm">
							<Link href={{ pathname: '/admin/ads/[id]/edit', params: { id: ad.id } }}>
								<PencilSimpleIcon weight="bold" aria-hidden="true" />
								{t('ads_action_edit')}
							</Link>
						</Button>
					)}
					<Button asChild variant="ghost" size="sm">
						<Link href={{ pathname: '/admin/ads/new', query: { from: ad.id } }}>
							<CopyIcon weight="bold" aria-hidden="true" />
							{t('ads_action_duplicate')}
						</Link>
					</Button>
					{phase !== 'ended' && phase !== 'draft' && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-destructive"
							onClick={() => setEnding(true)}
						>
							<StopCircleIcon weight="bold" aria-hidden="true" />
							{t('ads_action_end')}
						</Button>
					)}
				</div>
			</div>
			<Stats ad={ad} regions={regions} today={dayOf(now)} />
			<History id={ad.id} />
			{ending && <EndDialog ad={ad} onClose={() => setEnding(false)} />}
		</>
	);
}
