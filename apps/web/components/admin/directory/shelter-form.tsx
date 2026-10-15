'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import {
	type AdminMunicipality,
	type AdminOpeningHours,
	type AdminShelter,
	type ShelterInput,
	useCreateShelterMutation,
	useUpdateShelterMutation,
} from '@zivali/api/directory-admin';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { DAY_OPTIONS, formatTime, parseTime, toE164 } from './format';
import { Drawer, ErrorNote, isConflict, noteClass, noteIconClass, useDirectoryLabels, useErrorText } from './parts';

type HoursRow = AdminOpeningHours & { key: number };
type Errors = {
	name?: string;
	phone?: string;
	source?: string;
	hours: Record<number, { field: 'from' | 'to'; text: string }>;
};

const legendClass = 'mb-3 text-base font-bold';

/** P19 §5 edit drawer: shelter details, opening hours rows, municipalities served, source and date, audit note. */
export function ShelterForm({
	shelter,
	municipalities,
	shelterName,
	today,
	onClose,
	onHistory,
	onRefresh,
}: {
	/** null = a new shelter */
	shelter: AdminShelter | null;
	municipalities: AdminMunicipality[];
	shelterName: (slug: string) => string;
	today: string;
	onClose: () => void;
	onHistory: () => void;
	onRefresh: () => void;
}) {
	const t = useTranslations('admin');
	const locale = useLocale();
	const labels = useDirectoryLabels(shelterName);
	const errorText = useErrorText();
	const formId = React.useId();
	const listId = React.useId();
	const [create, created] = useCreateShelterMutation();
	const [update, updated] = useUpdateShelterMutation();

	const [form, setForm] = React.useState(() => ({
		name: shelter?.name ?? '',
		address: shelter?.address ?? '',
		postal_code: shelter?.postal_code ?? '',
		city: shelter?.city ?? '',
		phone: shelter?.phone_display ?? '',
		website: shelter?.website ?? '',
		email: shelter?.email ?? '',
		source: shelter?.source ?? '',
		verified_at: today,
		audit_note: '',
	}));
	const [hours, setHours] = React.useState<HoursRow[]>(() =>
		(shelter?.opening_hours ?? []).map((row, key) => ({
			...row,
			key,
			from: row.closed ? '' : formatTime(row.from, locale),
			to: row.closed ? '' : formatTime(row.to, locale),
		}))
	);
	const [served, setServed] = React.useState(() =>
		municipalities.filter((m) => shelter && m.shelter_slug === shelter.slug).map((m) => m.slug)
	);
	const [addQuery, setAddQuery] = React.useState('');
	const [errors, setErrors] = React.useState<Errors>({ hours: {} });
	const [failure, setFailure] = React.useState<{ conflict: boolean; text: string } | null>(null);

	const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setForm((current) => ({ ...current, [field]: event.target.value }));
	const setRow = (key: number, patch: Partial<HoursRow>) =>
		setHours((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
	const byName = (a: AdminMunicipality, b: AdminMunicipality) => a.name.localeCompare(b.name, locale);
	const servedList = municipalities.filter((m) => served.includes(m.slug)).sort(byName);
	const addable = municipalities.filter((m) => !served.includes(m.slug)).sort(byName);

	function validate(): Errors {
		const next: Errors = { hours: {} };
		if (!form.name.trim()) next.name = t('directory.error_name');
		if (!toE164(form.phone)) next.phone = t('directory.error_phone');
		if (!form.source.trim()) next.source = t('directory.error_source');
		for (const row of hours) {
			if (row.closed) continue;
			const [from, to] = [parseTime(row.from), parseTime(row.to)];
			if (!from || !to) next.hours[row.key] = { field: from ? 'to' : 'from', text: t('directory.error_time') };
			else if (to <= from) next.hours[row.key] = { field: 'to', text: t('directory.error_hours') };
		}
		return next;
	}

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const next = validate();
		setErrors(next);
		if (next.name || next.phone || next.source || Object.keys(next.hours).length) {
			// The messages are announced (role="alert"); focus goes to the first field to fix.
			requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
			return;
		}
		const { slug: _slug, version, ...current } = shelter ?? { slug: '', version: undefined };
		const body: ShelterInput = {
			...(current as Omit<AdminShelter, 'slug' | 'version'>),
			name: form.name.trim(),
			address: form.address.trim(),
			postal_code: form.postal_code.trim(),
			city: form.city.trim(),
			phone: toE164(form.phone)!,
			phone_display: form.phone.trim(),
			website: form.website.trim() || undefined,
			email: form.email.trim() || null,
			opening_hours: hours.map(({ key: _key, ...row }) =>
				row.closed
					? { ...row, from: '', to: '' }
					: { ...row, from: parseTime(row.from)!, to: parseTime(row.to)! }
			),
			municipalities: served,
			source: form.source.trim(),
			verified_at: form.verified_at,
			version,
			audit_note: form.audit_note.trim() || undefined,
		};
		try {
			await (shelter ? update({ slug: shelter.slug, body }) : create(body)).unwrap();
			toast.success(t('directory.saved'));
			onClose();
		} catch (error) {
			setFailure({ conflict: isConflict(error), text: errorText(error) });
		}
	}

	const field = (
		name: 'name' | 'address' | 'postal_code' | 'city' | 'website' | 'email',
		label: string,
		props: React.ComponentProps<typeof Input> = {}
	) => (
		<FormField label={label} error={name === 'name' ? errors.name : undefined}>
			<Input value={form[name]} onChange={set(name)} {...props} />
		</FormField>
	);

	return (
		<Drawer
			open
			onOpenChange={(open) => !open && onClose()}
			title={t(shelter ? 'directory.edit_title' : 'directory.new_title')}
			description={shelter?.name}
			actions={
				shelter && (
					<Button variant="text" size="sm" onClick={onHistory}>
						<ClockCounterClockwiseIcon weight="bold" aria-hidden="true" />
						{t('directory.action_history')}
					</Button>
				)
			}
			footer={
				<>
					<Button type="submit" form={formId} loading={created.isLoading || updated.isLoading}>
						{t('directory.save')}
					</Button>
					<DialogClose asChild>
						<Button variant="text">{t('cancel')}</Button>
					</DialogClose>
				</>
			}
		>
			<form id={formId} noValidate onSubmit={submit} className="grid gap-8">
				{failure?.conflict ? (
					<div className={cn(noteClass, 'pr-2')} role="alert">
						<WarningCircleIcon
							weight="fill"
							aria-hidden="true"
							className={cn(noteIconClass, 'text-destructive')}
						/>
						<div className="flex-1">
							<p>{t('directory.conflict')}</p>
							<Button type="button" variant="text" size="sm" className="mt-1 -ml-3" onClick={onRefresh}>
								<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
								{t('directory.conflict_refresh')}
							</Button>
						</div>
					</div>
				) : (
					failure && <ErrorNote>{failure.text}</ErrorNote>
				)}
				<div className="grid gap-6">
					{field('name', t('directory.field_name'), { required: true })}
					{field('address', t('directory.field_street'), { autoComplete: 'off' })}
					<div className="grid grid-cols-[136px_minmax(0,1fr)] gap-4">
						{field('postal_code', t('directory.field_postcode'), {
							inputMode: 'numeric',
							className: 'tabular-nums',
						})}
						{field('city', t('directory.field_place'))}
					</div>
					<FormField
						label={t('directory.field_phone')}
						hint={t('directory.field_phone_help')}
						error={errors.phone}
					>
						<Input
							type="tel"
							className="tabular-nums"
							value={form.phone}
							onChange={set('phone')}
							required
						/>
					</FormField>
					{field('website', t('directory.field_website'), { type: 'url', inputMode: 'url' })}
					{field('email', t('directory.field_email'), { type: 'email' })}
				</div>

				<fieldset className="min-w-0">
					<legend className={legendClass}>{t('directory.hours_title')}</legend>
					<ul className="grid gap-4">
						{hours.map((row) => {
							const error = errors.hours[row.key];
							const errorId = `${formId}-h${row.key}`;
							const time = (part: 'from' | 'to') => (
								<FormField label={t(`directory.hours_${part}`)} disabled={row.closed}>
									<Input
										inputMode="numeric"
										className="tabular-nums"
										value={row.closed ? '' : row[part]}
										disabled={row.closed}
										onChange={(event) => setRow(row.key, { [part]: event.target.value })}
										aria-invalid={error?.field === part || undefined}
										aria-describedby={error?.field === part ? errorId : undefined}
									/>
								</FormField>
							);
							return (
								<li key={row.key} className="border-border not-first:border-t not-first:pt-4">
									<div className="grid grid-cols-[minmax(0,1fr)_104px_104px] items-end gap-3">
										<FormField label={t('directory.hours_days')}>
											<Select
												value={row.days}
												onValueChange={(days) => setRow(row.key, { days })}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{[...new Set([...DAY_OPTIONS, row.days])].map((days) => (
														<SelectItem key={days} value={days}>
															{labels.days(days)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormField>
										{time('from')}
										{time('to')}
									</div>
									{error && (
										<FieldError id={errorId} className="mt-2">
											{error.text}
										</FieldError>
									)}
									<div className="mt-1 flex items-center justify-between gap-3">
										<label className="inline-flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
											<span>{t('directory.hours_closed')}</span>
											<Switch
												checked={!!row.closed}
												onCheckedChange={(closed) => setRow(row.key, { closed })}
											/>
										</label>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label={t('directory.hours_remove')}
											onClick={() =>
												setHours((rows) => rows.filter((other) => other.key !== row.key))
											}
										>
											<TrashIcon weight="bold" aria-hidden="true" />
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
					<Button
						type="button"
						variant="text"
						size="sm"
						className="mt-2 -ml-3"
						onClick={() =>
							setHours((rows) => [
								...rows,
								{
									key: Math.max(-1, ...rows.map((row) => row.key)) + 1,
									days: 'mon-fri',
									from: '',
									to: '',
								},
							])
						}
					>
						<PlusIcon weight="bold" aria-hidden="true" />
						{t('directory.hours_add')}
					</Button>
				</fieldset>

				<fieldset className="min-w-0">
					<legend className={legendClass}>{t('directory.served_title')}</legend>
					<FormField label={t('directory.served_add')}>
						<div className="relative">
							<MagnifyingGlassIcon
								weight="bold"
								aria-hidden="true"
								className="pointer-events-none absolute top-1/2 left-0.5 size-5 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								list={listId}
								autoComplete="off"
								className="pl-8"
								value={addQuery}
								onChange={(event) => {
									const match = addable.find((m) => m.name === event.target.value);
									if (match) setServed((current) => [...current, match.slug]);
									setAddQuery(match ? '' : event.target.value);
								}}
							/>
						</div>
					</FormField>
					<datalist id={listId}>
						{addable.map((m) => (
							<option key={m.slug} value={m.name} />
						))}
					</datalist>
					{servedList.length > 0 && (
						<ul aria-label={t('directory.served_title')} className="mt-3">
							{servedList.map((m) => (
								<li
									key={m.slug}
									className="flex min-h-11 items-center justify-between gap-3 border-border pl-0.5 not-first:border-t"
								>
									<span>{m.name}</span>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label={t('directory.served_remove', { municipality: m.name })}
										onClick={() =>
											setServed((current) => current.filter((slug) => slug !== m.slug))
										}
									>
										<XIcon weight="bold" aria-hidden="true" />
									</Button>
								</li>
							))}
						</ul>
					)}
				</fieldset>

				<div className="grid gap-6">
					<FormField
						label={t('directory.field_source')}
						hint={t('directory.field_source_help')}
						error={errors.source}
					>
						<Input value={form.source} onChange={set('source')} required />
					</FormField>
					<FormField label={t('directory.field_checked')}>
						<Input
							type="date"
							className="tabular-nums"
							value={form.verified_at}
							max={today}
							onChange={(event) =>
								setForm((current) => ({ ...current, verified_at: event.target.value || today }))
							}
						/>
					</FormField>
					<FormField label={t('audit_note_label')}>
						<Textarea rows={3} value={form.audit_note} onChange={set('audit_note')} />
					</FormField>
				</div>
			</form>
		</Drawer>
	);
}
