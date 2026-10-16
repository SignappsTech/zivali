'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useFormatter, useTranslations } from 'next-intl';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { useUpdateReportMutation } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import type { UpdateReportInput } from '@zivali/types';
import { containsContactData } from '@zivali/validation/text';
import { backLinkClass, useErrorText } from '@/components/pets/pet-list';
import { flash } from '@/components/report/owner-actions';
import type { DetailReport } from '@/components/report/slots/types';
import { noteClass } from '@/components/shelters/classes';
import { h1Class } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/client-navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// "Uredi" from the owner actions (P9), as on mobile (app/r/[code]/edit.tsx): what changes once a search is out, as in
// P6 step 6: what happened and, on a lost report, the display-only reward (brief v1.1: no payment, no escrow).
// PATCH /v1/reports/:code (C4).

const MAX_CIRCUMSTANCES = 1000;
const MAX_REWARD = 10_000;
const MAX_NOTE = 80;

/** Messages are report_lost keys (P6 content §6). */
const EditValues = z
	.object({
		circumstances: z.string().max(MAX_CIRCUMSTANCES, 'circumstances_too_long'),
		reward: z.boolean(),
		reward_eur: z.string(),
		reward_note: z.string(),
	})
	.superRefine((v, ctx) => {
		if (!v.reward) return;
		const eur = v.reward_eur.trim();
		const note = v.reward_note.trim();
		const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
		if (!eur && !note) issue('reward', 'reward_empty');
		if (eur && !/^[1-9]\d*$/.test(eur)) issue('reward_eur', 'reward_amount_invalid');
		else if (Number(eur) > MAX_REWARD) issue('reward_eur', 'reward_amount_max');
		if (note.length > MAX_NOTE) issue('reward_note', 'reward_note_too_long');
		else if (containsContactData(note)) issue('reward_note', 'reward_note_contact_data');
	});
type Values = z.infer<typeof EditValues>;
type Message =
	| 'circumstances_too_long'
	| 'reward_empty'
	| 'reward_amount_invalid'
	| 'reward_amount_max'
	| 'reward_note_too_long'
	| 'reward_note_contact_data';

/** The API's own check of the reward note (CONTACT_DATA, C4), shown on the field like the client check. */
const isContactData = (error: unknown) =>
	(error as Partial<QueryError> | undefined)?.data?.issues?.some(
		(issue) => issue.path === 'reward_note' && issue.message === 'CONTACT_DATA'
	) ?? false;

/** The PATCH body: what happened, when it has text (C4 stores no empty one); on a lost report the reward (null: off). */
function toBody(values: Values, lost: boolean): UpdateReportInput {
	const circumstances = values.circumstances.trim();
	const eur = values.reward_eur.trim();
	const note = values.reward_note.trim();
	return {
		...(circumstances && { circumstances }),
		...(lost && {
			reward_eur: values.reward && eur ? Number(eur) : null,
			reward_note: values.reward && note ? note : null,
		}),
	};
}

/**
 * The edit form (C15 /r/[code]/uredi): the circumstances and, on a lost report, the reward switch with amount, note
 * and the scam warning. Saved: back to the report, which says "Shranjeno". A failure is the note above "Shrani"; the
 * input stays as typed.
 */
export function EditReport({ report }: { report: DetailReport }) {
	const t = useTranslations('report_lost');
	const tr = useTranslations('report_found');
	const tc = useTranslations('common');
	const format = useFormatter();
	const router = useRouter();
	const errorText = useErrorText();
	const [update, { isLoading, error }] = useUpdateReportMutation();
	const lost = report.type === 'lost';
	const detail = { pathname: '/r/[code]', params: { code: report.short_code } } as const;
	const { control, register, handleSubmit, setError, formState } = useForm<Values>({
		resolver: zodResolver(EditValues),
		defaultValues: {
			circumstances: report.circumstances ?? '',
			reward: report.reward_eur != null || report.reward_note != null,
			reward_eur: report.reward_eur != null ? String(report.reward_eur) : '',
			reward_note: report.reward_note ?? '',
		},
	});
	const reward = useWatch({ control, name: 'reward' });
	const max = format.number(MAX_REWARD, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
	const message = (key?: string) =>
		key ? t(key as Message, { max: key === 'reward_amount_max' ? max : MAX_CIRCUMSTANCES }) : undefined;
	const { errors } = formState;

	const save = handleSubmit(async (values) => {
		try {
			await update({ code: report.short_code, body: toBody(values, lost) }).unwrap();
		} catch (failure) {
			if (isContactData(failure))
				setError('reward_note', { message: 'reward_note_contact_data' }, { shouldFocus: true });
			return;
		}
		flash(tc('toast_saved'));
		router.push(detail);
		router.refresh();
	});

	return (
		<form noValidate onSubmit={(event) => void save(event)}>
			<Link href={detail} className={backLinkClass}>
				<CaretLeftIcon weight="bold" aria-hidden="true" className="size-5" />
				{tc('back')}
			</Link>
			<h1 className={cn(h1Class, 'mt-4')}>{tr('manage_edit')}</h1>

			<FormField
				className="mt-8"
				label={t('circumstances_label')}
				hint={t('circumstances_help')}
				error={message(errors.circumstances?.message)}
			>
				<Textarea rows={4} placeholder={t('circumstances_placeholder')} {...register('circumstances')} />
			</FormField>

			{lost && (
				<fieldset className="mt-10">
					<legend className="font-display text-xl font-semibold tracking-[-0.01em]">
						{t('reward_label')}
					</legend>
					<label className="mt-3 flex min-h-14 cursor-pointer items-center justify-between gap-4 font-bold">
						{t('reward_toggle')}
						<Controller
							control={control}
							name="reward"
							render={({ field }) => (
								<Switch checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
							)}
						/>
					</label>
					{errors.reward?.message && (
						<FieldError className="mt-1.5">{message(errors.reward.message)}</FieldError>
					)}
					{reward && (
						<>
							<FormField
								className="mt-6 max-w-[200px]"
								label={t('reward_amount_label')}
								error={message(errors.reward_eur?.message)}
							>
								<div className="flex items-center gap-2">
									<Input inputMode="numeric" className="tabular-nums" {...register('reward_eur')} />
									<span aria-hidden="true" className="text-lg">
										€
									</span>
								</div>
							</FormField>
							<FormField
								className="mt-6"
								label={t('reward_note_label')}
								hint={t('reward_note_help')}
								error={message(errors.reward_note?.message)}
							>
								<Input
									maxLength={MAX_NOTE}
									placeholder={t('reward_note_placeholder')}
									{...register('reward_note')}
								/>
							</FormField>
							<div className={cn(noteClass, 'mt-6')}>
								<ShieldWarningIcon
									weight="fill"
									aria-hidden="true"
									className="mt-px size-[22px] shrink-0"
								/>
								<p>{t('reward_warning')}</p>
							</div>
						</>
					)}
				</fieldset>
			)}

			{error && !isContactData(error) && (
				<div role="alert" className={cn(noteClass, 'mt-8')}>
					<WarningCircleIcon
						weight="fill"
						aria-hidden="true"
						className="mt-px size-[22px] shrink-0 text-destructive"
					/>
					<p>{errorText(error)}</p>
				</div>
			)}
			<Button type="submit" size="lg" className="mt-8 max-sm:w-full" loading={isLoading}>
				{tc('save')}
			</Button>
		</form>
	);
}
