// C11 abuse reports and the moderation queue. Endpoints are injectEndpoints stubs for TASK-25.2: delete them when
// `gen:api` emits the generated ones.
import type {
	AbuseReportInput,
	AbuseReportResponse,
	AdminAbuseReportList,
	AdminAbuseReportQuery,
	CursorQuery,
	ModerationFlagList,
} from '@zivali/types';

import { api } from './rtk.ts';

export const abuseApi = api.enhanceEndpoints({ addTagTypes: ['AbuseReport'] }).injectEndpoints({
	endpoints: (build) => ({
		/** `duplicate: true` when the caller already reported this target (200, not an error). */
		reportAbuse: build.mutation<AbuseReportResponse, AbuseReportInput>({
			query: (body) => ({ url: '/v1/abuse-reports', method: 'POST', body }),
			invalidatesTags: ['AbuseReport'],
		}),
		listAdminAbuseReports: build.query<AdminAbuseReportList, AdminAbuseReportQuery | void>({
			query: (params) => ({ url: '/v1/admin/abuse-reports', params: params ?? undefined }),
			providesTags: ['AbuseReport'],
		}),
		listModerationFlags: build.query<ModerationFlagList, CursorQuery | void>({
			query: (params) => ({ url: '/v1/admin/moderation-flags', params: params ?? undefined }),
		}),
	}),
});

export const { useReportAbuseMutation, useListAdminAbuseReportsQuery, useListModerationFlagsQuery } = abuseApi;
