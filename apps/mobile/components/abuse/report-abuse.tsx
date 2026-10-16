import { BottomSheetScrollView, useBottomSheetInternal } from '@gorhom/bottom-sheet';
import { useAccessibilityFocus } from '@rn-primitives/hooks';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { DotsThreeCircleIcon } from 'phosphor-react-native/src/icons/DotsThreeCircle';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { HandCoinsIcon } from 'phosphor-react-native/src/icons/HandCoins';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { SealWarningIcon } from 'phosphor-react-native/src/icons/SealWarning';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { type NativeSyntheticEvent, type TargetedEvent, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useReportAbuseMutation } from '@zivali/api/abuse';
import { ApiError } from '@zivali/api/client';
import type { QueryError } from '@zivali/api/rtk';
import type { AbuseReason, AbuseTargetType } from '@zivali/types';
import { Note } from '@/components/report/parts';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { ensureSession } from '@/lib/anonymous';

/** What is reported (C11). `title` names a report in the target line ("Glede objave: Rex"). */
export type AbuseTarget = { type: AbuseTargetType; id: string; title?: string };

type ReportAbuseProps = {
	target: AbuseTarget;
	/** No connection: "Pošlji" is disabled with the reason; the choice stays for later. */
	offline?: boolean;
	/** Messages and users (P12): shows "Blokiraj tudi to osebo"; called after the report when the switch is on. */
	onBlock?: () => Promise<unknown>;
	/** "Prijavi in blokiraj" opens the sheet with the switch on. */
	defaultBlock?: boolean;
	/** The report was stored (new or a duplicate); chat folds the message. */
	onSent?: (result: { blocked: boolean }) => void;
	/** "Prekliči" and "Končano". */
	onClose: () => void;
};

const NOTE_MAX = 500;
// The counter shows only in the last 50 characters (P10 copy).
const COUNTER_FROM = 50;
// SheetContent's grabber (44 px, -12 overlap) and its bottom padding, as in the consent sheet.
const SHEET_CHROME = 32;
// Codes where trying again cannot help as is: their own errors.* sentence (C1). Others (NETWORK, INTERNAL, …) get the
// calm abuse.error: the choice is kept, "Pošlji" sends again.
const OWN_SENTENCE = ['CAPTCHA_FAILED', 'FORBIDDEN', 'NOT_FOUND', 'GONE', 'VALIDATION'] as const;
const ownSentence = (code: string | undefined): code is (typeof OWN_SENTENCE)[number] =>
	(OWN_SENTENCE as readonly (string | undefined)[]).includes(code);

const REASONS = {
	scam: [HandCoinsIcon, 'reason_scam'],
	fake: [SealWarningIcon, 'reason_fake'],
	spam: [EnvelopeSimpleIcon, 'reason_spam'],
	inappropriate_image: [ImageIcon, 'reason_image'],
	other: [DotsThreeCircleIcon, 'reason_other'],
} as const satisfies Record<AbuseReason, readonly [PhosphorIcon, string]>;

const codeOf = (error: unknown) =>
	error instanceof ApiError ? error.code : (error as Partial<QueryError> | null)?.data?.code;

/**
 * gorhom lifts the sheet over the keyboard only for an input it knows is focused (what BottomSheetTextInput does); the
 * kit Textarea keeps its line style and tells the sheet here.
 */
function useSheetKeyboard() {
	const { animatedKeyboardState } = useBottomSheetInternal();
	return {
		onFocus: (event: NativeSyntheticEvent<TargetedEvent>) =>
			animatedKeyboardState.set((state) => ({ ...state, target: event.nativeEvent.target })),
		onBlur: () => animatedKeyboardState.set((state) => ({ ...state, target: undefined })),
	};
}

/** "Glede objave: {title}" with the title in semibold foreground; the sentence stays the catalogue's. */
function TargetLine({ target }: { target: AbuseTarget }) {
	const t = useTranslations('abuse');
	if (target.type !== 'report')
		return <Text className="mt-1 text-muted-foreground">{t(`target_${target.type}`)}</Text>;
	const [before, after] = t('target_report', { title: '\u0000' }).split('\u0000');
	return (
		<Text className="mt-1 text-muted-foreground">
			{before}
			<Text className="font-sans-semibold">{target.title}</Text>
			{after}
		</Text>
	);
}

/**
 * P10 report abuse, the body of a sheet: put it inside a SheetContent (the report's "Več možnosti" sheet, the chat
 * message menu). Reason as one radiogroup of choice rows, optional note (500, counter near the limit), the block switch
 * for messages and users, "Pošlji" disabled until a reason is chosen with the reason said. Signed-out visitors get an
 * anonymous session first (C7). A duplicate is thanked like a new report. Rate limits and errors keep the choice.
 * Focus moves to the heading when it opens and again when the confirmation replaces it; nothing auto-dismisses.
 */
export function ReportAbuse({
	target,
	offline = false,
	onBlock,
	defaultBlock = false,
	onSent,
	onClose,
}: ReportAbuseProps) {
	const t = useTranslations('abuse');
	const tr = useTranslations('report');
	const te = useTranslations('errors');
	const [reportAbuse] = useReportAbuseMutation();
	const [reason, setReason] = React.useState<AbuseReason>();
	const [note, setNote] = React.useState('');
	const [block, setBlock] = React.useState(defaultBlock);
	const [sending, setSending] = React.useState(false);
	const [limited, setLimited] = React.useState(false);
	const [error, setError] = React.useState<string>();
	const [done, setDone] = React.useState<{ blocked: boolean }>();
	const keyboard = useSheetKeyboard();
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	if (done) return <Done blocked={done.blocked} onClose={onClose} />;

	const send = async () => {
		if (!reason) return;
		setSending(true);
		setError(undefined);
		try {
			await ensureSession();
			const text = note.trim();
			await reportAbuse({
				target_type: target.type,
				target_id: target.id,
				reason,
				...(text && { note: text }),
			}).unwrap();
			// The report stands even if the block fails; the confirmation then leaves out "Oseba je blokirana."
			const blocked =
				onBlock && block
					? await onBlock().then(
							() => true,
							() => false
						)
					: false;
			onSent?.({ blocked });
			setDone({ blocked });
		} catch (cause) {
			const code = codeOf(cause);
			if (code === 'RATE_LIMITED') setLimited(true);
			else setError(ownSentence(code) ? te(code) : t('error'));
		} finally {
			setSending(false);
		}
	};

	// Why "Pošlji" cannot be pressed: the help line (offline as on slot A, no reason yet) or the rate-limit note above
	// it, also read with the button.
	const help = offline ? tr('action_offline') : !reason ? t('send_disabled_help') : undefined;
	const blocker = limited ? t('rate_limited') : help;
	const left = NOTE_MAX - note.length;

	return (
		<View style={{ maxHeight: height * 0.92 - SHEET_CHROME - Math.max(32, insets.bottom) }}>
			<Heading>{t('title')}</Heading>
			<TargetLine target={target} />
			<BottomSheetScrollView style={{ flexGrow: 0, flexShrink: 1 }}>
				<View className="pb-6 pt-5">
					<Label>{t('reason_label')}</Label>
					<RadioGroup
						value={reason}
						onValueChange={(value) => setReason(value as AbuseReason)}
						aria-label={t('reason_label')}
						className="mt-2 gap-2"
					>
						{Object.entries(REASONS).map(([value, [icon, key]]) => (
							<ChoiceRow
								key={value}
								value={value}
								title={t(key)}
								icon={<Icon as={icon} size={24} />}
								className="bg-background"
							/>
						))}
					</RadioGroup>
					<FormField
						label={t('note_label')}
						hint={left <= COUNTER_FROM ? t('note_counter', { n: left }) : undefined}
						className="mt-6"
					>
						<Textarea value={note} onChangeText={setNote} maxLength={NOTE_MAX} {...keyboard} />
					</FormField>
					{onBlock ? (
						<View className="mt-5">
							<Switch
								label={t('block_label')}
								checked={block}
								onCheckedChange={setBlock}
								accessibilityHint={t('block_help')}
							/>
							<Text className="text-sm text-muted-foreground">{t('block_help')}</Text>
						</View>
					) : null}
				</View>
			</BottomSheetScrollView>
			<View className="pt-4">
				{limited ? (
					<Note icon={ClockIcon} role="status" className="mb-3">
						{t('rate_limited')}
					</Note>
				) : error && !offline ? (
					<Note icon={WarningCircleIcon} iconClassName="text-destructive" role="alert" className="mb-3">
						{error}
					</Note>
				) : help ? (
					<Text
						role={offline ? 'status' : undefined}
						className="mb-2 text-center text-sm text-muted-foreground"
					>
						{help}
					</Text>
				) : null}
				<Button
					size="lg"
					disabled={!!blocker}
					loading={sending}
					accessibilityHint={blocker ?? error}
					onPress={send}
				>
					{t('send')}
				</Button>
				<Button variant="text" className="mt-1" onPress={onClose}>
					{t('cancel')}
				</Button>
				<View className="mt-3 flex-row gap-2">
					<Icon as={ShieldCheckIcon} weight="fill" size={16} className="mt-0.5 text-primary" />
					<Text className="min-w-0 flex-1 text-sm text-muted-foreground">{t('privacy')}</Text>
				</View>
			</View>
		</View>
	);
}

/** The sheet's h2; screen reader focus moves here when it mounts. */
function Heading({ className, children }: { className?: string; children: React.ReactNode }) {
	const ref = useAccessibilityFocus<React.ComponentRef<typeof Text>>();
	return (
		<SheetTitle ref={ref} className={className}>
			{children}
		</SheetTitle>
	);
}

/** Confirmation (P10 M3): check in a secondary circle, "Hvala", the review sentence, one quiet "Končano". */
function Done({ blocked, onClose }: { blocked: boolean; onClose: () => void }) {
	const t = useTranslations('abuse');
	return (
		<View>
			<View aria-live="polite" className="pt-5">
				<View className="size-[72px] items-center justify-center rounded-full bg-secondary">
					<Icon as={CheckIcon} size={36} className="text-secondary-foreground" />
				</View>
				<Heading className="mt-5 pt-0">{t('done_title')}</Heading>
				<Text className="mt-2">{t('done_body')}</Text>
				{blocked ? <Text className="mt-2">{t('done_blocked')}</Text> : null}
			</View>
			<Button variant="text" className="mt-6" onPress={onClose}>
				{t('done_close')}
			</Button>
		</View>
	);
}
