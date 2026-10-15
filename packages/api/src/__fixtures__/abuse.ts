// C11 example (wire shape).
import type { AbuseReportInput, AbuseReportResponse, AdminAbuseReportList } from '@zivali/types';

export const abuseInput: AbuseReportInput = {
	target_type: 'report',
	target_id: '7c1e4b2a-0000-4000-8000-000000000001',
	reason: 'scam',
	note: 'Asks for money upfront',
};

export const abuseCreated: AbuseReportResponse = { id: 'ab1c2d3e-0000-4000-8000-000000000001', duplicate: false };

export const adminAbuseReports: AdminAbuseReportList = {
	items: [
		{
			id: abuseCreated.id,
			target_type: 'report',
			target_id: abuseInput.target_id,
			reason: 'scam',
			note: 'Asks for money upfront',
			weight: 1,
			status: 'open',
			created_at: '2026-10-14T16:10:00Z',
		},
	],
	next_cursor: null,
};
