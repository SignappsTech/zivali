'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { DotsThreeCircleIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeCircle';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useTransitionReportMutation } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import type { CloseReason, ReportTransitionInput } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { trackReunited } from '@/components/report/lifecycle-helpers';
import type { DetailReport } from '@/components/report/slots/types';
import { noteClass } from '@/components/shelters/classes';
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { useRouter } from '@/i18n/client-navigation';
import { cn } from '@/lib/utils';

// P14 lifecycle on web, as on mobile (apps/mobile/components/report/lifecycle.tsx): "Žival je spet doma" (the owner's
// confirm dialog or the finder's alert dialog), "Zaključi iskanje" with a reason, "Ponovno odpri" within the reopen
// window and "Nadaljuj iskanje" / "Podaljšaj za 30 dni", all through POST /v1/reports/:code/transitions (C4).

const isConflict = (error: unknown) => (error as Partial<QueryError> | undefined)?.data?.code === 'CONFLICT';

/**
 * One transition; `run` resolves to the failure (kept in `error` until the next try), undefined when it worked. A
 * success re-renders the server page (`router.refresh`), so the report shows its new state.
 */
export function useTransition(report: Pick<DetailReport, 'short_code'>) {
	const router = useRouter();
	const [transition, { isLoading }] = useTransitionReportMutation();
	const [error, setError] = React.useState<unknown>();
	const run = async (body: ReportTransitionInput): Promise<unknown> => {
		setError(undefined);
		try {
			await transition({ code: report.short_code, body }).unwrap();
		} catch (failure) {
			setError(failure);
			return failure;
		}
		if (body.action !== 'mark_reunited') router.refresh();
		return undefined;
	};
	return { run, busy: isLoading, error, reset: () => setError(undefined) };
}

/** A one-tap transition (reopen, extend; `go` resolves to whether it worked): a toast when it worked; GONE past the window or another failure: the error. */
export function useQuickTransition(report: Pick<DetailReport, 'short_code'>, action: 'reopen' | 'extend') {
	const tl = useTranslations('lifecycle');
	const tc = useTranslations('common');
	const errorText = useErrorText();
	const { run, busy } = useTransition(report);
	const go = async () => {
		const failure = await run({ action });
		if (failure) toast.error(errorText(failure));
		else toast.success(action === 'reopen' ? tl('reopened_toast') : tc('toast_saved'));
		return !failure;
	};
	return { go, busy };
}

/**
 * The dialog's message (P14 S1 to S3): the explanation; a failure replaces it (the primary becomes the retry); CONFLICT
 * (another device or the other side closed it meanwhile) says it is already closed, and only "Zapri" is left.
 */
function DialogMessage({ error, children }: { error: unknown; children: React.ReactNode }) {
	const tl = useTranslations('lifecycle');
	const errorText = useErrorText();
	if (isConflict(error))
		return (
			<div role="status" className={cn(noteClass, 'mt-4')}>
				<InfoIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
				<p>{tl('already_closed')}</p>
			</div>
		);
	if (error)
		return (
			<div role="alert" className={cn(noteClass, 'mt-4')}>
				<WarningCircleIcon
					weight="fill"
					aria-hidden="true"
					className="mt-px size-[22px] shrink-0 text-destructive"
				/>
				<p>{errorText(error)}</p>
			</div>
		);
	return children;
}

/** The dialog's buttons: the primary and the text button, or only "Zapri" once there is nothing left to do. */
function DialogButtons({
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
		<div className="mt-8 grid gap-1 *:w-full">
			{isConflict(error) ? (
				<Button variant="secondary" size="lg" onClick={onClose}>
					{tc('close')}
				</Button>
			) : (
				<>
					{primary}
					<Button variant="text" disabled={busy} onClick={onClose}>
						{cancel}
					</Button>
				</>
			)}
		</div>
	);
}

type DialogProps = {
	report: DetailReport;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Where focus goes on close when the opener is gone or none (a deep link): the page's heading. */
	returnFocus?: () => HTMLElement | null | undefined;
};

/**
 * These dialogs open from state, not from a Radix trigger, so Radix has nothing to refocus: the opener is what had
 * focus as the dialog opened (the button, or "Več možnosti"), and focus goes back to it on every way out.
 */
function useReturnFocus(returnFocus: DialogProps['returnFocus']) {
	const opener = React.useRef<HTMLElement | null>(null);
	return {
		onOpenAutoFocus: () => {
			opener.current = document.activeElement as HTMLElement | null;
		},
		onCloseAutoFocus: (event: Event) => {
			event.preventDefault();
			const back =
				opener.current?.isConnected && opener.current !== document.body ? opener.current : returnFocus?.();
			back?.focus();
		},
	};
}

/** P14 web h2 in a content dialog (W2): display 24/30, 30 from lg. */
const titleClass = 'pr-10 text-2xl leading-[30px] font-bold tracking-[-0.015em] lg:text-3xl lg:leading-9';

/**
 * "Žival je spet doma": the owner confirms in a dialog (P14 M2, 440 px on web), then the reunited page; a finder
 * confirms in the alert dialog (M6, focus on "Še ne") and gets the short thank-you there. Either fires `reunited`
 * (with consent only).
 */
export function HomeAgain({ report, open, onOpenChange, returnFocus }: DialogProps) {
	const tl = useTranslations('lifecycle');
	const tc = useTranslations('common');
	const router = useRouter();
	const errorText = useErrorText();
	const { run, busy, error, reset } = useTransition(report);
	const focus = useReturnFocus(returnFocus);
	const setOpen = (next: boolean) => {
		onOpenChange(next);
		if (!next) reset();
	};
	const confirm = async () => {
		const failure = await run({ action: 'mark_reunited' });
		if (failure) return failure;
		trackReunited(report);
		onOpenChange(false);
		router.push({ pathname: '/r/[code]/reunited', params: { code: report.short_code } });
	};

	if (report.manager_role !== 'owner')
		return (
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent {...focus}>
					<AlertDialogTitle>{tl('finder_confirm_title')}</AlertDialogTitle>
					<AlertDialogDescription>{tl('finder_confirm_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						{/* The dialog closes on press; a failure comes back as a toast, the report as it was. */}
						<AlertDialogAction
							variant="default"
							onClick={() =>
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
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent closeLabel={tc('close')} {...focus}>
				<DialogTitle className={titleClass}>
					{report.name ? tl('confirm_title_named', { name: report.name }) : tl('confirm_title')}
				</DialogTitle>
				<DialogMessage error={error}>
					<DialogDescription className="mt-3 text-lg leading-7">{tl('confirm_body')}</DialogDescription>
				</DialogMessage>
				<DialogButtons
					error={error}
					busy={busy}
					cancel={tl('confirm_no')}
					onClose={() => setOpen(false)}
					primary={
						<Button size="lg" loading={busy} onClick={() => void confirm()}>
							<HeartIcon weight="fill" aria-hidden="true" />
							{busy ? tl('confirming') : error ? tc('try_again') : tl('confirm_yes')}
						</Button>
					}
				/>
				{/* S1: the saving state is announced politely. */}
				<p role="status" className="sr-only">
					{busy ? tl('confirming') : ''}
				</p>
			</DialogContent>
		</Dialog>
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
 * "Zaključi iskanje" (P14 W2, 560 px content dialog): the reason as choice rows, then the one primary; "Pusti odprto"
 * keeps it open. The mockup's optional note is left out: the transition takes no note (C4), and typed text must not
 * be dropped silently.
 */
export function CloseSearch({ report, open, onOpenChange, returnFocus }: DialogProps) {
	const tl = useTranslations('lifecycle');
	const tc = useTranslations('common');
	const { run, busy, error, reset } = useTransition(report);
	const focus = useReturnFocus(returnFocus);
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
		toast.success(tl('closed_toast'));
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent closeLabel={tc('close')} className="max-w-[560px] lg:p-7" {...focus}>
				<DialogTitle className={titleClass}>{tl('close_title')}</DialogTitle>
				<DialogMessage error={error}>
					<DialogDescription className="mt-3 text-lg leading-7">{tl('close_body')}</DialogDescription>
				</DialogMessage>
				{!isConflict(error) && (
					<>
						<p id={labelId} className="mt-6 text-[15px] leading-5 font-bold">
							{tl('close_reason_label')}
						</p>
						<RadioGroup
							value={choice ?? ''}
							onValueChange={setChoice}
							disabled={busy}
							aria-labelledby={labelId}
							className="mt-3 gap-3"
						>
							{REASONS.map(({ key, icon: Icon }) => (
								<ChoiceRow
									key={key}
									value={key}
									className="bg-background"
									icon={<Icon weight="bold" aria-hidden="true" />}
									title={tl(`close_reason_${key}`)}
								/>
							))}
						</RadioGroup>
					</>
				)}
				<DialogButtons
					error={error}
					busy={busy}
					cancel={tl('close_keep')}
					onClose={() => setOpen(false)}
					primary={
						<Button size="lg" disabled={!reason} loading={busy} onClick={() => void confirm()}>
							{error ? tc('try_again') : tl('close_confirm')}
						</Button>
					}
				/>
			</DialogContent>
		</Dialog>
	);
}
