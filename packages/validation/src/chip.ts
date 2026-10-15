// Chip numbers (C4): used by the API and both clients; an invalid chip is a UI warning, never a blocker.
import type { ChipStatus } from '@zivali/types';

export type ChipResult = { chip: string | null; status: ChipStatus };

/** Strip spaces, dashes and dots; 9–15 digits → valid (15 expected, ISO 11784); otherwise invalid (null). */
export function normalizeChip(input: string | null | undefined): ChipResult {
	const stripped = (input ?? '').replace(/[\s.\p{Pd}]/gu, '');
	if (!stripped) return { chip: null, status: 'none' };
	if (/^\d{9,15}$/.test(stripped)) return { chip: stripped, status: 'valid' };
	return { chip: null, status: 'invalid' };
}
