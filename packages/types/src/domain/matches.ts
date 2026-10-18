// C8 matching: suggestions for the managers of a lost report.
import type { Uuid } from './common.ts';
import type { DistanceBand, MatchReasonCode, MatchState, MatchStrength, VisualBand } from './enums.ts';
import type { PublicReport } from './reports.ts';

/** Why two reports match; never exact data (bands and overlaps only). */
export type MatchReason =
	| {
			code: Exclude<MatchReasonCode, 'visual'>;
			/** distance */
			band?: DistanceBand;
			/** time, e.g. `lt24` */
			hours_band?: string;
			/** size, sex, pattern: `equal`, `adjacent`, `unknown`, … */
			match?: string;
			/** colour: Jaccard overlap 0–1 */
			overlap?: number;
	  }
	| VisualMatchReason;
/** Algo v3: the most similar photo pair (lost report's photo, other report's photo). */
export type VisualMatchReason = { code: 'visual'; band: VisualBand; lost_photo_id: Uuid; other_photo_id: Uuid };
export type MatchOther = Pick<
	PublicReport,
	| 'id'
	| 'short_code'
	| 'type'
	| 'species'
	| 'breed_codes'
	| 'colours'
	| 'size'
	| 'sex'
	| 'photos'
	| 'event_at'
	| 'area'
>;
export type MatchSuggestion = {
	id: Uuid;
	score: number;
	strength: MatchStrength;
	chip_match: boolean;
	reasons: MatchReason[];
	state: MatchState;
	other: MatchOther;
};
/** GET /v1/reports/:code/matches?state=suggested,confirmed */
export type MatchListQuery = { state?: MatchState[] };
export type MatchList = { items: MatchSuggestion[] };
export type ConfirmMatchResponse = { conversation_id: Uuid };
export type RejectMatchInput = { reason?: string };
