// C14 partner stats and leads. Endpoints are injectEndpoints stubs for TASK-38.2: delete them when `gen:api` emits
// the generated ones (the leads list stays hand-written: infinite lists do, frontend.md).
import type { AdminLeadList, IdResponse, LeadInput, PartnerStats } from '@zivali/types';

import { pageParams } from './pagination.ts';
import { api } from './rtk.ts';

export const partnersApi = api.injectEndpoints({
	endpoints: (build) => ({
		/** Counts 1–4 arrive as '<5'. */
		getPartnerStats: build.query<PartnerStats, void>({ query: () => '/v1/partners/stats' }),
		/** Captcha token required; errors `VALIDATION`, `CAPTCHA_FAILED`, `RATE_LIMITED`. */
		createLead: build.mutation<IdResponse, LeadInput>({
			query: (body) => ({ url: '/v1/leads', method: 'POST', body }),
		}),
		/** Admins (aal2), newest first; keyset "Load more" (P19 Enquiries, TASK-34.10). */
		listAdminLeads: build.infiniteQuery<AdminLeadList, void, string | null>({
			infiniteQueryOptions: pageParams,
			query: ({ pageParam }) => ({ url: '/v1/admin/leads', params: { cursor: pageParam } }),
		}),
	}),
});

export const { useGetPartnerStatsQuery, useCreateLeadMutation, useListAdminLeadsInfiniteQuery } = partnersApi;
