'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useReversePlaceQuery } from '@zivali/api/geocode';
import type { AttributeMatchReason, MatchState, MatchSuggestion, PublicArea, VisualMatchReason } from '@zivali/types';
import { noteClass } from '@/components/shelters/classes';
import { cn } from '@/lib/utils';

// P11 parts shared by the web match review and the P9 matches note; same names as apps/mobile/components/matches/parts.

/** Suggested and confirmed matches; rejected ones never come back (C8). */
export const LIST_STATES: MatchState[] = ['suggested', 'confirmed'];

/** The chip match sorts first; the API order (by score) stays otherwise. */
export const sortMatches = (items: MatchSuggestion[]) =>
	[...items].sort((a, b) => Number(b.chip_match) - Number(a.chip_match));

const BARS = { strong: 3, good: 2, possible: 1 } as const;

/** P11 strength: the word and three small bars, never a number. `lg` is the review line "Ujemanje: Zelo verjetno". */
export function Strength({ strength, size = 'sm' }: { strength: MatchSuggestion['strength']; size?: 'sm' | 'lg' }) {
	const t = useTranslations('matches');
	const word = t(`strength_${strength}`);
	const lg = size === 'lg';
	const bars = (
		<span aria-hidden="true" className={cn('inline-flex items-center', lg ? 'gap-1' : 'gap-[3px]')}>
			{[1, 2, 3].map((n) => (
				<span
					key={n}
					className={cn(
						'block',
						lg ? 'h-2 w-5 rounded' : 'h-1.5 w-3.5 rounded-[3px]',
						n <= BARS[strength] ? 'bg-primary' : 'bg-input'
					)}
				/>
			))}
		</span>
	);
	if (lg)
		return (
			<p className="flex flex-wrap items-center gap-x-3 font-display text-xl leading-7 font-semibold">
				<span>{t('strength_line', { strength: word })}</span>
				{bars}
			</p>
		);
	return (
		<span
			role="img"
			aria-label={t('strength_a11y', { strength: word })}
			className="inline-flex items-center gap-2 text-sm leading-5 font-bold whitespace-nowrap"
		>
			<span aria-hidden="true">{word}</span>
			{bars}
		</span>
	);
}

const reason = (match: MatchSuggestion, code: AttributeMatchReason['code']) =>
	match.reasons.find((r): r is AttributeMatchReason => r.code === code);

/** The photo similarity reason (algo v3, C8 §Visual similarity 3), when the pair has one. */
export const visualReason = (match: MatchSuggestion) =>
	match.reasons.find((r): r is VisualMatchReason => r.code === 'visual');

/** The distance band ("1–3 km") and the time gap ("manj kot 24 ur") from the match reasons; never exact values. */
export function useBands(match: MatchSuggestion) {
	const t = useTranslations('matches');
	const band = reason(match, 'distance')?.band;
	const hours = reason(match, 'time')?.hours_band;
	return {
		distance: band ? t('band', { band }) : undefined,
		gap: hours === 'lt24' || hours === '24to72' || hours === 'gt72' ? t(`gap_${hours}`) : undefined,
	};
}

/** The reasons as one short sentence each (content §3); pattern and an adjacent size have no line. */
export function useReasonLines(match: MatchSuggestion): string[] {
	const t = useTranslations('matches');
	const { distance, gap } = useBands(match);
	return match.reasons.flatMap((r) => {
		switch (r.code) {
			case 'chip':
				return [t('reason_chip')];
			case 'chip_sighting':
				return [t('reason_chip_sighting')];
			case 'distance':
				return distance ? [t('reason_distance', { band: distance })] : [];
			case 'time':
				return gap ? [t('reason_time', { gap })] : [];
			case 'size':
				return r.match === 'equal' ? [t('reason_size')] : [];
			case 'colour':
				return r.overlap === 1 ? [t('reason_colour_full')] : r.overlap ? [t('reason_colour_partial')] : [];
			case 'sex':
				return [t('reason_sex')];
			case 'visual':
				return [t(`reason_visual_${r.band}`)];
			default:
				return [];
		}
	});
}

/** The place name of a fuzzed area ("Šiška, Ljubljana", C6 reverse lookup); undefined while unknown. */
export function usePlaceLabel(area: PublicArea | undefined): string | undefined {
	const { data } = useReversePlaceQuery(area ? { lat: area.lat, lng: area.lng } : { lat: 0, lng: 0 }, {
		skip: !area,
	});
	return data?.label;
}

// The matches each lost report's list showed in this tab (memory only). One that is gone on the next load, and was
// not rejected here, was withdrawn by the server (its report is no longer active).
const shown = new Map<string, { items: MatchSuggestion[]; ids: Set<string>; withdrawn: boolean }>();

/** True when a match shown earlier in this tab is gone from this list; the same list gives the same answer. */
export function isWithdrawn(code: string, items: MatchSuggestion[]): boolean {
	const before = shown.get(code);
	if (before?.items === items) return before.withdrawn;
	const ids = new Set(items.map((m) => m.id));
	const withdrawn = !!before && [...before.ids].some((id) => !ids.has(id));
	shown.set(code, { items, ids, withdrawn });
	return withdrawn;
}

/** A match the owner rejected leaves the list without the "withdrawn" note. */
export function forgetShown(code: string, id: string): void {
	shown.get(code)?.ids.delete(id);
}

/** System §10.6 note: muted surface, icon 22 (primary unless `iconClassName`), text 15/22, an optional text button. */
export function Note({
	icon: Icon,
	iconClassName = 'text-primary',
	action,
	className,
	children,
	...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
	icon: PhosphorIcon;
	iconClassName?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className={cn(noteClass, className)} {...props}>
			<Icon weight="fill" aria-hidden="true" className={cn('mt-px size-[22px] shrink-0', iconClassName)} />
			<div className="min-w-0 flex-1">
				<p>{children}</p>
				{action && <div className="mt-1 -ml-3">{action}</div>}
			</div>
		</div>
	);
}
