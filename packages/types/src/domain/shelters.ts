// C18 responsible-shelter directory (public reference data, no personal data).
import type { IsoDate } from './common.ts';

export type OpeningHours = { days: string; from: string; to: string; note_sl?: string; note_en?: string };
export type Shelter = {
	slug: string;
	name: string;
	address: string;
	postal_code: string;
	city: string;
	/** E.164 */
	phone: string;
	phone_display: string;
	website?: string;
	opening_hours: OpeningHours[];
	source: string;
	verified_at: IsoDate;
};
export type MunicipalityRef = { slug: string; name: string };
export type ShelterSummary = Pick<Shelter, 'slug' | 'name' | 'city' | 'phone_display'>;
export type ShelterList = { items: ShelterSummary[] };
export type ShelterDetail = Shelter & { municipalities: MunicipalityRef[] };
/** GET /v1/shelters/responsible?lat=&lng= or ?municipality=<slug> */
export type ResponsibleShelterQuery = { lat: number; lng: number } | { municipality: string };
/** An unconfirmed municipality never returns a phone number (R-044.5). */
export type ResponsibleShelter =
	| { status: 'confirmed'; municipality: MunicipalityRef; shelter: Shelter }
	| { status: 'unconfirmed' | 'outside_slovenia'; municipality?: MunicipalityRef };
export type MunicipalityShelterList = { items: (MunicipalityRef & { shelter_slug: string | null })[] };
