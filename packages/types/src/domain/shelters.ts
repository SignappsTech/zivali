// C18 responsible-shelter directory (public reference data, no personal data).
import type { IsoDate } from './common.ts';
import type { Species } from './enums.ts';

/** `closed: true` marks a closed day or range (`from`/`to` then ignored). */
export type OpeningHours = {
	days: string;
	from: string;
	to: string;
	closed?: boolean;
	note_sl?: string;
	note_en?: string;
};
export type Shelter = {
	slug: string;
	name: string;
	address: string;
	postal_code: string;
	city: string;
	lat?: number;
	lng?: number;
	/** E.164 */
	phone: string;
	phone_display: string;
	email?: string;
	website?: string;
	opening_hours: OpeningHours[];
	source: string;
	verified_at: IsoDate;
};
export type MunicipalityRef = { slug: string; name: string };
/** `area` = statistical region of the shelter, `municipality_count` = confirmed municipalities, `species` accepted. */
export type ShelterSummary = Pick<
	Shelter,
	'slug' | 'name' | 'city' | 'phone_display' | 'phone' | 'verified_at' | 'source'
> & { area: string; municipality_count: number; species: Species[] };
export type ShelterList = { items: ShelterSummary[] };
export type ShelterDetail = Shelter & { municipalities: MunicipalityRef[]; likely_municipalities?: MunicipalityRef[] };
/** GET /v1/shelters/responsible?lat=&lng= or ?municipality=<slug> (one of the two). */
export type ResponsibleShelterQuery = { lat?: number; lng?: number; municipality?: string };
export type LikelyShelter = { slug: string; name: string; phone: string; distance_km: number };
export type NearestShelter = { slug: string; name: string; distance_km: number };
/** Only `confirmed` names the responsible shelter; `likely` is unconfirmed; `unconfirmed` has no phone (R-044.5). */
export type ResponsibleShelter =
	| { status: 'confirmed'; municipality: MunicipalityRef; shelter: Shelter }
	| { status: 'likely'; municipality: MunicipalityRef; likely_shelter: LikelyShelter }
	| { status: 'unconfirmed'; municipality: MunicipalityRef; nearest: NearestShelter[] }
	| { status: 'outside_slovenia'; municipality?: MunicipalityRef };
export type MunicipalityShelterList = { items: (MunicipalityRef & { shelter_slug: string | null })[] };
