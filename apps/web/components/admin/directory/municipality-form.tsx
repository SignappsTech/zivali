'use client';

import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import {
	type AdminMunicipality,
	type AdminShelter,
	type DirectoryStatus,
	useUpdateMunicipalityShelterMutation,
} from '@zivali/api/directory-admin';
import { formatDate } from '@zivali/i18n/format';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { Drawer, ErrorNote, useErrorText } from './parts';

const NONE = 'none';

/**
 * P19 §6 municipality drawer. Confirmed vs not confirmed is always explicit: without a shelter the status can only be
 * "Ni potrjeno", and only a confirmed row gets the primary call button on the public pages (C18).
 */
export function MunicipalityForm({
	municipality,
	shelters,
	today,
	onClose,
	onHistory,
}: {
	municipality: AdminMunicipality;
	shelters: AdminShelter[];
	today: string;
	onClose: () => void;
	onHistory: () => void;
}) {
	const t = useTranslations('admin');
	const locale = useLocale();
	const errorText = useErrorText();
	const formId = React.useId();
	const [save, saving] = useUpdateMunicipalityShelterMutation();
	const [shelter, setShelter] = React.useState(municipality.shelter_slug ?? NONE);
	const [status, setStatus] = React.useState<DirectoryStatus>(municipality.status);
	const [source, setSource] = React.useState(municipality.source);
	const [verifiedAt, setVerifiedAt] = React.useState(today);
	const [note, setNote] = React.useState('');
	const [sourceError, setSourceError] = React.useState<string>();
	const [failure, setFailure] = React.useState<string>();
	const confirmedAllowed = shelter !== NONE;

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setSourceError(source.trim() ? undefined : t('directory.error_source'));
		if (!source.trim()) return;
		try {
			await save({
				slug: municipality.slug,
				body: {
					shelter_slug: confirmedAllowed ? shelter : null,
					status: confirmedAllowed ? status : 'UNCONFIRMED',
					source: source.trim(),
					verified_at: verifiedAt,
					version: municipality.version,
					audit_note: note.trim() || undefined,
				},
			}).unwrap();
			toast.success(t('directory.saved'));
			onClose();
		} catch (error) {
			setFailure(errorText(error));
		}
	}

	return (
		<Drawer
			open
			onOpenChange={(open) => !open && onClose()}
			title={municipality.name}
			description={`${t('directory.col_checked')} ${formatDate(municipality.verified_at, locale)}`}
			actions={
				<Button variant="text" size="sm" onClick={onHistory}>
					<ClockCounterClockwiseIcon weight="bold" aria-hidden="true" />
					{t('directory.action_history')}
				</Button>
			}
			footer={
				<>
					<Button type="submit" form={formId} loading={saving.isLoading}>
						{t('directory.save')}
					</Button>
					<DialogClose asChild>
						<Button variant="text">{t('cancel')}</Button>
					</DialogClose>
				</>
			}
		>
			<form id={formId} noValidate onSubmit={submit} className="grid gap-6">
				{failure && <ErrorNote>{failure}</ErrorNote>}
				<FormField label={t('directory.municipality_shelter')} hint={t('directory.municipality_help')}>
					<Select value={shelter} onValueChange={setShelter}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NONE}>{t('directory.municipality_none')}</SelectItem>
							{shelters.map((option) => (
								<SelectItem key={option.slug} value={option.slug}>
									{option.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
				<fieldset>
					<legend className="mb-1 text-control font-bold">{t('directory.col_status')}</legend>
					<RadioGroup
						value={confirmedAllowed ? status : 'UNCONFIRMED'}
						onValueChange={(value) => setStatus(value as DirectoryStatus)}
						className="flex flex-wrap gap-x-8"
					>
						{(['CONFIRMED', 'UNCONFIRMED'] as const).map((value) => (
							<Label
								key={value}
								className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold"
							>
								<RadioGroupItem value={value} disabled={value === 'CONFIRMED' && !confirmedAllowed} />
								{t(
									value === 'CONFIRMED'
										? 'directory.status_confirmed'
										: 'directory.status_unconfirmed'
								)}
							</Label>
						))}
					</RadioGroup>
				</fieldset>
				<FormField
					label={t('directory.field_source')}
					hint={t('directory.field_source_help')}
					error={sourceError}
				>
					<Input value={source} onChange={(event) => setSource(event.target.value)} required />
				</FormField>
				<FormField label={t('directory.field_checked')}>
					<Input
						type="date"
						className="tabular-nums"
						value={verifiedAt}
						max={today}
						onChange={(event) => setVerifiedAt(event.target.value || today)}
					/>
				</FormField>
				<FormField label={t('audit_note_label')}>
					<Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
				</FormField>
			</form>
		</Drawer>
	);
}
