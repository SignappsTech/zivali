// C4 reports over REST. Stubs typed from @zivali/types until apps/api/openapi.json has these routes; then `gen:api`
// generates them and this file is deleted (keep `reportQuery` for the URL privacy rule below).
import type {
	BBox,
	CreateReportInput,
	CreateReportResponse,
	MapReportList,
	MapReportQuery,
	MyReportList,
	PublicReport,
	ReportList,
	ReportOwnerView,
	ReportSearch,
	ReportTransitionInput,
	SyncReportsQuery,
	SyncReportsResponse,
	UpdateReportInput,
} from '@zivali/types';

import { pageParams } from './pagination.ts';
import { api } from './rtk.ts';

// Location in URLs (C4 §REST, CH-19): coordinates are rounded to 2 decimals (about 1 km) before they go in a query
// string; precise points travel only in POST/PATCH bodies.
const round2 = (n: number): number => Math.round(n * 100) / 100;
// The bbox is rounded outwards, so the visible map is still covered.
const roundBBox = ([w, s, e, n]: BBox): string =>
	[Math.floor(w * 100), Math.floor(s * 100), Math.ceil(e * 100), Math.ceil(n * 100)].map((v) => v / 100).join(',');
const list = (values?: readonly string[]): string | undefined => (values?.length ? values.join(',') : undefined);

/** Query string of GET /v1/reports and /v1/reports/map: comma lists, `bbox=w,s,e,n`, `near=lat,lng,km`. */
export function reportQuery({ bbox, near, types, species, colours, sizes, ...rest }: ReportSearch) {
	return {
		...rest,
		types: list(types),
		species: list(species),
		colours: list(colours),
		sizes: list(sizes),
		bbox: bbox && roundBBox(bbox),
		near: near && `${round2(near.lat)},${round2(near.lng)},${near.km}`,
	};
}

export const reportsApi = api.enhanceEndpoints({ addTagTypes: ['Reports'] }).injectEndpoints({
	endpoints: (build) => ({
		// TASK-29.2. `location` is the point already coarsened by the form (C6 §Storage). The key must be stable
		// across repeats of one submission (form submit, outbox item), C1.
		createReport: build.mutation<CreateReportResponse, { body: CreateReportInput; idempotencyKey: string }>({
			query: ({ body, idempotencyKey }) => ({
				url: '/v1/reports',
				method: 'POST',
				body,
				headers: { 'Idempotency-Key': idempotencyKey },
			}),
			invalidatesTags: ['Reports'],
		}),
		// TASK-6.6. Managers get the ReportOwnerView fields too.
		getReport: build.query<PublicReport | ReportOwnerView, { code: string }>({
			query: ({ code }) => `/v1/reports/${code}`,
			providesTags: ['Reports'],
		}),
		// TASK-29.2
		updateReport: build.mutation<ReportOwnerView, { code: string; body: UpdateReportInput }>({
			query: ({ code, body }) => ({ url: `/v1/reports/${code}`, method: 'PATCH', body }),
			invalidatesTags: ['Reports'],
		}),
		// TASK-31.3
		searchReports: build.infiniteQuery<ReportList, Omit<ReportSearch, 'cursor'>, string | null>({
			infiniteQueryOptions: pageParams,
			query: ({ queryArg, pageParam }) => ({
				url: '/v1/reports',
				params: { ...reportQuery(queryArg), cursor: pageParam },
			}),
			providesTags: ['Reports'],
		}),
		// TASK-31.3
		getMapReports: build.query<MapReportList, MapReportQuery>({
			query: (arg) => ({ url: '/v1/reports/map', params: reportQuery(arg) }),
			providesTags: ['Reports'],
		}),
		// TASK-29.2
		listMyReports: build.infiniteQuery<MyReportList, void, string | null>({
			infiniteQueryOptions: pageParams,
			query: ({ pageParam }) => ({ url: '/v1/me/reports', params: { cursor: pageParam } }),
			providesTags: ['Reports'],
		}),
		// TASK-26.3
		transitionReport: build.mutation<ReportOwnerView, { code: string; body: ReportTransitionInput }>({
			query: ({ code, body }) => ({ url: `/v1/reports/${code}/transitions`, method: 'POST', body }),
			invalidatesTags: ['Reports'],
		}),
		// TASK-85.1 (mobile offline cache, C17)
		syncReports: build.query<SyncReportsResponse, SyncReportsQuery>({
			query: ({ areas, since, limit }) => ({
				url: '/v1/sync/reports',
				params: {
					areas: JSON.stringify(
						areas.map((a) => ({ lat: round2(a.lat), lng: round2(a.lng), radius_km: a.radius_km }))
					),
					since,
					limit,
				},
			}),
		}),
	}),
});

export const {
	useCreateReportMutation,
	useGetReportQuery,
	useUpdateReportMutation,
	useSearchReportsInfiniteQuery,
	useGetMapReportsQuery,
	useListMyReportsInfiniteQuery,
	useTransitionReportMutation,
	useSyncReportsQuery,
	useLazySyncReportsQuery,
} = reportsApi;
