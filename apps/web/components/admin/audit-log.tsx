'use client';

import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { useLocale, useTranslations } from 'next-intl';
import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';

import { useListAuditLogInfiniteQuery } from '@zivali/api/me';
import { flattenPages } from '@zivali/api/pagination';
import { formatDate } from '@zivali/i18n/format';
import type { AuditLogEntry } from '@zivali/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { adminH1Class, ErrorNote, tdClass, thClass } from './directory/parts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** C1 ids are uuids; the first block tells entries apart in a dense table. Other ids (short codes, slugs) stay whole. */
export const shortId = (id: string) => (UUID.test(id) ? id.slice(0, 8) : id);

const text = (value: unknown) =>
	value === null || value === undefined ? '–' : typeof value === 'object' ? JSON.stringify(value) : String(value);

/** One line from `diff`: "USER → MODERATOR · note: …" for a before/after pair, else its fields. */
export function changeSummary(diff: AuditLogEntry['diff']): string {
	if (!diff) return '';
	const { from, to, ...rest } = diff;
	const parts = 'from' in diff || 'to' in diff ? [`${text(from)} → ${text(to)}`] : [];
	for (const [key, value] of Object.entries(rest)) parts.push(`${key}: ${text(value)}`);
	return parts.join(' · ');
}

function useEntryText() {
	const t = useTranslations('admin');
	const locale = useLocale();
	return {
		time: (entry: AuditLogEntry) =>
			`${formatDate(entry.created_at, locale)} ${formatDate(entry.created_at, locale, 'time')}`,
		// TODO(C3 CHANGE): show the actor's name once the entry carries it; the API returns the id only.
		actor: (entry: AuditLogEntry) => (entry.actor_id ? shortId(entry.actor_id) : t('directory.history_system')),
		target: (entry: AuditLogEntry) =>
			entry.target_id ? `${entry.target_type}: ${shortId(entry.target_id)}` : entry.target_type,
	};
}

const tableClass =
	'w-full border-collapse text-control leading-[22px] max-lg:hidden [&_tbody_tr:last-child>td]:border-b-0';

/** The dense table from lg, stacked rows below (P19 T2); read only, newest first. */
function Entries({
	entries,
	caption,
	change = false,
}: {
	entries: AuditLogEntry[];
	caption: string;
	change?: boolean;
}) {
	const t = useTranslations('admin');
	const entry = useEntryText();
	return (
		<div className="rounded-card bg-card px-4 pt-1 pb-2 text-card-foreground">
			<table className={tableClass}>
				<caption className="sr-only">{caption}</caption>
				<thead>
					<tr>
						<th scope="col" aria-sort="descending" className={cn(thClass, 'text-foreground')}>
							{t('audit_time')}
						</th>
						<th scope="col" className={thClass}>
							{t('audit_actor')}
						</th>
						<th scope="col" className={thClass}>
							{t('audit_action')}
						</th>
						<th scope="col" className={thClass}>
							{t('audit_target')}
						</th>
						{change && (
							<th scope="col" className={thClass}>
								{t('audit_change')}
							</th>
						)}
					</tr>
				</thead>
				<tbody>
					{entries.map((item) => (
						<tr
							key={item.id}
							className="transition-colors hover:bg-accent/60 motion-reduce:transition-none"
						>
							<td className={cn(tdClass, 'whitespace-nowrap text-muted-foreground tabular-nums')}>
								{entry.time(item)}
							</td>
							<td className={cn(tdClass, 'tabular-nums', !item.actor_id && 'text-muted-foreground')}>
								{entry.actor(item)}
							</td>
							<td className={tdClass}>{item.action}</td>
							<td className={cn(tdClass, 'break-all')}>{entry.target(item)}</td>
							{change && <td className={cn(tdClass, 'break-words')}>{changeSummary(item.diff)}</td>}
						</tr>
					))}
				</tbody>
			</table>
			<ul aria-label={caption} className="lg:hidden [&>li:last-child]:border-b-0">
				{entries.map((item) => (
					<li key={item.id} className="border-b border-border py-2">
						<p className="font-bold">{item.action}</p>
						<p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
							<span className="tabular-nums">{entry.time(item)}</span>
							<span className="tabular-nums">{entry.actor(item)}</span>
							<span className="break-all">{entry.target(item)}</span>
						</p>
						{change && item.diff && (
							<p className="mt-0.5 text-sm break-words">{changeSummary(item.diff)}</p>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}

/** Loading, error and empty states of a region (P19 T1). */
function Region({
	query,
	empty,
	children,
}: {
	query: { isLoading: boolean; isError: boolean; isFetchNextPageError: boolean; refetch: () => unknown };
	empty: React.ReactNode;
	children: React.ReactNode;
}) {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	if (query.isLoading)
		return (
			<div className="grid gap-4 rounded-card bg-card p-4" aria-busy="true">
				{[0, 1, 2, 3].map((key) => (
					<Skeleton key={key} className="h-6" />
				))}
				<p role="status" className="sr-only">
					{tCommon('loading')}
				</p>
			</div>
		);
	// A failed "Load more" keeps the loaded entries (its note is under them).
	if (query.isError && !query.isFetchNextPageError)
		return (
			<ErrorNote
				action={
					<Button variant="text" size="sm" className="mt-1 -ml-3" onClick={() => void query.refetch()}>
						{t('retry')}
					</Button>
				}
			>
				{t('error')}
			</ErrorNote>
		);
	return empty || children;
}

/** A filter pill (system §10.4) over a select; set, it turns primary with a check and names the value. */
function FilterPill({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
}) {
	const current = options.find((option) => option.value === value);
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectPrimitive.Trigger
				aria-label={value && current ? `${label}: ${current.label}` : label}
				className={cn(
					buttonVariants({ variant: value ? 'default' : 'secondary', size: 'sm' }),
					'rounded-chip text-control'
				)}
			>
				{value && <CheckIcon weight="bold" aria-hidden="true" className="size-4.5" />}
				<SelectPrimitive.Value placeholder={label}>
					{current && `${label}: ${current.label}`}
				</SelectPrimitive.Value>
				<CaretDownIcon weight="bold" aria-hidden="true" className="size-4" />
			</SelectPrimitive.Trigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** Distinct values, sorted; the chosen one stays even when the loaded entries no longer have it. */
const distinct = (values: (string | null)[], chosen: string) =>
	[...new Set([...(chosen ? [chosen] : []), ...values.filter((value): value is string => Boolean(value))])].sort();

/**
 * P19 audit log (admins): who, what, when and target, filtered by actor and action (exact match, C3). The filter
 * options are the actors and actions of the loaded entries.
 */
export function AuditLog() {
	const t = useTranslations('admin');
	const [actor, setActor] = React.useState('');
	const [action, setAction] = React.useState('');
	const query = useListAuditLogInfiniteQuery({ actor_id: actor || undefined, action: action || undefined });
	const entries = flattenPages(query.data);
	const filtered = Boolean(actor || action);
	const clear = () => {
		setActor('');
		setAction('');
	};

	return (
		<>
			<h1 className={adminH1Class}>{t('audit_title')}</h1>
			<div role="group" aria-label={t('filters')} className="flex flex-wrap items-center gap-2">
				<FilterPill
					label={t('audit_actor')}
					value={actor}
					options={distinct(
						entries.map((entry) => entry.actor_id),
						actor
					).map((id) => ({ value: id, label: shortId(id) }))}
					onChange={setActor}
				/>
				<FilterPill
					label={t('audit_action')}
					value={action}
					options={distinct(
						entries.map((entry) => entry.action),
						action
					).map((value) => ({ value, label: value }))}
					onChange={setAction}
				/>
				{filtered && (
					<Button variant="text" size="sm" onClick={clear}>
						{t('filters_clear')}
					</Button>
				)}
			</div>
			<div>
				<Region
					query={query}
					empty={
						entries.length === 0 && (
							<div className="rounded-card bg-card px-4 py-10 text-center">
								<p role="status" className="font-display text-xl font-semibold">
									{t('empty')}
								</p>
								{filtered && (
									<Button variant="secondary" size="sm" className="mt-4" onClick={clear}>
										{t('filters_clear')}
									</Button>
								)}
							</div>
						)
					}
				>
					<Entries entries={entries} caption={t('audit_title')} change />
					{query.isFetchNextPageError && (
						<div className="mt-4">
							<ErrorNote
								action={
									<Button
										variant="text"
										size="sm"
										className="mt-1 -ml-3"
										onClick={() => void query.fetchNextPage()}
									>
										{t('retry')}
									</Button>
								}
							>
								{t('error')}
							</ErrorNote>
						</div>
					)}
					{query.hasNextPage && !query.isFetchNextPageError && (
						<div className="mt-6 flex justify-center">
							<Button
								variant="secondary"
								size="sm"
								loading={query.isFetchingNextPage}
								onClick={() => void query.fetchNextPage()}
							>
								{t('load_more')}
							</Button>
						</div>
					)}
				</Region>
			</div>
		</>
	);
}

/** Dashboard (admins): the five latest audit entries and a link to the log. */
export function RecentChanges() {
	const t = useTranslations('admin');
	const query = useListAuditLogInfiniteQuery({ limit: 5 });
	const entries = flattenPages(query.data).slice(0, 5);
	return (
		<section aria-labelledby="recent-changes">
			<div className="mb-4 flex items-center justify-between gap-4">
				<h2 id="recent-changes" className="font-display text-2xl font-bold tracking-[-0.015em]">
					{t('dash_recent')}
				</h2>
				<Button asChild variant="text" size="sm">
					<Link href="/admin/audit-log" aria-label={`${t('dash_open')}: ${t('audit_title')}`}>
						{t('dash_open')}
						<ArrowRightIcon weight="bold" aria-hidden="true" />
					</Link>
				</Button>
			</div>
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
				<Entries entries={entries} caption={t('dash_recent')} />
			</Region>
		</section>
	);
}
