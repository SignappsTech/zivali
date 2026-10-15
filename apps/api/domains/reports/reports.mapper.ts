// Report rows → C4 DTOs. PublicReport is a whitelist: the exact point, chip number, manage token, contact data and
// creator never reach it; ReportOwnerView adds the manager-only fields. Both are parsed with their shared schema.
import type { z } from 'zod';

import type { Locale, ReportType, Species } from '@zivali/types';
import { CreateReportResponse, PublicReport, ReportOwnerView, SyncReportsResponse } from '@zivali/validation';

import type { CreatedReport, ReportView } from './reports.domain.ts';
import type { SyncFeed } from './sync.domain.ts';

export type PublicReportDto = z.infer<typeof PublicReport>;
export type ReportOwnerViewDto = z.infer<typeof ReportOwnerView>;

const ALT: Record<Locale, Record<ReportType, Record<Species, string>>> = {
	sl: {
		lost: { dog: 'Pogrešani pes', cat: 'Pogrešana mačka' },
		found: { dog: 'Najdeni pes', cat: 'Najdena mačka' },
		sighted: { dog: 'Opaženi pes', cat: 'Opažena mačka' },
	},
	en: {
		lost: { dog: 'Lost dog', cat: 'Lost cat' },
		found: { dog: 'Found dog', cat: 'Found cat' },
		sighted: { dog: 'Sighted dog', cat: 'Sighted cat' },
	},
};
const PHOTO_OF: Record<Locale, (n: number, total: number) => string> = {
	sl: (n, total) => `fotografija ${n} od ${total}`,
	en: (n, total) => `photo ${n} of ${total}`,
};

const iso = (date: Date) => date.toISOString();

export function toPublicReport({ report, area, manager_role, now }: ReportView, locale: Locale): PublicReportDto {
	const lost = report.type === 'lost';
	const name = lost && report.name ? report.name : undefined;
	const alt = [ALT[locale][report.type][report.species], name].filter(Boolean).join(' ');
	const photos = report.photos.filter((photo) => photo.public_display_url && photo.public_thumb_url);
	return PublicReport.parse({
		id: report.id,
		short_code: report.short_code,
		type: report.type,
		status: report.status,
		species: report.species,
		name,
		breed_codes: report.breed_codes,
		colours: report.colours,
		pattern: report.pattern,
		size: report.size,
		sex: report.sex,
		has_chip: report.chip_number !== null,
		collar_described: Boolean(report.collar),
		event_at: iso(report.event_at),
		circumstances: report.circumstances ?? undefined,
		reward:
			lost && (report.reward_eur !== null || report.reward_note !== null)
				? { eur: report.reward_eur, note: report.reward_note }
				: undefined,
		area,
		municipality_slug: report.municipality?.slug,
		region_slug: report.region?.slug,
		in_slovenia: report.in_slovenia,
		photos: photos.map((photo, i) => ({
			url: photo.public_display_url,
			thumb_url: photo.public_thumb_url,
			alt: photos.length > 1 ? `${alt}, ${PHOTO_OF[locale](i + 1, photos.length)}` : alt,
			width: photo.width,
			height: photo.height,
		})),
		boosted: report.boosted_until !== null && report.boosted_until > now,
		linked_report_code: report.linked_report?.short_code,
		created_at: iso(report.created_at),
		updated_at: iso(report.updated_at),
		is_mine: manager_role !== null,
	});
}

/** For a manager of the report; `location` is the stored coarsened point ("približno"), never a raw one. */
export function toOwnerView(
	view: ReportView & { manager_role: NonNullable<ReportView['manager_role']> },
	locale: Locale
) {
	const { report } = view;
	const isoOrNull = (date: Date | null) => (date ? iso(date) : null);
	return ReportOwnerView.parse({
		...toPublicReport(view, locale),
		manager_role: view.manager_role,
		moderation_state: report.moderation_state,
		close_reason: report.close_reason,
		pet_id: report.pet_id,
		chip_number: report.chip_number,
		chip_status: report.chip_status,
		collar: report.collar,
		location: view.exact,
		requested_radius_m: report.requested_radius_m,
		contact_pref: report.contact_pref,
		reward_eur: report.reward_eur,
		reward_note: report.reward_note,
		first_match_at: isoOrNull(report.first_match_at),
		reunited_at: isoOrNull(report.reunited_at),
		closed_at: isoOrNull(report.closed_at),
		last_owner_update_at: iso(report.last_owner_update_at),
	});
}

/** GET /v1/reports/:code: the owner view for managers, the public read model for everyone else. */
export function toDto(view: ReportView, locale: Locale): PublicReportDto | ReportOwnerViewDto {
	return view.manager_role
		? toOwnerView({ ...view, manager_role: view.manager_role }, locale)
		: toPublicReport(view, locale);
}

/** POST /v1/reports → 201. */
export function toCreated(created: CreatedReport) {
	return CreateReportResponse.parse(created);
}

/** GET /v1/sync/reports: CachedReport keeps only the C17 cache fields of the public read model plus `thumb_url`. */
export function toSyncFeed(feed: SyncFeed, locale: Locale) {
	return SyncReportsResponse.parse({
		...feed,
		upserts: feed.upserts.map((view) => {
			const report = toPublicReport(view, locale);
			return { ...report, thumb_url: report.photos[0]?.thumb_url ?? null };
		}),
	});
}

export default { toPublicReport, toOwnerView, toDto, toCreated, toSyncFeed };
