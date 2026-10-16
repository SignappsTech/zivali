import { type Href, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { DotsThreeCircleIcon } from 'phosphor-react-native/src/icons/DotsThreeCircle';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useTransitionReportMutation } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import type { CloseReason, ReportTransitionInput } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { expiryNotice, type ReportAction, trackReunited } from '@/components/report/lifecycle-helpers';
import { Note } from '@/components/report/parts';
import type { DetailReport } from '@/components/report/slots/types';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';

// P14 lifecycle on mobile: "Žival je spet doma" (the owner's confirm sheet or the finder's dialog), "Zaključi iskanje"
// with a reason, and "Ponovno odpri" within the reopen window, all through POST /v1/reports/:code/transitions (C4).

const DAY = 86_400_000;
/** C4 `lifecycle.reopen_days` (default 7). Past it the API answers GONE, which the reopen action shows. */
export const REOPEN_DAYS = 7;

/** A manager's closed or reunited report, still within the reopen window. A moderation removal stays closed. */
export function canReopen(report: DetailReport, now: number): boolean {
	const ended =
		report.status === 'closed' ? report.closed_at : report.status === 'reunited' ? report.reunited_at : null;
	return Boolean(
		report.is_mine && report.close_reason !== 'removed' && ended && now - Date.parse(ended) < REOPEN_DAYS * DAY
	);
}

const isConflict = (error: unknown) => (error as Partial<QueryError> | undefined)?.data?.code === 'CONFLICT';

/** One transition; `run` resolves to the failure (kept in `error` until the next try), undefined when it worked. */
function useTransition(report: DetailReport) {
	const [transition, { isLoading }] = useTransitionReportMutation();
	const [error, setError] = React.useState<unknown>();
	const run = async (body: ReportTransitionInput): Promise<unknown> => {
		setError(undefined);
		try {
			await transition({ code: report.short_code, body }).unwrap();
			return undefined;
		} catch (failure) {
			setError(failure);
			return failure;
		}
	};
	return { run, busy: isLoading, error, reset: () => setError(undefined) };
}

/**
 * The sheet's message (P14 S1 to S3): the explanation; a failure replaces it (the primary becomes the retry); CONFLICT
 * (another device or the other side closed it meanwhile) says it is already closed, and only "Zapri" is left.
 */
function SheetMessage({ error, children }: { error: unknown; children: React.ReactNode }) {
	const tl = useTranslations('lifecycle');
	const errorText = useErrorText();
	if (isConflict(error))
		return (
			<Note role="status" icon={InfoIcon} className="mt-4">
				{tl('already_closed')}
			</Note>
		);
	if (error)
		return (
			<Note role="alert" icon={WarningCircleIcon} iconClassName="text-destructive" className="mt-4">
				{errorText(error)}
			</Note>
		);
	return children;
}

/** The sheet's buttons: the primary and the text button, or only "Zapri" once there is nothing left to do. */
function SheetButtons({
	error,
	busy,
	primary,
	cancel,
	onClose,
}: {
	error: unknown;
	busy: boolean;
	primary: React.ReactNode;
	cancel: string;
	onClose: () => void;
}) {
	const tc = useTranslations('common');
	return (
		<View className="gap-1 pt-8">
			{isConflict(error) ? (
				<Button variant="secondary" size="lg" onPress={onClose}>
					{tc('close')}
				</Button>
			) : (
				<>
					{primary}
					<Button variant="text" disabled={busy} onPress={onClose}>
						{cancel}
					</Button>
				</>
			)}
		</View>
	);
}

type SheetProps = { report: DetailReport; open: boolean; onOpenChange: (open: boolean) => void };

/**
 * "Žival je spet doma": the owner confirms in a sheet (P14 M2), then the reunited screen; a finder confirms in the
 * dialog (M6, focus on "Še ne") and gets the short thank-you there. Either fires `reunited` (with consent only).
 */
export function HomeAgain({ report, open, onOpenChange }: SheetProps) {
	const tl = useTranslations('lifecycle');
	const tc = useTranslations('common');
	const router = useRouter();
	const errorText = useErrorText();
	const { run, busy, error, reset } = useTransition(report);
	const setOpen = (next: boolean) => {
		onOpenChange(next);
		if (!next) reset();
	};
	const confirm = async () => {
		const failure = await run({ action: 'mark_reunited' });
		if (failure) return failure;
		trackReunited(report);
		onOpenChange(false);
		router.push(`/r/${report.short_code}/reunited` as Href);
	};

	if (report.manager_role !== 'owner')
		return (
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogTitle>{tl('finder_confirm_title')}</AlertDialogTitle>
					<AlertDialogDescription>{tl('finder_confirm_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						{/* The dialog closes on press; a failure comes back as a toast, the report as it was. */}
						<AlertDialogAction
							variant="default"
							onPress={() =>
								void confirm().then((failure) => {
									if (failure) toast.error(errorText(failure));
								})
							}
						>
							{tl('finder_confirm_yes')}
						</AlertDialogAction>
						<AlertDialogCancel>{tl('finder_confirm_no')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent closeLabel={tc('close')}>
				<SheetTitle>
					{report.name ? tl('confirm_title_named', { name: report.name }) : tl('confirm_title')}
				</SheetTitle>
				<SheetMessage error={error}>
					<Text className="mt-3 text-lg leading-7">{tl('confirm_body')}</Text>
				</SheetMessage>
				<SheetButtons
					error={error}
					busy={busy}
					cancel={tl('confirm_no')}
					onClose={() => setOpen(false)}
					primary={
						<Button size="lg" loading={busy} onPress={() => void confirm()}>
							<Icon as={HeartIcon} weight="fill" />
							{busy ? tl('confirming') : error ? tc('try_again') : tl('confirm_yes')}
						</Button>
					}
				/>
			</SheetContent>
		</Sheet>
	);
}

/**
 * Close-reason rows (content §4). "Posted by mistake" is sent as `other`: the API takes only the manager reasons
 * (found_elsewhere, gave_up, returned_to_owner, other); `removed` stays with moderation.
 */
const REASONS: { key: 'home' | 'stopped' | 'mistake' | 'other'; reason: CloseReason; icon: PhosphorIcon }[] = [
	{ key: 'home', reason: 'found_elsewhere', icon: HouseIcon },
	{ key: 'stopped', reason: 'gave_up', icon: MagnifyingGlassIcon },
	{ key: 'mistake', reason: 'other', icon: WarningCircleIcon },
	{ key: 'other', reason: 'other', icon: DotsThreeCircleIcon },
];

/**
 * "Zaključi iskanje" (P14 M4): the reason as choice rows, then the one primary; "Pusti odprto" keeps it open. The
 * mockup's optional note is left out: the transition takes no note (C4), and typed text must not be dropped silently.
 */
export function CloseSearch({ report, open, onOpenChange }: SheetProps) {
	const tl = useTranslations('lifecycle');
	const tc = useTranslations('common');
	const { run, busy, error, reset } = useTransition(report);
	const [choice, setChoice] = React.useState<string>();
	const labelId = React.useId();
	const setOpen = (next: boolean) => {
		onOpenChange(next);
		if (!next) {
			reset();
			setChoice(undefined);
		}
	};
	const reason = REASONS.find((r) => r.key === choice)?.reason;
	const confirm = async () => {
		if (!reason || (await run({ action: 'close', reason }))) return;
		setOpen(false);
		toast(tl('closed_toast'));
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent closeLabel={tc('close')}>
				<SheetTitle>{tl('close_title')}</SheetTitle>
				<SheetMessage error={error}>
					<Text className="mt-3 text-lg leading-7">{tl('close_body')}</Text>
				</SheetMessage>
				{!isConflict(error) && (
					<>
						<Label nativeID={labelId} className="mt-8">
							{tl('close_reason_label')}
						</Label>
						<RadioGroup
							value={choice}
							onValueChange={setChoice}
							disabled={busy}
							aria-labelledby={labelId}
							className="mt-3 gap-3"
						>
							{REASONS.map(({ key, icon }) => (
								<ChoiceRow
									key={key}
									value={key}
									className="bg-background"
									icon={<Icon as={icon} size={24} />}
									title={tl(`close_reason_${key}`)}
								/>
							))}
						</RadioGroup>
					</>
				)}
				<SheetButtons
					error={error}
					busy={busy}
					cancel={tl('close_keep')}
					onClose={() => setOpen(false)}
					primary={
						<Button size="lg" disabled={!reason} loading={busy} onPress={() => void confirm()}>
							{error ? tc('try_again') : tl('close_confirm')}
						</Button>
					}
				/>
			</SheetContent>
		</Sheet>
	);
}

/** "Ponovno odpri" (P14 S7): a toast when it worked; past the window (GONE) or another failure, the error toast. */
export function useReopen(report: DetailReport) {
	const tl = useTranslations('lifecycle');
	const errorText = useErrorText();
	const { run, busy } = useTransition(report);
	const reopen = async () => {
		const failure = await run({ action: 'reopen' });
		if (failure) toast.error(errorText(failure));
		else toast(tl('reopened_toast'));
	};
	return { reopen, busy };
}

/**
 * The C10 reminder card (web owner-actions Open / my-reports DeepAction): a lost search idle 7 days gets "Še iščete?",
 * a found or sighted report near expiry the expiry note, with the one primary that extends. A `keep` or `extend` link
 * shows it even when nothing is due yet; `close` opens the reason sheet. Opening sends nothing, only the press does.
 */
export function ReminderCard({
	report,
	action,
	onDone,
	className,
}: {
	report: DetailReport;
	action?: ReportAction;
	onDone?: () => void;
	className?: string;
}) {
	const tl = useTranslations('lifecycle');
	const tf = useTranslations('report_found');
	const tc = useTranslations('common');
	const errorText = useErrorText();
	const { run, busy } = useTransition(report);
	const [now] = React.useState(Date.now);
	const [closing, setClosing] = React.useState(true);
	const open = report.is_mine && (report.status === 'open' || report.status === 'matched');
	if (!open) return null;
	if (action === 'close')
		return (
			<CloseSearch
				report={report}
				open={closing}
				onOpenChange={(next) => {
					setClosing(next);
					if (!next) onDone?.();
				}}
			/>
		);
	const notice = expiryNotice(report, now);
	const lost = report.type === 'lost';
	if (!notice && !action) return null;
	const extend = async () => {
		const failure = await run({ action: 'extend' });
		if (failure) toast.error(errorText(failure));
		else {
			toast.success(tc('toast_saved'));
			onDone?.();
		}
	};
	const days = notice?.days ?? Math.floor((now - Date.parse(report.created_at)) / DAY);
	return (
		<Note
			role="status"
			icon={ClockIcon}
			className={className}
			action={
				<Button variant="secondary" size="sm" loading={busy} onPress={() => void extend()}>
					{lost ? tl('reminder_keep') : tf('extend')}
				</Button>
			}
		>
			{lost ? `${tl('reminder_title')} ${tl('reminder_body', { days })}` : tf('expiry_note', { days })}
		</Note>
	);
}
