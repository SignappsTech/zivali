import { api } from '../rtk.ts';
export const addTagTypes = ['photos'] as const;
const injectedRtkApi = api
	.enhanceEndpoints({
		addTagTypes,
	})
	.injectEndpoints({
		endpoints: (build) => ({
			getPhoto: build.query<GetPhotoApiResponse, GetPhotoApiArg>({
				query: (queryArg) => ({ url: `/v1/photos/${queryArg.id}` }),
				providesTags: ['photos'],
			}),
			deletePhoto: build.mutation<DeletePhotoApiResponse, DeletePhotoApiArg>({
				query: (queryArg) => ({ url: `/v1/photos/${queryArg.id}`, method: 'DELETE' }),
				invalidatesTags: ['photos'],
			}),
		}),
		overrideExisting: false,
	});
export { injectedRtkApi as enhancedApi };
export type GetPhotoApiResponse = /** status 200 The photo */ PhotoView;
export type GetPhotoApiArg = {
	id: string;
};
export type DeletePhotoApiResponse = unknown;
export type DeletePhotoApiArg = {
	id: string;
};
export type PhotoStatus = 'pending' | 'uploaded' | 'accepted' | 'rejected' | 'published' | 'unpublished';
export type PhotoRejectReason = 'not_jpeg' | 'too_large' | 'hash_mismatch' | 'decode_failed';
export type PhotoView = {
	id: string;
	status: PhotoStatus;
	reject_reason?: PhotoRejectReason;
	thumb_url: string;
};
export type ErrorCode =
	| 'VALIDATION'
	| 'UNAUTHENTICATED'
	| 'FORBIDDEN'
	| 'UNVERIFIED_EMAIL'
	| 'AAL2_REQUIRED'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'DUPLICATE_OPEN_REPORT'
	| 'GONE'
	| 'MIN_AMOUNT'
	| 'LIVE_MODE_FORBIDDEN'
	| 'CAPTCHA_FAILED'
	| 'RATE_LIMITED'
	| 'INTERNAL'
	| 'SERVICE_UNAVAILABLE';
export type ApiErrorBody = {
	error: {
		code: ErrorCode;
		message: string;
		details?: {
			[key: string]: unknown;
		};
		issues?: {
			path: string;
			message: string;
		}[];
	};
};
export const { useGetPhotoQuery, useDeletePhotoMutation } = injectedRtkApi;
