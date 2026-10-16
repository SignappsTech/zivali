import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { ShieldWarningIcon } from 'phosphor-react-native/src/icons/ShieldWarning';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFormatter, useTranslations } from 'use-intl';
import { z } from 'zod';

import { useUpdateReportMutation } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import type { UpdateReportInput } from '@zivali/types';
import { containsContactData } from '@zivali/validation/text';
import { useErrorText } from '@/components/auth/parts';
import { Note } from '@/components/report/parts';
import type { DetailReport } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { FieldError, FormField, useAnnounceError } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useReport } from '@/lib/data/reports';

// "Uredi" from the owner actions (P9): what changes once a search is out, as in P6 step 6: what happened and, on a lost
// report, the display-only reward (brief v1.1: no payment, no escrow). PATCH /v1/reports/:code (C4).

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

function EditForm({ report }: { report: DetailReport }) {
	const t = useTranslations('report_lost');
	const tr = useTranslations('report');
	const tc = useTranslations('common');
	const format = useFormatter();
	const router = useRouter();
	const errorText = useErrorText();
	const [update, { isLoading, error }] = useUpdateReportMutation();
	const lost = report.type === 'lost';
	const { control, handleSubmit, setError, formState } = useForm<Values>({
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
	const rewardEmpty = message(formState.errors.reward?.message);
	useAnnounceError(rewardEmpty);

	const save = handleSubmit(async (values) => {
		try {
			await update({ code: report.short_code, body: toBody(values, lost) }).unwrap();
			toast(tc('saved'));
			if (router.canGoBack()) router.back();
			else router.replace(`/r/${report.short_code}` as Href);
		} catch (failure) {
			// Any other failure is the note above "Shrani"; the input stays as typed.
			if (isContactData(failure)) setError('reward_note', { message: 'reward_note_contact_data' });
		}
	});

	return (
		<ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-11 pt-2">
			<Text role="heading" className="font-display text-3xl tracking-[-0.6px]">
				{tr('owner_edit')}
			</Text>

			<Controller
				control={control}
				name="circumstances"
				render={({ field, fieldState }) => (
					<FormField
						className="mt-8"
						label={t('circumstances_label')}
						hint={t('circumstances_help')}
						error={message(fieldState.error?.message)}
					>
						<Textarea
							value={field.value}
							onChangeText={field.onChange}
							onBlur={field.onBlur}
							placeholder={t('circumstances_placeholder')}
						/>
					</FormField>
				)}
			/>

			{lost && (
				<View className="mt-10">
					<Text role="heading" className="font-display-semibold text-xl tracking-[-0.2px]">
						{t('reward_label')}
					</Text>
					<Controller
						control={control}
						name="reward"
						render={({ field }) => (
							<Switch
								className="mt-3"
								label={t('reward_toggle')}
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						)}
					/>
					{rewardEmpty ? <FieldError className="mt-1.5">{rewardEmpty}</FieldError> : null}
					{reward && (
						<>
							<Controller
								control={control}
								name="reward_eur"
								render={({ field, fieldState }) => (
									<FormField
										className="mt-6 max-w-[200px]"
										label={t('reward_amount_label')}
										error={message(fieldState.error?.message)}
									>
										<View className="flex-row items-center gap-2">
											<View className="flex-1">
												<Input
													value={field.value}
													onChangeText={field.onChange}
													onBlur={field.onBlur}
													keyboardType="number-pad"
													className="tabular-nums"
												/>
											</View>
											<Text aria-hidden className="text-lg">
												€
											</Text>
										</View>
									</FormField>
								)}
							/>
							<Controller
								control={control}
								name="reward_note"
								render={({ field, fieldState }) => (
									<FormField
										className="mt-6"
										label={t('reward_note_label')}
										hint={t('reward_note_help')}
										error={message(fieldState.error?.message)}
									>
										<Input
											value={field.value}
											onChangeText={field.onChange}
											onBlur={field.onBlur}
											maxLength={MAX_NOTE}
											placeholder={t('reward_note_placeholder')}
										/>
									</FormField>
								)}
							/>
							<Note icon={ShieldWarningIcon} iconClassName="text-foreground" className="mt-6">
								{t('reward_warning')}
							</Note>
						</>
					)}
				</View>
			)}

			{error && !isContactData(error) ? (
				<Note role="alert" icon={WarningCircleIcon} iconClassName="text-destructive" className="mt-8">
					{errorText(error)}
				</Note>
			) : null}
			<Button size="lg" className="mt-8" loading={isLoading} onPress={() => void save()}>
				{tc('save')}
			</Button>
		</ScrollView>
	);
}

/** `r/[code]/edit`: managers of an open search only; anyone else, or an ended report, goes back to the report page. */
export default function EditReportScreen() {
	const params = useLocalSearchParams<{ code?: string | string[] }>();
	const code = (Array.isArray(params.code) ? params.code[0] : params.code) ?? '';
	const tr = useTranslations('report');
	const router = useRouter();
	const { data, isLoading } = useReport(code);
	const report = data as DetailReport | null | undefined;
	if (!isLoading && !(report?.is_mine && (report.status === 'open' || report.status === 'matched')))
		return <Redirect href={`/r/${code}` as Href} />;
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="h-14 justify-center px-3">
				<Button
					variant="ghost"
					size="icon"
					aria-label={tr('mobile_back')}
					onPress={() => (router.canGoBack() ? router.back() : router.replace(`/r/${code}` as Href))}
				>
					<Icon as={CaretLeftIcon} size={22} />
				</Button>
			</View>
			{report ? <EditForm report={report} /> : null}
		</SafeAreaView>
	);
}
