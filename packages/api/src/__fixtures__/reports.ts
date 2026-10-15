// C4 examples (POST /v1/reports 201 and 409) and read models shaped like the C4 types.
import type {
	CreateReportInput,
	CreateReportResponse,
	MapReportList,
	PublicReport,
	ReportList,
	ReportOwnerView,
	SyncReportsResponse,
} from '@zivali/types';

import type { ApiErrorBody } from '../client.ts';

export const createReportInput: CreateReportInput = {
	type: 'found',
	species: 'dog',
	colours: ['golden'],
	size: 'l',
	location: { lat: 46.050412, lng: 14.505873, accuracy_m: 15 },
	event_at: '2026-10-15T07:30:00Z',
	photo_ids: ['9b0e2c4a-1f3d-4b5e-8a7c-6d2e1f0a9b00'],
};

export const createdReport: CreateReportResponse = {
	id: '7c1e4b2a-9d3f-4e5c-8b1a-2f6d7e9c0a00',
	short_code: 'Hk3vT9qP',
	moderation_state: 'visible',
	warnings: [],
};

export const duplicateOpenReport: ApiErrorBody = {
	error: {
		code: 'DUPLICATE_OPEN_REPORT',
		message: 'This pet already has an open lost report',
		details: { report_id: '51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e00', short_code: 'Pq7xR2mK' },
	},
};

export const publicReport: PublicReport = {
	id: createdReport.id,
	short_code: createdReport.short_code,
	type: 'found',
	status: 'open',
	species: 'dog',
	breed_codes: ['dog.labrador_retriever'],
	colours: ['golden'],
	pattern: 'solid',
	size: 'l',
	sex: 'unknown',
	has_chip: false,
	collar_described: true,
	event_at: '2026-10-15T07:30:00Z',
	area: { lat: 46.0515, lng: 14.5071, radius_m: 150 },
	municipality_slug: 'ljubljana',
	region_slug: 'osrednjeslovenska',
	in_slovenia: true,
	photos: [
		{
			url: 'https://media.zivali.test/r/7c1e/9b0e/display.webp',
			thumb_url: 'https://media.zivali.test/r/7c1e/9b0e/thumb.webp',
			alt: 'Najden pes, zlate barve',
			width: 1600,
			height: 1200,
		},
	],
	boosted: false,
	created_at: '2026-10-15T07:42:10Z',
	updated_at: '2026-10-15T07:42:10Z',
	is_mine: false,
};

export const ownerReport: ReportOwnerView = {
	...publicReport,
	is_mine: true,
	manager_role: 'finder',
	moderation_state: 'visible',
	close_reason: null,
	pet_id: null,
	chip_number: null,
	chip_status: 'none',
	collar: 'Rdeča ovratnica',
	location: { lat: 46.050412, lng: 14.505873 },
	requested_radius_m: null,
	contact_pref: 'chat_only',
	reward_eur: null,
	reward_note: null,
	first_match_at: null,
	reunited_at: null,
	closed_at: null,
	last_owner_update_at: '2026-10-15T07:42:10Z',
};

export const reportList: ReportList = { items: [publicReport], next_cursor: 'c2', total_estimate: 2 };

export const mapReports: MapReportList = {
	items: [
		{
			id: publicReport.id,
			short_code: publicReport.short_code,
			type: 'found',
			species: 'dog',
			area: publicReport.area,
			boosted: false,
			thumb_url: publicReport.photos[0]!.thumb_url,
		},
	],
};

export const syncReports: SyncReportsResponse = {
	upserts: [],
	removed_ids: ['51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e00'],
	server_time: '2026-10-15T08:00:00Z',
	has_more: false,
};

/** First sync of a Ljubljana area (C17): public fields and fuzzed areas only (500 m lost, 150 m found, C6). */
export const syncSnapshot: SyncReportsResponse = {
	upserts: [
		{
			id: '51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e01',
			short_code: 'Mk4sT7wQ',
			type: 'lost',
			status: 'open',
			species: 'dog',
			name: 'Maks',
			breed_codes: ['dog.mixed'],
			colours: ['black', 'white'],
			pattern: 'bicolour',
			size: 'm',
			sex: 'male',
			has_chip: true,
			event_at: '2026-10-14T16:00:00Z',
			area: { lat: 46.0569, lng: 14.5058, radius_m: 500 },
			municipality_slug: 'ljubljana',
			region_slug: 'osrednjeslovenska',
			boosted: true,
			updated_at: '2026-10-14T16:05:00Z',
			thumb_url: 'https://media.zivali.test/r/51aa/0/thumb.webp',
		},
		{
			id: createdReport.id,
			short_code: createdReport.short_code,
			type: 'found',
			status: 'open',
			species: 'cat',
			breed_codes: [],
			colours: ['grey'],
			pattern: 'tabby',
			size: 's',
			sex: 'unknown',
			has_chip: false,
			event_at: '2026-10-15T06:10:00Z',
			area: { lat: 46.0441, lng: 14.4893, radius_m: 150 },
			municipality_slug: 'ljubljana',
			region_slug: 'osrednjeslovenska',
			boosted: false,
			updated_at: '2026-10-15T06:20:00Z',
			thumb_url: null,
		},
	],
	removed_ids: [],
	server_time: '2026-10-15T08:00:00Z',
	has_more: false,
};
