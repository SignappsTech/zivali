// C6 place search on our own API (GURS data; no third-party geocoder, no key). Queries and points go in POST bodies
// only, never in URLs. The endpoints are stubs owned by TASK-15.8 until apps/api/openapi.json has them; then
// `gen:api` generates them and they are deleted here. The debounced hook stays.
import { useEffect } from 'react';

import type { GeoReverseResponse, GeoSearchInput, GeoSearchResponse, LatLng, Place } from '@zivali/types';

import { api } from './rtk.ts';

export const geocodeApi = api.injectEndpoints({
	endpoints: (build) => ({
		searchPlaces: build.query<Place[], GeoSearchInput>({
			query: (body) => ({ url: '/v1/geo/search', method: 'POST', body }),
			transformResponse: (response: GeoSearchResponse) => response.items,
		}),
		reversePlace: build.query<Place | null, LatLng>({
			query: ({ lat, lng }) => ({ url: '/v1/geo/reverse', method: 'POST', body: { lat, lng } }),
			transformResponse: (response: GeoReverseResponse) => response.place,
		}),
	}),
});

export const { useSearchPlacesQuery, useLazySearchPlacesQuery, useReversePlaceQuery, useLazyReversePlaceQuery } =
	geocodeApi;

export const PLACE_SEARCH_DELAY_MS = 300;
export const PLACE_SEARCH_MIN_CHARS = 3;

/**
 * Starts `trigger` after the debounce delay when `q` has at least 3 characters. The returned cleanup cancels the
 * timer and aborts the request it started, so a new keystroke aborts the previous search.
 */
export function schedulePlaceSearch(
	trigger: (arg: GeoSearchInput, preferCacheValue: boolean) => { abort(): void },
	arg: GeoSearchInput
): () => void {
	if (arg.q.length < PLACE_SEARCH_MIN_CHARS) return () => {};
	let request: { abort(): void } | undefined;
	const timer = setTimeout(() => (request = trigger(arg, true)), PLACE_SEARCH_DELAY_MS);
	return () => {
		clearTimeout(timer);
		request?.abort();
	};
}

/** Search-as-you-type for LocationPicker (web and mobile): debounce 300 ms, minimum 3 characters, abort previous. */
export function usePlaceSearch(q: string, near?: LatLng) {
	const [trigger, { data, isFetching, error }] = useLazySearchPlacesQuery();
	const text = q.trim();
	const { lat, lng } = near ?? {};
	useEffect(
		() =>
			schedulePlaceSearch(trigger, {
				q: text,
				near: lat === undefined || lng === undefined ? undefined : { lat, lng },
			}),
		[trigger, text, lat, lng]
	);
	const active = text.length >= PLACE_SEARCH_MIN_CHARS;
	return { places: (active && data) || [], isFetching: active && isFetching, error: active ? error : undefined };
}
