// C8 matching: GET /v1/reports/:code/matches, POST /v1/matches/:id/confirm|reject.
import { csv, text, Uuid } from './common.schema.ts';
import { DistanceBand, MatchReasonCode, MatchState, MatchStrength } from './enums.ts';
import { PublicReport } from './reports.schema.ts';
import { z } from './zod.ts';

export const MatchReason = z
	.object({
		code: MatchReasonCode,
		band: DistanceBand.optional(),
		hours_band: z.string().optional(),
		match: z.string().optional(),
		overlap: z.number().min(0).max(1).optional(),
	})
	.openapi('MatchReason', { description: 'Why two reports match: bands and overlaps only, never exact data.' });
export const MatchOther = PublicReport.pick({
	short_code: true,
	type: true,
	species: true,
	breed_codes: true,
	colours: true,
	size: true,
	sex: true,
	photos: true,
	event_at: true,
	area: true,
}).openapi('MatchOther');
export const MatchSuggestion = z
	.object({
		id: Uuid,
		score: z.number().min(0).max(1),
		strength: MatchStrength,
		chip_match: z.boolean(),
		reasons: z.array(MatchReason),
		state: MatchState,
		other: MatchOther,
	})
	.openapi('MatchSuggestion');
export const MatchListQuery = z.object({ state: csv(MatchState).optional() });
export const MatchList = z.object({ items: z.array(MatchSuggestion) }).openapi('MatchList');
export const ConfirmMatchResponse = z.object({ conversation_id: Uuid }).openapi('ConfirmMatchResponse');
export const RejectMatchInput = z.object({ reason: text(500).optional() }).openapi('RejectMatchInput');
