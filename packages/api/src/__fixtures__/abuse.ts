// C11 example (wire shape).
import type { AbuseReportInput, AbuseReportResponse, AdminAbuseReportList, ModerationFlagList } from '@zivali/types';

export const abuseInput: AbuseReportInput = {
	target_type: 'report',
	target_id: '7c1e4b2a-0000-4000-8000-000000000001',
	reason: 'scam',
	note: 'Asks for money upfront',
};

export const abuseCreated: AbuseReportResponse = { id: 'ab1c2d3e-0000-4000-8000-000000000001', duplicate: false };

/** A listing, a message (links to its conversation's listing) and a profile (no link), newest first. */
export const adminAbuseReports: AdminAbuseReportList = {
	items: [
		{
			id: abuseCreated.id,
			reporter_id: 'c0ffee00-0000-4000-8000-000000000001',
			target_type: 'report',
			target_id: abuseInput.target_id,
			target_code: 'Hk3vT9qP',
			reason: 'scam',
			note: 'Asks for money upfront',
			weight: 1,
			status: 'open',
			created_at: '2026-10-14T16:10:00Z',
		},
		{
			id: 'ab1c2d3e-0000-4000-8000-000000000002',
			reporter_id: 'c0ffee00-0000-4000-8000-000000000002',
			target_type: 'message',
			target_id: '3e5a7c9b-0000-4000-8000-000000000001',
			target_code: 'Lm4wX8rS',
			reason: 'spam',
			note: null,
			weight: 0.5,
			status: 'open',
			created_at: '2026-10-14T12:05:00Z',
		},
		{
			id: 'ab1c2d3e-0000-4000-8000-000000000003',
			reporter_id: 'c0ffee00-0000-4000-8000-000000000003',
			target_type: 'profile',
			target_id: '1b9c6f4e-0000-4000-8000-000000000001',
			target_code: null,
			reason: 'other',
			note: null,
			weight: 1,
			status: 'dismissed',
			created_at: '2026-10-13T09:40:00Z',
		},
	],
	next_cursor: null,
};

/** An open auto-hide (links to the listing) and a resolved duplicate chip on a pet (no link). */
export const moderationFlags: ModerationFlagList = {
	items: [
		{
			id: 'f1a90000-0000-4000-8000-000000000001',
			kind: 'auto_hidden',
			target_type: 'report',
			target_id: abuseInput.target_id,
			target_code: 'Hk3vT9qP',
			details: { weight: 3, threshold: 3 },
			created_at: '2026-10-14T16:10:01Z',
			resolved_at: null,
		},
		{
			id: 'f1a90000-0000-4000-8000-000000000002',
			kind: 'duplicate_chip',
			target_type: 'pet',
			target_id: '9d8c7b6a-0000-4000-8000-000000000001',
			target_code: null,
			details: {},
			created_at: '2026-10-12T08:00:00Z',
			resolved_at: '2026-10-12T10:30:00Z',
		},
	],
	next_cursor: null,
};
