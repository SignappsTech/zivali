'use client';

import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { SwapIcon } from '@phosphor-icons/react/dist/ssr/Swap';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { AiNotice as Notice } from '@zivali/types';
import { noteClass } from '@/components/shelters/classes';
import { Button, Spinner } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import type { AiAnnouncement } from './prefill';
import type { Prefill } from './use-prefill';

// The AI pre-fill parts of the approved wireframe (M-ai-prefill v1, TASK-41.1): the "Predlog" mark after a field
// label, the hint under a field, the photo notice, the disclosure and the one AI slot next to the main action.

/** Sparkle (fill, 16) and "Predlog" 14 bold. Hidden from the accessible name: the field's description says it. */
export function SuggestedMark({ className }: { className?: string }) {
	const t = useTranslations('ai_prefill');
	return (
		<span
			aria-hidden="true"
			className={cn(
				'ml-3 inline-flex items-center gap-1 align-middle font-sans text-sm leading-5 font-bold tracking-normal text-primary',
				className
			)}
		>
			<SparkleIcon weight="fill" className="size-4 shrink-0" />
			{t('suggested')}
		</span>
	);
}

/** Sparkle outline 16 in primary and 14/20 muted text under a field (never a boxed panel, system §10.8). */
export function AiHint({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
	return (
		<span id={id} className={cn('flex items-start gap-1.5 text-sm text-muted-foreground', className)}>
			<SparkleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
			<span className="min-w-0 flex-1">{children}</span>
		</span>
	);
}

/**
 * A field's AI description: `suggested_a11y` (screen readers only) while it is marked, else its hint. For a field's
 * help line (FormField or PillRadios `hint`), which the control's aria-describedby already points at.
 */
export function AiFieldNote({ marked, hint }: { marked?: boolean; hint?: React.ReactNode }) {
	const t = useTranslations('ai_prefill');
	if (marked) return <span className="sr-only">{t('suggested_a11y')}</span>;
	return hint ? <AiHint className="mt-0.5">{hint}</AiHint> : null;
}

const NOTICE_KEY = { no_animal: 'no_animal', other_animal: 'other_animal', multiple_animals: 'multiple' } as const;

/** The photo notice (system §10.6, neutral, not an error): it never blocks Naprej or Save. */
export function AiNotice({
	notice,
	onChangePhoto,
	onKeep,
	className,
}: {
	notice: Notice;
	onChangePhoto: () => void;
	onKeep: () => void;
	className?: string;
}) {
	const t = useTranslations('ai_prefill');
	const key = NOTICE_KEY[notice];
	return (
		<div className={cn(noteClass, className)}>
			<InfoIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
			<div className="min-w-0 flex-1">
				<p className="font-bold">{t(`${key}_title`)}</p>
				<p className="mt-1">{t(`${key}_body`)}</p>
				<div className="mt-1.5 -mb-2.5 -ml-3 flex flex-wrap gap-x-2">
					<Button type="button" variant="text" onClick={onChangePhoto}>
						<SwapIcon weight="bold" aria-hidden="true" />
						{t('change_photo')}
					</Button>
					<Button type="button" variant="text" onClick={onKeep}>
						{t('keep_photo')}
					</Button>
				</div>
			</div>
		</div>
	);
}

/**
 * "Kako nastanejo predlogi?": a disclosure on the web with the info text and the privacy policy link (§8). Goes in a
 * `-ml-3 flex flex-wrap` row of text buttons; the text opens on a row of its own.
 */
export function AiInfo() {
	const t = useTranslations('ai_prefill');
	const [open, setOpen] = React.useState(false);
	const id = React.useId();
	return (
		<>
			<Button type="button" variant="text" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
				{t('info_link')}
			</Button>
			<div id={id} hidden={!open} className="mt-2 basis-full pl-3 text-base leading-6 text-muted-foreground">
				<p>{t('info_body')}</p>
				<Button asChild variant="text" className="mt-1 -ml-3">
					<Link href={{ pathname: '/privacy', hash: 's8' }}>{t('info_privacy')}</Link>
				</Button>
			</div>
		</>
	);
}

export function useAnnouncement(): (announcement?: AiAnnouncement) => string {
	const t = useTranslations('ai_prefill');
	return (announcement) =>
		!announcement
			? ''
			: announcement.kind === 'arrived'
				? t('arrived_live', { count: announcement.count })
				: announcement.kind === 'none'
					? t('none_live')
					: t(`${NOTICE_KEY[announcement.notice]}_title`);
}

/**
 * The one AI slot by the main action (wireframe rule 1): the checking line while the first photo is checked, then
 * the notice (`notice`, when the step shows it here) or the note (`note`) with "Kako nastanejo predlogi?" while a
 * field still carries the mark. One polite live region per slot: the checking line, then the announcement, once;
 * `unavailable`, an error or the timeout clear it silently. Keep the slot mounted across steps.
 */
export function AiSlot({
	ai,
	note,
	notice = false,
	onReview,
	onChangePhoto,
	className,
}: {
	ai: Prefill;
	note?: 'continue' | 'save' | 'publish';
	notice?: boolean;
	/** "Preveri predloge": moves focus to the first marked field (P8). */
	onReview?: () => void;
	onChangePhoto: () => void;
	className?: string;
}) {
	const t = useTranslations('ai_prefill');
	const announce = useAnnouncement();
	const showNotice = notice && !ai.checking && ai.notice;
	const showNote = note && !ai.checking && !showNotice && ai.marks.size > 0;
	return (
		<>
			{/* In the flow while checking; then screen-reader only, so the announcement takes no room. */}
			<div aria-live="polite" className={ai.checking ? className : 'sr-only'}>
				{ai.checking ? (
					<p className="flex items-start gap-2 text-sm text-muted-foreground">
						<Spinner className="mt-0.5 size-4 text-primary" />
						<span className="min-w-0 flex-1">{t('checking')}</span>
					</p>
				) : (
					announce(ai.announcement)
				)}
			</div>
			{showNotice && (
				<AiNotice
					notice={ai.notice!}
					onChangePhoto={onChangePhoto}
					onKeep={ai.dismissNotice}
					className={className}
				/>
			)}
			{showNote && (
				<div className={cn('flex items-start gap-2 text-sm text-muted-foreground', className)}>
					<SparkleIcon weight="fill" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
					<div className="min-w-0 flex-1">
						<p>{t(`note_${note}`)}</p>
						<div className="mt-0.5 -mb-2 -ml-3 flex flex-wrap items-start gap-x-2">
							{onReview && (
								<Button type="button" variant="text" onClick={onReview}>
									{t('review')}
								</Button>
							)}
							<AiInfo />
						</div>
					</div>
				</div>
			)}
		</>
	);
}
