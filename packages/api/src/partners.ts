// C14 partner stats and leads. Endpoints are injectEndpoints stubs for TASK-38.2: delete them when `gen:api` emits
// the generated ones.
import type { AdminLeadList, CursorQuery, IdResponse, LeadInput, PartnerStats } from '@zivali/types';

import { api } from './rtk.ts';

export const partnersApi = api.injectEndpoints({
	endpoints: (build) => ({
		/** Counts 1–4 arrive as '<5'. */
		getPartnerStats: build.query<PartnerStats, void>({ query: () => '/v1/partners/stats' }),
		/** Captcha token required; errors `VALIDATION`, `CAPTCHA_FAILED`, `RATE_LIMITED`. */
		createLead: build.mutation<IdResponse, LeadInput>({
			query: (body) => ({ url: '/v1/leads', method: 'POST', body }),
		}),
		listAdminLeads: build.query<AdminLeadList, CursorQuery | void>({
			query: (params) => ({ url: '/v1/admin/leads', params: params ?? undefined }),
		}),
	}),
});

export const { useGetPartnerStatsQuery, useCreateLeadMutation, useListAdminLeadsQuery } = partnersApi;
