'use client';

import type { Icon } from '@phosphor-icons/react';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { DotsThreeCircleIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeCircle';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { HandCoinsIcon } from '@phosphor-icons/react/dist/ssr/HandCoins';
import { ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { SealWarningIcon } from '@phosphor-icons/react/dist/ssr/SealWarning';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useReportAbuseMutation } from '@zivali/api/abuse';
import { ApiError } from '@zivali/api/client';
import type { QueryError } from '@zivali/api/rtk';
import type { AbuseReason, AbuseTargetType } from '@zivali/types';
import { useCaptcha } from '@/components/auth/turnstile';
import { noteClass } from '@/components/shelters/classes';
import { StoreProvider } from '@/components/store-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** What is reported (C11). `title` names a report in the target line ("Glede objave: Rex"). */
export type AbuseTarget = { type: AbuseTargetType; id: string; title?: string };

type ReportAbuseProps = {
	target: AbuseTarget;
	/** Messages and users (P12): shows "Blokiraj tudi to osebo"; called after the report when the switch is on. */
	onBlock?: () => Promise<unknown>;
	/** "Prijavi in blokiraj" opens the dialog with the switch on. */
	defaultBlock?: boolean;
	/** The report was stored (new or a duplicate); chat folds the message. */
	onSent?: (result: { blocked: boolean }) => void;
};

const NOTE_MAX = 500;
// The counter shows only in the last 50 characters (P10 copy) and is announced at 50, 20 and 0, not on every key.
const COUNTER_FROM = 50;
const ANNOUNCE_AT = [50, 20, 0];
// Codes where trying again cannot help as is: their own errors.* sentence (C1). Others (NETWORK, INTERNAL, …) get the
// calm abuse.error: the choice is kept, "Pošlji" sends again. Nothing retries on its own.
const OWN_SENTENCE = ['CAPTCHA_FAILED', 'FORBIDDEN', 'NOT_FOUND', 'GONE', 'VALIDATION'] as const;
const ownSentence = (code: string | undefined): code is (typeof OWN_SENTENCE)[number] =>
	(OWN_SENTENCE as readonly (string | undefined)[]).includes(code);

const REASONS = {
	scam: [HandCoinsIcon, 'reason_scam'],
	fake: [SealWarningIcon, 'reason_fake'],
	spam: [EnvelopeSimpleIcon, 'reason_spam'],
	inappropriate_image: [ImageIcon, 'reason_image'],
	other: [DotsThreeCircleIcon, 'reason_other'],
} as const satisfies Record<AbuseReason, readonly [Icon, string]>;

const codeOf = (error: unknown) =>
	error instanceof ApiError ? error.code : (error as Partial<QueryError> | null)?.data?.code;

const headingClass = 'outline-hidden';

/**
 * P10 report abuse, web dialog (max 440 px, system §10.9): the reason as one radiogroup of choice rows, an optional
 * plain-text note (500, counter near the limit), the block switch for messages and users, "Pošlji" disabled until a
 * reason is chosen with the reason said. Signed-out visitors get an anonymous session only when they send (C7, the
 * captcha's api.js loads then too). A duplicate is thanked like a new report; rate limits and errors keep the choice.
 * Focus moves to the heading on open and to "Hvala" on the confirmation; nothing auto-dismisses. Escape and "Prekliči"
 * close it and focus returns to the opener. Inside another Radix dialog (chat, profile) Escape closes only this one:
 * Radix answers Escape in the topmost layer alone, and none of its controls handle the key themselves.
 *
 * Usage: `<ReportAbuseDialog target={{ type: 'message', id }} open={open} onOpenChange={setOpen} onBlock={block} />`.
 */
export function ReportAbuseDialog({
	open,
	onOpenChange,
	...props
}: ReportAbuseProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
	const heading = React.useRef<HTMLHeadingElement>(null);
	// Opened without a DialogTrigger (a menu row, a chat menu), so Radix has no trigger to refocus: the dialog keeps
	// what had focus when it opened and returns focus there.
	const opener = React.useRef<HTMLElement | null>(null);
	return (
		// Public pages have no store (TASK-90.5), so the dialog brings its own; elsewhere it is the page's (lib/store).
		<StoreProvider>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					onOpenAutoFocus={(event) => {
						opener.current = document.activeElement as HTMLElement | null;
						event.preventDefault();
						heading.current?.focus();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						opener.current?.focus();
					}}
				>
					<ReportAbuse {...props} heading={heading} onClose={() => onOpenChange(false)} />
				</DialogContent>
			</Dialog>
		</StoreProvider>
	);
}

/** "Glede objave: {title}" with the title in semibold foreground; the sentence stays the catalogue's. */
function TargetLine({ target }: { target: AbuseTarget }) {
	const t = useTranslations('abuse');
	if (target.type !== 'report') return t(`target_${target.type}`);
	const [before, after] = t('target_report', { title: '\u0000' }).split('\u0000');
	return (
		<>
			{before}
			<span className="font-semibold text-foreground">{target.title}</span>
			{after}
		</>
	);
}

/** System §10.6 note above the actions: the rate limit (clock, primary) or an error (warning, destructive). */
function Note({
	icon: NoteIcon,
	tone,
	children,
	...props
}: React.ComponentProps<'div'> & { icon: Icon; tone: string }) {
	return (
		<div {...props} className={cn(noteClass, 'mb-3')}>
			<NoteIcon weight="fill" aria-hidden="true" className={cn('size-[22px] shrink-0', tone)} />
			<p>{children}</p>
		</div>
	);
}

function ReportAbuse({
	target,
	onBlock,
	defaultBlock = false,
	onSent,
	onClose,
	heading,
}: ReportAbuseProps & { onClose: () => void; heading: React.Ref<HTMLHeadingElement> }) {
	const t = useTranslations('abuse');
	const te = useTranslations('errors');
	const id = React.useId();
	const [reportAbuse] = useReportAbuseMutation();
	// api.js loads only for a sign-in that needs the captcha: with the first "Pošlji" of a signed-out visitor.
	const captcha = useCaptcha({ lazy: true });
	const [reason, setReason] = React.useState<AbuseReason>();
	const [note, setNote] = React.useState('');
	const [spoken, setSpoken] = React.useState('');
	const [block, setBlock] = React.useState(defaultBlock);
	const [sending, setSending] = React.useState(false);
	const [limited, setLimited] = React.useState(false);
	const [error, setError] = React.useState<string>();
	const [done, setDone] = React.useState<{ blocked: boolean }>();

	if (done) return <Done blocked={done.blocked} onClose={onClose} />;

	const send = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!reason || limited || sending) return;
		setSending(true);
		setError(undefined);
		try {
			// The anonymous session is made here, never on open (C7); a browser with a session keeps it.
			const { ensureSession } = await import('@/lib/auth');
			await ensureSession(captcha.getToken);
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

	const changeNote = (value: string) => {
		const was = NOTE_MAX - note.length;
		const left = NOTE_MAX - value.length;
		if (ANNOUNCE_AT.some((at) => was > at && left <= at)) setSpoken(t('note_counter', { n: left }));
		setNote(value);
	};

	const left = NOTE_MAX - note.length;
	const statusId = `${id}-status`;
	// Why "Pošlji" cannot be pressed: the rate-limit note, else the help line while no reason is chosen.
	const help = reason ? undefined : t('send_disabled_help');
	const status = limited || error || help;

	return (
		<>
			<DialogTitle ref={heading} tabIndex={-1} className={headingClass}>
				{t('title')}
			</DialogTitle>
			<DialogDescription className="mt-1 text-muted-foreground">
				<TargetLine target={target} />
			</DialogDescription>
			<form onSubmit={send} noValidate>
				<p id={`${id}-reason`} className="mt-5 text-control font-bold">
					{t('reason_label')}
				</p>
				<RadioGroup
					value={reason ?? ''}
					onValueChange={(value) => setReason(value as AbuseReason)}
					aria-labelledby={`${id}-reason`}
					aria-required="true"
					className="mt-2 gap-2"
				>
					{Object.entries(REASONS).map(([value, [ReasonIcon, key]]) => (
						<ChoiceRow
							key={value}
							value={value}
							title={t(key)}
							icon={<ReasonIcon weight="bold" aria-hidden="true" />}
							className="bg-background"
						/>
					))}
				</RadioGroup>
				<FormField
					label={t('note_label')}
					hint={
						left <= COUNTER_FROM ? (
							<span className="block text-right tabular-nums">{t('note_counter', { n: left })}</span>
						) : undefined
					}
					className="mt-6"
				>
					{/* Grows to 5 lines, then scrolls; at 500 typing stops, no error. */}
					<Textarea
						value={note}
						maxLength={NOTE_MAX}
						rows={3}
						onChange={(event) => changeNote(event.target.value)}
						className="max-h-39 field-sizing-content"
					/>
				</FormField>
				<span aria-live="polite" className="sr-only">
					{spoken}
				</span>
				{onBlock && (
					<div className="mt-4">
						<label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 font-bold">
							{t('block_label')}
							<Switch checked={block} onCheckedChange={setBlock} aria-describedby={`${id}-block`} />
						</label>
						<p id={`${id}-block`} className="text-sm text-muted-foreground">
							{t('block_help')}
						</p>
					</div>
				)}
				<div className="mt-6">
					{limited ? (
						<Note id={statusId} role="status" icon={ClockIcon} tone="text-primary">
							{t('rate_limited')}
						</Note>
					) : error ? (
						<Note id={statusId} role="alert" icon={WarningCircleIcon} tone="text-destructive">
							{error}
						</Note>
					) : help ? (
						<p id={statusId} className="mb-2 text-center text-sm text-muted-foreground">
							{help}
						</p>
					) : null}
					<div className="grid gap-1 *:w-full">
						<Button
							type="submit"
							size="lg"
							disabled={!reason || limited}
							loading={sending}
							aria-describedby={status ? statusId : undefined}
						>
							{t('send')}
						</Button>
						<Button type="button" variant="text" onClick={onClose}>
							{t('cancel')}
						</Button>
					</div>
				</div>
				<p className="mt-3 flex gap-2 text-sm text-muted-foreground">
					<ShieldCheckIcon weight="fill" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
					<span>{t('privacy')}</span>
				</p>
				{captcha.widget}
			</form>
		</>
	);
}

/** Confirmation (P10 M3): check in a secondary circle, "Hvala", the review sentence, one quiet "Končano". */
function Done({ blocked, onClose }: { blocked: boolean; onClose: () => void }) {
	const t = useTranslations('abuse');
	const heading = React.useRef<HTMLHeadingElement>(null);
	React.useEffect(() => heading.current?.focus(), []);
	return (
		<>
			<div role="status">
				<span
					aria-hidden="true"
					className="grid size-18 place-items-center rounded-full bg-secondary text-secondary-foreground"
				>
					<CheckIcon weight="bold" className="size-9" />
				</span>
				<DialogTitle ref={heading} tabIndex={-1} className={cn(headingClass, 'mt-5')}>
					{t('done_title')}
				</DialogTitle>
				<DialogDescription className="max-w-[58ch]">{t('done_body')}</DialogDescription>
				{blocked && <p className="mt-2">{t('done_blocked')}</p>}
			</div>
			<Button type="button" variant="text" className="mt-6 w-full" onClick={onClose}>
				{t('done_close')}
			</Button>
		</>
	);
}
