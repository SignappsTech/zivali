// C8 matching: GET /v1/reports/:code/matches, POST /v1/matches/:id/confirm|reject.
import { csv, text, Uuid } from './common.schema.ts';
import { DistanceBand, MatchReasonCode, MatchState, MatchStrength, VisualBand } from './enums.ts';
import { PublicReport } from './reports.schema.ts';
import { z } from './zod.ts';

/** Algo v3 (C8 §Visual similarity): the most similar photo pair. */
export const VisualMatchReason = z
	.object({ code: z.literal('visual'), band: VisualBand, lost_photo_id: Uuid, other_photo_id: Uuid })
	.openapi('VisualMatchReason');
export const MatchReason = z
	.discriminatedUnion('code', [
		z.object({
			code: MatchReasonCode.exclude(['visual']),
			band: DistanceBand.optional(),
			hours_band: z.string().optional(),
			match: z.string().optional(),
			overlap: z.number().min(0).max(1).optional(),
		}),
		VisualMatchReason,
	])
	.openapi('MatchReason', { description: 'Why two reports match: bands and overlaps only, never exact data.' });
export const MatchOther = PublicReport.pick({
	id: true,
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
