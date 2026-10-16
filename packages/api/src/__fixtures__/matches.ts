// C8 example (a suggestion in GET /v1/reports/:code/matches); `other` filled from the reports fixture.
import type { ConfirmMatchResponse, MatchList, MatchSuggestion } from '@zivali/types';

import { publicReport } from './reports.ts';

export const match: MatchSuggestion = {
	id: 'a1d4e2f6-3b5c-4d7e-9f1a-2b3c4d5e6f00',
	score: 0.78,
	strength: 'good',
	chip_match: false,
	reasons: [
		{ code: 'distance', band: '1to3' },
		{ code: 'time', hours_band: 'lt24' },
		{ code: 'colour', overlap: 1 },
	],
	state: 'suggested',
	other: {
		id: publicReport.id,
		short_code: 'Hk3vT9qP',
		type: 'found',
		species: 'dog',
		breed_codes: publicReport.breed_codes,
		colours: publicReport.colours,
		size: publicReport.size,
		sex: publicReport.sex,
		photos: publicReport.photos,
		event_at: publicReport.event_at,
		area: publicReport.area,
	},
};

export const matches: MatchList = { items: [match] };

export const confirmedMatch: ConfirmMatchResponse = { conversation_id: 'c0e1d2f3-4a5b-4c6d-8e7f-9a0b1c2d3e00' };
