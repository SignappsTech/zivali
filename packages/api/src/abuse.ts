// C11 abuse reports and the moderation queue. Endpoints are injectEndpoints stubs for TASK-25.2: delete them when
// `gen:api` emits the generated ones.
import type {
	AbuseReportInput,
	AbuseReportResponse,
	AdminAbuseReportList,
	AdminAbuseReportQuery,
	ModerationFlagList,
	ModerationFlagQuery,
} from '@zivali/types';

import { pageParams } from './pagination.ts';
import { api } from './rtk.ts';

export const abuseApi = api.enhanceEndpoints({ addTagTypes: ['AbuseReport'] }).injectEndpoints({
	endpoints: (build) => ({
		/** `duplicate: true` when the caller already reported this target (200, not an error). */
		reportAbuse: build.mutation<AbuseReportResponse, AbuseReportInput>({
			query: (body) => ({ url: '/v1/abuse-reports', method: 'POST', body }),
			invalidatesTags: ['AbuseReport'],
		}),
		// Staff (aal2), newest first, keyset "Load more" (P19 table pattern).
		listAdminAbuseReports: build.infiniteQuery<
			AdminAbuseReportList,
			Omit<AdminAbuseReportQuery, 'cursor'>,
			string | null
		>({
			infiniteQueryOptions: pageParams,
			query: ({ queryArg, pageParam }) => ({
				url: '/v1/admin/abuse-reports',
				params: { ...queryArg, cursor: pageParam },
			}),
			providesTags: ['AbuseReport'],
		}),
		listModerationFlags: build.infiniteQuery<
			ModerationFlagList,
			Omit<ModerationFlagQuery, 'cursor'>,
			string | null
		>({
			infiniteQueryOptions: pageParams,
			query: ({ queryArg, pageParam }) => ({
				url: '/v1/admin/moderation-flags',
				params: { ...queryArg, cursor: pageParam },
			}),
		}),
	}),
});

export const { useReportAbuseMutation, useListAdminAbuseReportsInfiniteQuery, useListModerationFlagsInfiniteQuery } =
	abuseApi;
