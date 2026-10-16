// Report rows → C4 DTOs. PublicReport is a whitelist: the exact point, chip number, manage token, contact data and
// creator never reach it; ReportOwnerView adds the manager-only fields. Both are parsed with their shared schema.
import type { z } from 'zod';

import type { Colour, Locale, Pattern, Species } from '@zivali/types';
import {
	CreateReportResponse,
	MapReport,
	PublicReport,
	ReportOwnerView,
	SyncReportsResponse,
} from '@zivali/validation';

import type { CreatedReport, ReportView } from './reports.domain.ts';
import type { MapRow } from './search.dao.ts';
import type { SyncFeed } from './sync.domain.ts';

export type PublicReportDto = z.infer<typeof PublicReport>;
export type ReportOwnerViewDto = z.infer<typeof ReportOwnerView>;

// Photo alt text (P9 §11, glossary §7.2 and §7.3): name, species, colours, pattern, then the public area (the
// municipality of the fuzzed circle). The collar text is manager-only (C4), so it never goes into a public alt.
const SPECIES: Record<Locale, Record<Species, string>> = {
	sl: { dog: 'pes', cat: 'mačka' },
	en: { dog: 'dog', cat: 'cat' },
};
const COLOUR: Record<Locale, Record<Colour, string>> = {
	sl: {
		black: 'črne',
		white: 'bele',
		grey: 'sive',
		brown: 'rjave',
		chocolate: 'čokoladne',
		red: 'rdečkaste',
		cream: 'kremne',
		golden: 'zlate',
		tan: 'svetlo rjave',
		blue_grey: 'modrosive',
	},
	en: {
		black: 'black',
		white: 'white',
		grey: 'grey',
		brown: 'brown',
		chocolate: 'chocolate',
		red: 'red',
		cream: 'cream',
		golden: 'golden',
		tan: 'tan',
		blue_grey: 'blue-grey',
	},
};
// solid, bicolour, tricolour and other are left out: the colours say it.
const PATTERN: Record<Locale, Partial<Record<Pattern, string>>> = {
	sl: {
		tabby: 's progastim vzorcem',
		tortoiseshell: 'z želvovinastim vzorcem',
		calico: 'z belimi, rdečkastimi in črnimi lisami',
		brindle: 's tigrastim vzorcem',
		merle: 'z marmoriranim vzorcem',
		spotted: 's pegami',
		pointed: 's temnejšim obrazom, ušesi in tačkami',
	},
	en: {
		tabby: 'tabby',
		tortoiseshell: 'tortoiseshell',
		calico: 'calico',
		brindle: 'brindle',
		merle: 'merle',
		spotted: 'spotted',
		pointed: 'colourpoint',
	},
};
const PHOTO_OF: Record<Locale, (n: number, total: number) => string> = {
	sl: (n, total) => `fotografija ${n} od ${total}`,
	en: (n, total) => `photo ${n} of ${total}`,
};

/** "rjave in bele", "črne, rjave in bele" / "brown and white". */
const list = (words: string[], and: string) =>
	words.length > 1 ? `${words.slice(0, -1).join(', ')} ${and} ${words.at(-1)}` : (words[0] ?? '');
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Piki: pes rjave in bele barve, Ljubljana" / "Grey tabby cat, Ljubljana", without the photo count. */
function photoAlt(
	report: Pick<ReportView['report'], 'species' | 'colours' | 'pattern'> & { municipality?: string },
	locale: Locale,
	name?: string
): string {
	const colours = report.colours.map((colour) => COLOUR[locale][colour]);
	const pattern = report.pattern ? PATTERN[locale][report.pattern] : undefined;
	const species = SPECIES[locale][report.species];
	const animal =
		locale === 'sl'
			? [species, colours.length ? `${list(colours, 'in')} barve` : ''].filter(Boolean).join(' ')
			: [list(colours, 'and'), pattern, species].filter(Boolean).join(' ');
	const parts = [animal, locale === 'sl' ? pattern : undefined, report.municipality].filter(Boolean);
	return name ? `${name}: ${parts.join(', ')}` : capitalise(parts.join(', '));
}

const iso = (date: Date) => date.toISOString();

export function toPublicReport({ report, area, manager_role, now }: ReportView, locale: Locale): PublicReportDto {
	const lost = report.type === 'lost';
	const name = lost && report.name ? report.name : undefined;
	const municipality = report.municipality?.[locale === 'sl' ? 'name_sl' : 'name_en'];
	const alt = photoAlt({ ...report, municipality }, locale, name);
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

/** GET /v1/reports/map item: the fuzzed area and the first thumbnail only. */
export function toMapReport({ lat, lng, radius_m, ...row }: MapRow) {
	return MapReport.parse({ ...row, area: { lat, lng, radius_m } });
}

export default { toPublicReport, toOwnerView, toDto, toCreated, toSyncFeed, toMapReport };
