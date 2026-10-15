// C18 responsible-shelter directory (public, cacheable).
import { IsoDate, IsoDateTime, Lat, Lng, queryNumber, Slug, text, Uuid } from './common.schema.ts';
import { DirectoryStatus, Species } from './enums.ts';
import { z } from './zod.ts';

/** `closed: true` marks a closed day or range (`from`/`to` then ignored). */
export const OpeningHours = z
	.object({
		days: z.string(),
		from: z.string(),
		to: z.string(),
		closed: z.boolean().optional(),
		note_sl: z.string().optional(),
		note_en: z.string().optional(),
	})
	.openapi('OpeningHours');
export const Shelter = z
	.object({
		slug: z.string(),
		name: z.string(),
		address: z.string(),
		postal_code: z.string(),
		city: z.string(),
		lat: z.number().optional(),
		lng: z.number().optional(),
		/** E.164 */
		phone: z.string(),
		phone_display: z.string(),
		email: z.string().optional(),
		website: z.string().optional(),
		opening_hours: z.array(OpeningHours),
		source: z.string(),
		verified_at: IsoDate,
	})
	.openapi('Shelter');
export const MunicipalityRef = z.object({ slug: z.string(), name: z.string() }).openapi('MunicipalityRef');
/** `area` = statistical region of the shelter, `municipality_count` = confirmed municipalities, `species` accepted. */
export const ShelterSummary = Shelter.pick({
	slug: true,
	name: true,
	city: true,
	phone_display: true,
	phone: true,
	verified_at: true,
	source: true,
})
	.extend({ area: z.string(), municipality_count: z.number().int(), species: z.array(Species) })
	.openapi('ShelterSummary');
export const ShelterList = z.object({ items: z.array(ShelterSummary) }).openapi('ShelterList');
export const ShelterDetail = Shelter.extend({ municipalities: z.array(MunicipalityRef) }).openapi('ShelterDetail');
export const ShelterSlugParams = z.object({ slug: Slug });
/** `?lat=&lng=` (rounded to 2 decimals by the client) or `?municipality=<slug>`. */
export const ResponsibleShelterQuery = z
	.object({
		lat: queryNumber(z.coerce.number().pipe(Lat)).optional(),
		lng: queryNumber(z.coerce.number().pipe(Lng)).optional(),
		municipality: Slug.optional(),
	})
	.refine((q) => (q.municipality === undefined) !== (q.lat === undefined && q.lng === undefined), {
		message: 'Send lat and lng, or municipality',
	})
	.refine((q) => (q.lat === undefined) === (q.lng === undefined), { message: 'lat and lng go together' });
export const LikelyShelter = z
	.object({ slug: z.string(), name: z.string(), phone: z.string(), distance_km: z.number() })
	.openapi('LikelyShelter');
export const NearestShelter = z
	.object({ slug: z.string(), name: z.string(), distance_km: z.number() })
	.openapi('NearestShelter');
/**
 * Only `confirmed` names the responsible shelter (primary call button). `likely` is unconfirmed (secondary call,
 * "Ni potrjeno"); `unconfirmed` lists up to 2 nearest shelters without a phone (R-044.5).
 */
export const ResponsibleShelter = z
	.discriminatedUnion('status', [
		z.object({ status: z.literal('confirmed'), municipality: MunicipalityRef, shelter: Shelter }),
		z.object({ status: z.literal('likely'), municipality: MunicipalityRef, likely_shelter: LikelyShelter }),
		z.object({
			status: z.literal('unconfirmed'),
			municipality: MunicipalityRef,
			nearest: z.array(NearestShelter).max(2),
		}),
		z.object({ status: z.literal('outside_slovenia'), municipality: MunicipalityRef.optional() }),
	])
	.openapi('ResponsibleShelter');
export const MunicipalityShelterList = z
	.object({ items: z.array(MunicipalityRef.extend({ shelter_slug: z.string().nullable() })) })
	.openapi('MunicipalityShelterList');

// C18 §Admin (TASK-89): admin with aal2 only. Every write carries `audit_note`, stored in the audit entry and the version.

const AuditNote = text(500);
const latLngTogether = (v: { lat?: number | null; lng?: number | null }) => (v.lat == null) === (v.lng == null);
/** Shelter fields of the admin form; `municipalities` are the slugs assigned as CONFIRMED to this shelter. */
const ShelterFields = z.object({
	name: text(200),
	address: text(200),
	postal_code: z.string().regex(/^\d{4}$/, 'Expected 4 digits'),
	city: text(100),
	lat: Lat.nullish(),
	lng: Lng.nullish(),
	phone: z.string().regex(/^\+\d{8,15}$/, 'Expected E.164, e.g. +38612345678'),
	phone_display: text(50),
	email: z.email().max(254).nullish(),
	website: z
		.url({ protocol: /^https?$/ })
		.max(500)
		.nullish(),
	opening_hours: z.array(OpeningHours).max(50),
	source: text(2000),
	verified_at: IsoDate,
	municipalities: z.array(Slug).max(250),
	audit_note: AuditNote,
});
const latLngIssue = { message: 'lat and lng go together', path: ['lng'] };
/** No slug: derived from the name. */
export const CreateShelterInput = ShelterFields.extend({ slug: Slug.optional() })
	.refine(latLngTogether, latLngIssue)
	.openapi('CreateShelterInput');
/** `version` = the version the editor loaded; a newer one answers 409 CONFLICT. The slug never changes. */
export const UpdateShelterInput = ShelterFields.extend({ version: z.number().int().min(1) })
	.refine(latLngTogether, latLngIssue)
	.openapi('UpdateShelterInput');
export const DeleteShelterInput = z.object({ audit_note: AuditNote }).openapi('DeleteShelterInput');
export const MunicipalityShelterParams = z.object({ municipality: Slug });
export const MunicipalityShelterInput = z
	.object({
		shelter_slug: Slug.nullable(),
		status: DirectoryStatus,
		source: text(2000),
		verified_at: IsoDate,
		version: z.number().int().min(1),
		audit_note: AuditNote,
	})
	.refine((v) => v.status !== 'CONFIRMED' || v.shelter_slug !== null, {
		message: 'A confirmed assignment needs a shelter',
		path: ['shelter_slug'],
	})
	.openapi('MunicipalityShelterInput');
export const DirectoryImportQuery = z.object({ dry_run: z.enum(['true', 'false']).optional() });
/** One of the seed CSV formats (shelters.csv or municipality_shelters.csv, told apart by the header). */
export const DirectoryImportInput = z
	.object({ csv: z.string().min(1).max(900_000), audit_note: AuditNote.optional() })
	.openapi('DirectoryImportInput', { description: 'audit_note is required unless dry_run=true.' });

export const AdminShelter = Shelter.extend({
	id: Uuid,
	active: z.boolean(),
	version: z.number().int(),
	municipality_count: z.number().int(),
}).openapi('AdminShelter');
export const AdminShelterList = z.object({ items: z.array(AdminShelter) }).openapi('AdminShelterList');
export const AdminMunicipalityShelter = z
	.object({
		municipality: MunicipalityRef,
		/** The confirmed shelter, or the likely one of an UNCONFIRMED row. */
		shelter_slug: z.string().nullable(),
		status: DirectoryStatus,
		source: z.string(),
		verified_at: IsoDate,
		version: z.number().int(),
	})
	.openapi('AdminMunicipalityShelter');
export const AdminMunicipalityShelterList = z
	.object({ items: z.array(AdminMunicipalityShelter) })
	.openapi('AdminMunicipalityShelterList');
export const DirectoryChange = z
	.object({
		version: z.number().int(),
		/** The full row after the change. */
		data: z.record(z.string(), z.unknown()),
		source: z.string(),
		actor_id: Uuid.nullable(),
		audit_note: z.string().nullable(),
		created_at: IsoDateTime,
	})
	.openapi('DirectoryChange', { description: 'actor_id is null for the seed and imports.' });
export const DirectoryChangeList = z.object({ items: z.array(DirectoryChange) }).openapi('DirectoryChangeList');
export const DirectoryImportResult = z
	.object({
		changes: z.array(
			z.object({
				entity: z.enum(['shelter', 'municipality_shelter']),
				/** Shelter slug or municipality slug. */
				id: z.string(),
				action: z.enum(['create', 'update', 'none']),
				diff: z.record(z.string(), z.object({ from: z.unknown(), to: z.unknown() })),
			})
		),
		/** `row` is the CSV row (the header is row 1), `field` the column that failed. */
		errors: z.array(z.object({ row: z.number().int(), field: z.string() })),
	})
	.openapi('DirectoryImportResult');
