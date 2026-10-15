// C18 responsible-shelter directory (public, cacheable).
import { IsoDate, Lat, Lng, Slug } from './common.schema.ts';
import { Species } from './enums.ts';
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
		lat: z.coerce.number().pipe(Lat).optional(),
		lng: z.coerce.number().pipe(Lng).optional(),
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
