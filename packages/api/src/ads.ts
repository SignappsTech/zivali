// C14 ads: serving (TASK-35.1) and admin (TASK-37.2). Endpoints are injectEndpoints stubs: delete them when
// `gen:api` emits the generated ones. `useAd` is hand-written and stays. Clicks are plain links to `ad.click_url`.
import type {
	Ad,
	AdDeleteInput,
	AdImageInput,
	AdImageUploadResponse,
	AdImpressionInput,
	AdInput,
	AdminAd,
	AdminAdList,
	AdminAdQuery,
	AdSlot,
	AdSlotQuery,
	AdStats,
	AdStatsQuery,
	AdStatusInput,
	Uuid,
} from '@zivali/types';

import { api, type QueryError } from './rtk.ts';

export const adsApi = api.enhanceEndpoints({ addTagTypes: ['AdminAd', 'AuditLog'] }).injectEndpoints({
	endpoints: (build) => ({
		/** `null` when nothing (not even a house ad) fits, or for ad-free users. */
		getAdForSlot: build.query<Ad | null, AdSlotQuery & { slot: AdSlot }>({
			query: ({ slot, ...params }) => ({ url: `/v1/ads/slot/${slot}`, params }),
		}),
		/** Once, when the ad first renders (A-016). */
		recordAdImpression: build.mutation<void, { id: Uuid; body: AdImpressionInput }>({
			query: ({ id, body }) => ({ url: `/v1/ads/${id}/impressions`, method: 'POST', body }),
		}),
		listAdminAds: build.query<AdminAdList, AdminAdQuery | void>({
			query: (params) => ({ url: '/v1/admin/ads', params: params ?? undefined }),
			providesTags: ['AdminAd'],
		}),
		createAd: build.mutation<AdminAd, AdInput>({
			query: (body) => ({ url: '/v1/admin/ads', method: 'POST', body }),
			invalidatesTags: ['AdminAd', 'AuditLog'],
		}),
		updateAd: build.mutation<AdminAd, { id: Uuid; body: AdInput }>({
			query: ({ id, body }) => ({ url: `/v1/admin/ads/${id}`, method: 'PUT', body }),
			invalidatesTags: ['AdminAd', 'AuditLog'],
		}),
		/** Presigned PUT for the ad image (C5 pattern); upload the file, then reload the ad. */
		requestAdImageUpload: build.mutation<AdImageUploadResponse, { id: Uuid; body: AdImageInput }>({
			query: ({ id, body }) => ({ url: `/v1/admin/ads/${id}/image`, method: 'POST', body }),
			invalidatesTags: ['AdminAd', 'AuditLog'],
		}),
		setAdStatus: build.mutation<AdminAd, { id: Uuid; body: AdStatusInput }>({
			query: ({ id, body }) => ({ url: `/v1/admin/ads/${id}/status`, method: 'POST', body }),
			invalidatesTags: ['AdminAd', 'AuditLog'],
		}),
		/** Soft delete; the note is required (stored in the audit entry). */
		deleteAd: build.mutation<void, { id: Uuid; body: AdDeleteInput }>({
			query: ({ id, body }) => ({ url: `/v1/admin/ads/${id}`, method: 'DELETE', body }),
			invalidatesTags: ['AdminAd', 'AuditLog'],
		}),
		getAdStats: build.query<AdStats, AdStatsQuery & { id: Uuid }>({
			query: ({ id, ...params }) => ({ url: `/v1/admin/ads/${id}/stats`, params }),
		}),
	}),
});

export const {
	useGetAdForSlotQuery,
	useRecordAdImpressionMutation,
	useListAdminAdsQuery,
	useCreateAdMutation,
	useUpdateAdMutation,
	useRequestAdImageUploadMutation,
	useSetAdStatusMutation,
	useDeleteAdMutation,
	useGetAdStatsQuery,
} = adsApi;

export type AdState = { ad: Ad | null; loading: boolean; error: QueryError | null };

/** Query result → AdState; an error leaves `ad` null so the slot collapses. */
export const adState = ({
	data,
	isLoading,
	error,
}: {
	data?: Ad | null;
	isLoading: boolean;
	error?: unknown;
}): AdState => ({
	ad: error ? null : (data ?? null),
	loading: isLoading,
	error: (error as QueryError | undefined) ?? null,
});

/** The ad for a slot (C14). Never throws: render nothing unless `ad` is set. */
export function useAd(slot: AdSlot, ctx: AdSlotQuery = {}): AdState {
	return adState(useGetAdForSlotQuery({ slot, ...ctx }));
}
