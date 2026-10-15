// C18 responsible-shelter directory (public, cacheable).
import { IsoDate, Lat, Lng, Slug } from './common.schema.ts';
import { z } from './zod.ts';

export const OpeningHours = z
	.object({
		days: z.string(),
		from: z.string(),
		to: z.string(),
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
		phone: z.string(),
		phone_display: z.string(),
		website: z.string().optional(),
		opening_hours: z.array(OpeningHours),
		source: z.string(),
		verified_at: IsoDate,
	})
	.openapi('Shelter');
export const MunicipalityRef = z.object({ slug: z.string(), name: z.string() }).openapi('MunicipalityRef');
export const ShelterSummary = Shelter.pick({ slug: true, name: true, city: true, phone_display: true }).openapi(
	'ShelterSummary'
);
export const ShelterList = z.object({ items: z.array(ShelterSummary) }).openapi('ShelterList');
export const ShelterDetail = Shelter.extend({ municipalities: z.array(MunicipalityRef) }).openapi('ShelterDetail');
export const ShelterSlugParams = z.object({ slug: Slug });
export const ResponsibleShelterQuery = z.union([
	z.object({ lat: z.coerce.number().pipe(Lat), lng: z.coerce.number().pipe(Lng) }),
	z.object({ municipality: Slug }),
]);
/** An unconfirmed municipality never returns a phone number (R-044.5). */
export const ResponsibleShelter = z
	.union([
		z.object({ status: z.literal('confirmed'), municipality: MunicipalityRef, shelter: Shelter }),
		z.object({ status: z.enum(['unconfirmed', 'outside_slovenia']), municipality: MunicipalityRef.optional() }),
	])
	.openapi('ResponsibleShelter');
export const MunicipalityShelterList = z
	.object({ items: z.array(MunicipalityRef.extend({ shelter_slug: z.string().nullable() })) })
	.openapi('MunicipalityShelterList');
