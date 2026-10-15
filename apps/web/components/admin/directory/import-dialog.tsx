'use client';

import { FileCsvIcon } from '@phosphor-icons/react/dist/ssr/FileCsv';
import { UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { type DirectoryImportResult, useImportDirectoryMutation } from '@zivali/api/directory-admin';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { diffRows } from './format';
import { DiffTable } from './history';
import { ErrorNote, useDirectoryLabels, useErrorText } from './parts';

const REASONS = ['name', 'phone', 'source', 'hours'] as const;
const pickClass = cn(
	buttonVariants({ variant: 'secondary', size: 'sm' }),
	'group-focus-within:outline-3 group-focus-within:outline-offset-2 group-focus-within:outline-ring'
);

/**
 * P19 §8 CSV import: every file gets a dry run first (summary, errors with the CSV row, the changes); "Uveljavi
 * spremembe" stays disabled while there are errors and applies the same file in one transaction.
 */
export function ImportDialog({ shelterName, onClose }: { shelterName: (slug: string) => string; onClose: () => void }) {
	const t = useTranslations('admin.directory');
	const tAdmin = useTranslations('admin');
	const tCommon = useTranslations('common');
	const tErrors = useTranslations('errors');
	const labels = useDirectoryLabels(shelterName);
	const errorText = useErrorText();
	const helpId = React.useId();
	const [dryRun, checking] = useImportDirectoryMutation();
	const [apply, applying] = useImportDirectoryMutation();
	const [file, setFile] = React.useState<{ name: string; csv: string }>();
	const [result, setResult] = React.useState<DirectoryImportResult>();
	const [failure, setFailure] = React.useState<string>();
	const [over, setOver] = React.useState(false);

	async function choose(selected: File | undefined) {
		if (!selected) return;
		const csv = await selected.text();
		setFile({ name: selected.name, csv });
		setResult(undefined);
		setFailure(undefined);
		try {
			setResult(await dryRun({ csv, dryRun: true }).unwrap());
		} catch (error) {
			setFailure(errorText(error));
		}
	}

	async function confirm() {
		if (!file) return;
		setFailure(undefined);
		try {
			await apply({ csv: file.csv, dryRun: false }).unwrap();
			toast.success(t('saved'));
			onClose();
		} catch (error) {
			setFailure(errorText(error));
		}
	}

	const picker = (children: React.ReactNode, className: string) => (
		<label
			className={cn('group cursor-pointer', className)}
			onDragOver={(event) => {
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(event) => {
				event.preventDefault();
				setOver(false);
				void choose(event.dataTransfer.files[0]);
			}}
		>
			<input
				type="file"
				accept=".csv,text/csv"
				className="sr-only"
				onChange={(event) => {
					void choose(event.target.files?.[0]);
					event.target.value = '';
				}}
			/>
			{children}
		</label>
	);

	const changes = result?.changes ?? [];
	const errors = result?.errors ?? [];
	const counts = {
		new: changes.filter((change) => !change.before).length,
		removed: changes.filter((change) => !change.after).length,
		changed: changes.filter((change) => change.before && change.after).length,
		errors: errors.length,
	};
	const rows = changes.flatMap((change, index) =>
		change.before && change.after
			? diffRows(change.before, change.after, labels.value, labels.hours).map((row) => ({
					key: `${index}-${row.field}-${row.days ?? ''}`,
					entry: change.label,
					label: labels.fieldLabel(row),
					before: row.before,
					after: row.after,
				}))
			: [
					{
						key: `${index}`,
						entry: change.label,
						label: labels.fieldLabel({ field: 'name' }),
						before: change.before ? change.label : null,
						after: change.after ? change.label : null,
					},
				]
	);
	const reason = (field: string) =>
		REASONS.includes(field as (typeof REASONS)[number])
			? t(`error_${field as (typeof REASONS)[number]}`)
			: tErrors('VALIDATION');

	return (
		<Dialog open onOpenChange={(open) => !open && !applying.isLoading && onClose()}>
			<DialogContent
				aria-describedby={undefined}
				closeLabel={tCommon('close')}
				className="flex max-w-[640px] flex-col overflow-hidden"
			>
				<DialogTitle className="pr-10">{t('import_title')}</DialogTitle>
				<div className="-mx-6 mt-4 min-h-0 flex-1 overflow-y-auto px-6">
					{file ? (
						<div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 rounded-row bg-background py-2.5 pr-2.5 pl-4">
							<FileCsvIcon weight="fill" aria-hidden="true" className="size-6 text-primary" />
							<span className="min-w-0 flex-1 font-bold break-all">{file.name}</span>
							{picker(<span className={pickClass}>{t('import_choose')}</span>, '')}
						</div>
					) : (
						picker(
							<>
								<UploadSimpleIcon weight="bold" aria-hidden="true" className="size-8 text-primary" />
								<span>{t('import_drop')}</span>
								<span className={pickClass}>{t('import_choose')}</span>
							</>,
							cn(
								'flex min-h-44 flex-col items-center justify-center gap-3 rounded-row bg-background p-6 text-center hover:inset-ring-2 hover:inset-ring-primary',
								over && 'inset-ring-2 inset-ring-primary'
							)
						)
					)}
					{checking.isLoading && (
						<p role="status" className="mt-5">
							{tCommon('loading')}
						</p>
					)}
					{failure && (
						<div className="mt-5">
							<ErrorNote>{failure}</ErrorNote>
						</div>
					)}
					{result && (
						<>
							<p role="status" className="mt-5 font-bold tabular-nums">
								{t('import_summary', counts)}
							</p>
							<div className="mt-5 grid gap-6">
								{errors.length > 0 && (
									<div>
										<h3 className="font-bold">{t('import_errors')}</h3>
										<ul className="mt-2 grid gap-2.5">
											{errors.map((error) => (
												<li
													key={`${error.row}-${error.field}`}
													className="flex items-start gap-2.5 text-control leading-[22px]"
												>
													<WarningCircleIcon
														weight="fill"
														aria-hidden="true"
														className="mt-px size-5 shrink-0 text-destructive"
													/>
													<p>
														{t('import_error_row', {
															row: error.row,
															reason: reason(error.field),
														})}
													</p>
												</li>
											))}
										</ul>
									</div>
								)}
								{rows.length > 0 && (
									<div>
										<h3 className="font-bold">{t('import_changes')}</h3>
										<div className="mt-2">
											<DiffTable
												caption={t('import_changes')}
												first={t('import_col_entry')}
												rows={rows}
											/>
										</div>
									</div>
								)}
							</div>
						</>
					)}
				</div>
				{applying.isLoading && (
					<p role="status" className="mt-6 font-bold">
						{t('import_applying')}
					</p>
				)}
				<DialogFooter>
					<Button
						disabled={!result || errors.length > 0 || changes.length === 0}
						loading={applying.isLoading}
						aria-describedby={errors.length > 0 ? helpId : undefined}
						onClick={confirm}
					>
						{t('import_apply')}
					</Button>
					{errors.length > 0 && (
						<p id={helpId} className="text-center text-sm text-muted-foreground">
							{t('import_apply_blocked')}
						</p>
					)}
					<DialogClose asChild>
						<Button variant="text" disabled={applying.isLoading}>
							{tAdmin('cancel')}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
