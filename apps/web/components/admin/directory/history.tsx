'use client';

import { ArrowUUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import {
	type AdminMunicipality,
	type AdminShelter,
	type DirectoryEntity,
	type DirectoryStatus,
	useGetDirectoryHistoryQuery,
	useUpdateMunicipalityShelterMutation,
	useUpdateShelterMutation,
} from '@zivali/api/directory-admin';
import { formatDate } from '@zivali/i18n/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { diffRows } from './format';
import { Drawer, ErrorNote, useDirectoryLabels, useErrorText } from './parts';

export const cellClass = 'border-b border-border py-3 pr-3 align-top';
export const headClass =
	'h-11 border-b border-border pr-3 text-left align-middle text-sm font-bold text-muted-foreground';

/** Before and after of one change: plain list, read only (P19 §7). */
export function DiffTable({
	caption,
	first,
	rows,
}: {
	caption: string;
	first: string;
	rows: { key: string; label: string; before: string | null; after: string | null; entry?: string }[];
}) {
	const t = useTranslations('admin.directory');
	const entries = rows.some((row) => row.entry);
	return (
		<table className="w-full table-fixed border-collapse text-control leading-[22px] [&_tbody_tr:last-child>*]:border-b-0">
			<caption className="sr-only">{caption}</caption>
			<colgroup>
				{(entries ? [29, 21, 23, 27] : [38, 28, 34]).map((width, index) => (
					<col key={index} style={{ width: `${width}%` }} />
				))}
			</colgroup>
			<thead>
				<tr>
					{entries && (
						<th scope="col" className={headClass}>
							{first}
						</th>
					)}
					<th scope="col" className={headClass}>
						{entries ? t('import_col_field') : first}
					</th>
					<th scope="col" className={headClass}>
						{t('history_before')}
					</th>
					<th scope="col" className={headClass}>
						{t('history_after')}
					</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.key}>
						{entries && <td className={cn(cellClass, 'font-bold break-words')}>{row.entry}</td>}
						{entries ? (
							<td className={cn(cellClass, 'break-words')}>{row.label}</td>
						) : (
							<th scope="row" className={cn(cellClass, 'text-left font-bold break-words')}>
								{row.label}
							</th>
						)}
						<td
							className={cn(
								cellClass,
								'break-words tabular-nums',
								!row.before && 'text-muted-foreground'
							)}
						>
							{row.before ?? '–'}
						</td>
						<td
							className={cn(
								cellClass,
								'font-bold break-words tabular-nums',
								!row.after && 'text-muted-foreground'
							)}
						>
							{row.after ?? '–'}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

/** P19 §7: versions newest first; the selected one shows prej and zdaj; restoring writes a new version. */
export function History({
	entity,
	target,
	shelterName,
	onClose,
}: {
	entity: DirectoryEntity;
	target: AdminShelter | AdminMunicipality;
	shelterName: (slug: string) => string;
	onClose: () => void;
}) {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	const locale = useLocale();
	const labels = useDirectoryLabels(shelterName);
	const errorText = useErrorText();
	const history = useGetDirectoryHistoryQuery({ entity, key: target.slug });
	const [updateShelter, shelterSave] = useUpdateShelterMutation();
	const [updateMunicipality, municipalitySave] = useUpdateMunicipalityShelterMutation();
	const [selected, setSelected] = React.useState<string>();
	const [failure, setFailure] = React.useState<string>();

	const items = history.data?.items ?? [];
	const diffs = items.map((change, index) =>
		diffRows(items[index + 1]?.data ?? {}, change.data, labels.value, labels.hours)
	);
	const index = Math.max(
		0,
		items.findIndex((change) => change.id === selected)
	);
	const change = items[index];
	const when = (iso: string) => `${formatDate(iso, locale)} ${formatDate(iso, locale, 'time')}`;
	const who = (actor: { display_name: string } | null) => actor?.display_name ?? t('directory.history_system');
	const summary = (index: number) =>
		items[index + 1]
			? [
					...new Set(
						diffs[index]!.map((row) => (row.days ? t('directory.hours_title') : labels.fieldLabel(row)))
					),
				].join(', ')
			: t('directory.history_initial');

	async function restore() {
		if (!change) return;
		const { slug: _slug, version: _version, ...data } = change.data;
		setFailure(undefined);
		try {
			if (entity === 'shelter') {
				const { slug, version, ...current } = target as AdminShelter;
				await updateShelter({
					slug,
					body: { ...current, ...(data as Partial<AdminShelter>), version },
				}).unwrap();
			} else {
				await updateMunicipality({
					slug: target.slug,
					body: {
						shelter_slug: (data.shelter_slug as string | null) ?? null,
						status: data.status as DirectoryStatus,
						source: String(data.source),
						verified_at: String(data.verified_at),
						version: target.version,
					},
				}).unwrap();
			}
			setSelected(undefined);
			toast.success(t('directory.history_restored'));
		} catch (error) {
			setFailure(errorText(error));
		}
	}

	return (
		<Drawer
			open
			onOpenChange={(open) => !open && onClose()}
			title={t('directory.history_title')}
			description={'name' in target ? target.name : undefined}
		>
			<div className="grid gap-8">
				{history.isError ? (
					<ErrorNote
						action={
							<Button variant="text" size="sm" className="mt-1 -ml-3" onClick={() => history.refetch()}>
								{t('retry')}
							</Button>
						}
					>
						{t('error')}
					</ErrorNote>
				) : history.isLoading ? (
					<div className="grid gap-3">
						{[0, 1, 2].map((key) => (
							<Skeleton key={key} className="h-6" />
						))}
						<p role="status" className="sr-only">
							{tCommon('loading')}
						</p>
					</div>
				) : (
					<table className="w-full table-fixed border-collapse text-control leading-[22px] [&_tbody_tr:last-child>*]:border-b-0">
						<caption className="sr-only">{t('directory.history_title')}</caption>
						<colgroup>
							<col className="w-[40%]" />
							<col className="w-[24%]" />
							<col className="w-[36%]" />
						</colgroup>
						<thead>
							<tr>
								<th scope="col" aria-sort="descending" className={headClass}>
									{t('directory.history_time')}
								</th>
								<th scope="col" className={headClass}>
									{t('directory.history_actor')}
								</th>
								<th scope="col" className={headClass}>
									{t('directory.history_change')}
								</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item, i) => (
								<tr key={item.id} className={cn(i === index && 'bg-accent')}>
									<td className={cn(cellClass, 'py-0')}>
										<button
											type="button"
											aria-current={i === index || undefined}
											onClick={() => setSelected(item.id)}
											className="min-h-11 cursor-pointer rounded-sm text-left font-bold tabular-nums hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
										>
											{when(item.created_at)}
										</button>
									</td>
									<td className={cn(cellClass, !item.actor && 'text-muted-foreground')}>
										{who(item.actor)}
									</td>
									<td className={cellClass}>{summary(i)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
				{change && (
					<section aria-label={when(change.created_at)}>
						<h3 className="font-bold">
							{when(change.created_at)} · {who(change.actor)}
						</h3>
						<div className="mt-2">
							<DiffTable
								caption={when(change.created_at)}
								first={t('directory.import_col_field')}
								rows={diffs[index]!.map((row) => ({
									key: `${row.field}-${row.days ?? ''}`,
									label: labels.fieldLabel(row),
									before: row.before,
									after: row.after,
								}))}
							/>
						</div>
						{failure && (
							<div className="mt-4">
								<ErrorNote>{failure}</ErrorNote>
							</div>
						)}
						{index > 0 && (
							<Button
								variant="secondary"
								size="sm"
								className="mt-5"
								loading={shelterSave.isLoading || municipalitySave.isLoading}
								onClick={restore}
							>
								<ArrowUUpLeftIcon weight="bold" aria-hidden="true" />
								{t('directory.history_restore')}
							</Button>
						)}
					</section>
				)}
			</div>
		</Drawer>
	);
}
