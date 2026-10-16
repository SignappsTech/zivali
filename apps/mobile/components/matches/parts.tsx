import { type Href, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useReversePlaceQuery } from '@zivali/api/geocode';
import type { MatchState, MatchSuggestion, PublicArea } from '@zivali/types';
import { Text } from '@/components/ui/text';
import { isOnline, useNetworkState } from '@/lib/net';
import { cn } from '@/lib/utils';

const BARS = { strong: 3, good: 2, possible: 1 } as const;

/** P11 strength: the word and three small bars, never a number; one accessible label. `lg` is the review line. */
export function Strength({ strength, size = 'sm' }: { strength: MatchSuggestion['strength']; size?: 'sm' | 'lg' }) {
	const t = useTranslations('matches');
	const word = t(`strength_${strength}`);
	const lg = size === 'lg';
	return (
		<View
			accessible
			role={lg ? undefined : 'img'}
			aria-label={lg ? t('strength_line', { strength: word }) : t('strength_a11y', { strength: word })}
			className={cn('flex-row flex-wrap items-center', lg ? 'gap-x-3' : 'gap-2')}
		>
			<Text
				className={
					lg ? 'font-display-semibold text-xl leading-7' : 'font-sans-bold text-sm leading-5 text-foreground'
				}
			>
				{lg ? t('strength_line', { strength: word }) : word}
			</Text>
			<View aria-hidden className={cn('flex-row items-center', lg ? 'gap-1' : 'gap-[3px]')}>
				{[1, 2, 3].map((n) => (
					<View
						key={n}
						className={cn(
							lg ? 'h-2 w-5 rounded' : 'h-1.5 w-3.5 rounded-[3px]',
							n <= BARS[strength] ? 'bg-primary' : 'bg-input'
						)}
					/>
				))}
			</View>
		</View>
	);
}

/** Suggested and confirmed matches; rejected ones never come back (C8). */
export const LIST_STATES: MatchState[] = ['suggested', 'confirmed'];

/** Back, or to `fallback` when a push or link opened this screen first. */
export function useBack(fallback: Href) {
	const router = useRouter();
	return () => (router.canGoBack() ? router.back() : router.replace(fallback));
}

/** The chip match sorts first; the API order (by score) stays otherwise. */
export const sortMatches = (items: MatchSuggestion[]) =>
	[...items].sort((a, b) => Number(b.chip_match) - Number(a.chip_match));

const reason = (match: MatchSuggestion, code: string) => match.reasons.find((r) => r.code === code);

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
			default:
				return [];
		}
	});
}

/** The place name of a fuzzed area ("Šiška, Ljubljana"), online only; undefined while unknown. */
export function usePlaceLabel(area: PublicArea | undefined): string | undefined {
	const online = isOnline(useNetworkState());
	const { data } = useReversePlaceQuery(area ? { lat: area.lat, lng: area.lng } : { lat: 0, lng: 0 }, {
		skip: !area || !online,
	});
	return data?.label;
}

// The matches each lost report's list showed in this app session (memory only, never stored: C17). One that is gone on
// the next load, and was not rejected here, was withdrawn by the server (its report is no longer active).
const shown = new Map<string, { items: MatchSuggestion[]; ids: Set<string>; withdrawn: boolean }>();

/** True when a match shown earlier in this session is gone from this list; the same list gives the same answer. */
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
