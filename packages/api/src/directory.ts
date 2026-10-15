// C18 responsible-shelter directory. Hand-written injectEndpoints stubs per the contract; replaced by the generated
// ones once /v1/shelters is in apps/api/openapi.json.
import { api } from './rtk.ts';

export type OpeningHours = { days: string; from: string; to: string; note_sl?: string; note_en?: string };
export type ShelterSummary = { slug: string; name: string; city: string; phone_display: string };
export type Shelter = {
	slug: string;
	name: string;
	address: string;
	postal_code: string;
	city: string;
	phone: string;
	phone_display: string;
	website?: string;
	opening_hours: OpeningHours[];
	source: string;
	verified_at: string;
};
export type ShelterPage = Shelter & { municipalities: { slug: string; name: string }[] };
export type MunicipalityRef = { slug: string; name: string };
/** Unconfirmed and outside_slovenia carry no shelter, so no phone number (R-044.5). */
export type ResponsibleShelterResponse =
	| { status: 'confirmed'; municipality: MunicipalityRef; shelter: Shelter }
	| { status: 'unconfirmed' | 'outside_slovenia'; municipality?: MunicipalityRef };
export type ResponsibleShelterArg = { lat: number; lng: number } | { municipality: string };

/** Points are rounded to 2 decimals before leaving the device (C4 §REST privacy). */
const round2 = (n: number) => Math.round(n * 100) / 100;

export const directoryApi = api.injectEndpoints({
	endpoints: (build) => ({
		getResponsibleShelter: build.query<ResponsibleShelterResponse, ResponsibleShelterArg>({
			query: (arg) => ({
				url: '/v1/shelters/responsible',
				params:
					'municipality' in arg
						? { municipality: arg.municipality }
						: { lat: round2(arg.lat), lng: round2(arg.lng) },
			}),
		}),
		listShelters: build.query<{ items: ShelterSummary[] }, void>({ query: () => '/v1/shelters' }),
		getShelter: build.query<ShelterPage, string>({ query: (slug) => `/v1/shelters/${encodeURIComponent(slug)}` }),
		listMunicipalities: build.query<{ items: (MunicipalityRef & { shelter_slug: string | null })[] }, void>({
			query: () => '/v1/shelters/municipalities',
		}),
	}),
});

export const { useGetResponsibleShelterQuery, useListSheltersQuery, useGetShelterQuery, useListMunicipalitiesQuery } =
	directoryApi;

export type ResponsibleShelterResult =
	| { status: 'loading' | 'error'; shelter: null; municipality?: undefined }
	| { status: 'unconfirmed' | 'outside_slovenia'; shelter: null; municipality?: MunicipalityRef }
	| { status: 'confirmed'; shelter: Shelter; municipality?: MunicipalityRef };

/** Pure mapping, shared by the hook and tests. The shelter (and its phone) is only returned when confirmed. */
export function toResult(
	data: ResponsibleShelterResponse | undefined,
	isError: boolean,
	isFetching = false
): ResponsibleShelterResult {
	if (isError) return { status: 'error', shelter: null };
	if (!data || isFetching) return { status: 'loading', shelter: null };
	const municipality = data.municipality;
	if (data.status === 'confirmed') {
		return data.shelter
			? { status: 'confirmed', shelter: data.shelter, municipality }
			: { status: 'unconfirmed', shelter: null, municipality };
	}
	return { status: data.status, shelter: null, municipality };
}

/** `useResponsibleShelter({ lat, lng })` or `useResponsibleShelter({ municipality })`; `null` skips the request. */
export function useResponsibleShelter(arg: ResponsibleShelterArg | null): ResponsibleShelterResult {
	// currentData is undefined while the new arg loads, so the previous area's shelter never leaks through.
	const { currentData, isError, isFetching } = useGetResponsibleShelterQuery(arg ?? { municipality: '' }, {
		skip: !arg,
	});
	return toResult(arg ? currentData : undefined, isError, isFetching);
}
