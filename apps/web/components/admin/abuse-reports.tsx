'use client';

import type { Icon } from '@phosphor-icons/react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { FlagIcon } from '@phosphor-icons/react/dist/ssr/Flag';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { useListAdminAbuseReportsInfiniteQuery, useListModerationFlagsInfiniteQuery } from '@zivali/api/abuse';
import { flattenPages } from '@zivali/api/pagination';
import { formatCount, formatDate } from '@zivali/i18n/format';
import {
	ABUSE_STATUSES,
	ABUSE_TARGET_TYPES,
	type AbuseStatus,
	type AbuseTargetType,
	type AdminAbuseReport,
	type ModerationFlag,
} from '@zivali/types';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { FilterPill, Paging, Region, shortId, tableClass } from './audit-log';
import { adminH1Class, tdClass, thClass } from './directory/parts';

/** One row of either list: a report's reason or a flag's kind, its weight (a flag's from `details`) and status. */
type Row = Pick<AdminAbuseReport, 'id' | 'target_id' | 'target_code' | 'created_at'> & {
	target_type: ModerationFlag['target_type'];
	label: string;
	note: string | null;
	weight: number | null;
	status: AbuseStatus | 'resolved';
};

const STATUS_ICONS: Record<Row['status'], Icon> = {
	open: FlagIcon,
	actioned: CheckCircleIcon,
	dismissed: XCircleIcon,
	resolved: CheckCircleIcon,
};

// Text link in a dense row: 44 px target, underline (system §10.9).
const linkClass =
	'inline-flex min-h-11 items-center rounded-sm font-bold underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Status word: icon + word; open in the text colour, settled ones muted (never colour alone). */
function Status({ status }: { status: Row['status'] }) {
	const t = useTranslations('admin');
	const StatusIcon = STATUS_ICONS[status];
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap',
				status !== 'open' && 'text-muted-foreground'
			)}
		>
			<StatusIcon weight="fill" aria-hidden="true" className="size-4 shrink-0" />
			{t(`abuse.status_${status}`)}
		</span>
	);
}

/** The listing (or, for a message, the listing its conversation is about); profiles and pets as a short id. */
function Target({ row }: { row: Row }) {
	const t = useTranslations('admin');
	if (!row.target_code)
		return (
			<span className="tabular-nums">
				{t(`abuse.target_${row.target_type}`)} {shortId(row.target_id)}
			</span>
		);
	return (
		<Link href={{ pathname: '/r/[code]', params: { code: row.target_code } }} className={linkClass}>
			{t(row.target_type === 'message' ? 'abuse.link_message' : 'abuse.link_report', { code: row.target_code })}
		</Link>
	);
}

/** The dense table from lg, stacked rows below (P19 table pattern); newest first, read only. */
function Rows({ rows, caption, label }: { rows: Row[]; caption: string; label: string }) {
	const t = useTranslations('admin');
	const locale = useLocale();
	const date = (row: Row) => `${formatDate(row.created_at, locale)} ${formatDate(row.created_at, locale, 'time')}`;
	const weight = (row: Row) => (row.weight === null ? '–' : formatCount(row.weight, locale));
	return (
		<div className="rounded-card bg-card px-4 pt-1 pb-2 text-card-foreground">
			<table className={tableClass}>
				<caption className="sr-only">{caption}</caption>
				<thead>
					<tr>
						<th scope="col" className={thClass}>
							{t('abuse.col_target')}
						</th>
						<th scope="col" className={thClass}>
							{label}
						</th>
						<th scope="col" className={cn(thClass, 'text-right')}>
							{t('abuse.col_weight')}
						</th>
						<th scope="col" className={thClass}>
							{t('abuse.col_status')}
						</th>
						<th scope="col" aria-sort="descending" className={cn(thClass, 'text-foreground')}>
							{t('abuse.col_date')}
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.id} className="transition-colors hover:bg-accent/60 motion-reduce:transition-none">
							<td className={tdClass}>
								<Target row={row} />
							</td>
							<td className={cn(tdClass, 'break-words')}>
								{row.label}
								{row.note && <p className="text-sm text-muted-foreground">{row.note}</p>}
							</td>
							<td className={cn(tdClass, 'text-right tabular-nums')}>{weight(row)}</td>
							<td className={tdClass}>
								<Status status={row.status} />
							</td>
							<td className={cn(tdClass, 'whitespace-nowrap text-muted-foreground tabular-nums')}>
								{date(row)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<ul aria-label={caption} className="lg:hidden [&>li:last-child]:border-b-0">
				{rows.map((row) => (
					<li key={row.id} className="border-b border-border py-2">
						<p className="flex flex-wrap items-center justify-between gap-x-4">
							<span className="font-bold">{row.label}</span>
							<Status status={row.status} />
						</p>
						{row.note && <p className="text-sm break-words text-muted-foreground">{row.note}</p>}
						<Target row={row} />
						<p className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground tabular-nums">
							<span>
								{t('abuse.col_weight')}: {weight(row)}
							</span>
							<span>{date(row)}</span>
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}

function Empty({ onClear }: { onClear?: () => void }) {
	const t = useTranslations('admin');
	return (
		<div className="rounded-card bg-card px-4 py-10 text-center">
			<p role="status" className="font-display text-xl font-semibold">
				{t('empty')}
			</p>
			{onClear && (
				<Button variant="secondary" size="sm" className="mt-4" onClick={onClear}>
					{t('filters_clear')}
				</Button>
			)}
		</div>
	);
}

/**
 * P19 abuse reports and moderation flags (moderators and admins, aal2; C11) until the moderation queue (M4): what was
 * reported, why, its weight and status, linked to the listing; reports filtered by status and target type.
 */
export function AbuseReports() {
	const t = useTranslations('admin');
	const [status, setStatus] = React.useState<AbuseStatus | ''>('');
	const [target, setTarget] = React.useState<AbuseTargetType | ''>('');
	const reports = useListAdminAbuseReportsInfiniteQuery({
		status: status || undefined,
		target_type: target || undefined,
	});
	const flags = useListModerationFlagsInfiniteQuery({});
	const filtered = Boolean(status || target);
	const clear = () => {
		setStatus('');
		setTarget('');
	};

	const reportRows = flattenPages(reports.data).map((report): Row => ({
		...report,
		label: t(`abuse.reason_${report.reason}`),
	}));
	const flagRows = flattenPages(flags.data).map((flag): Row => ({
		...flag,
		label: t(`abuse.kind_${flag.kind}`),
		note: null,
		weight: typeof flag.details.weight === 'number' ? flag.details.weight : null,
		status: flag.resolved_at ? 'resolved' : 'open',
	}));

	return (
		<>
			<h1 className={adminH1Class}>{t('nav_abuse')}</h1>
			<div className="grid gap-4">
				<div role="group" aria-label={t('filters')} className="flex flex-wrap items-center gap-2">
					<FilterPill
						label={t('abuse.col_status')}
						value={status}
						options={ABUSE_STATUSES.map((value) => ({ value, label: t(`abuse.status_${value}`) }))}
						onChange={(value) => setStatus(value as AbuseStatus)}
					/>
					<FilterPill
						label={t('abuse.col_target')}
						value={target}
						options={ABUSE_TARGET_TYPES.map((value) => ({ value, label: t(`abuse.target_${value}`) }))}
						onChange={(value) => setTarget(value as AbuseTargetType)}
					/>
					{filtered && (
						<Button variant="text" size="sm" onClick={clear}>
							{t('filters_clear')}
						</Button>
					)}
				</div>
				<div>
					<Region
						query={reports}
						empty={reportRows.length === 0 && <Empty onClear={filtered ? clear : undefined} />}
					>
						<Rows rows={reportRows} caption={t('nav_abuse')} label={t('abuse.col_reason')} />
						<Paging query={reports} />
					</Region>
				</div>
			</div>
			<section aria-labelledby="moderation-flags" className="grid gap-4">
				<h2 id="moderation-flags" className="font-display text-2xl font-bold tracking-[-0.015em]">
					{t('abuse.flags_title')}
				</h2>
				<div>
					<Region query={flags} empty={flagRows.length === 0 && <Empty />}>
						<Rows rows={flagRows} caption={t('abuse.flags_title')} label={t('abuse.col_kind')} />
						<Paging query={flags} />
					</Region>
				</div>
			</section>
		</>
	);
}
