// C7 manage link. Stub typed from @zivali/types for TASK-17.1 (owner of the REST route): delete it when `gen:api`
// emits the generated endpoint.
import type { ManageClaimInput, ManageClaimResponse } from '@zivali/types';

import { api } from './rtk.ts';

export const manageApi = api.injectEndpoints({
	endpoints: (build) => ({
		// The caller (anonymous or signed in) becomes a manager of the report; then GET /v1/reports/:code.
		claimManageLink: build.mutation<ManageClaimResponse, ManageClaimInput>({
			query: (body) => ({ url: '/v1/manage/claim', method: 'POST', body }),
		}),
		// Managers: a new link to the finder email on file (204); CONFLICT without one, 3 per report per day.
		resendManageLink: build.mutation<void, { code: string }>({
			query: ({ code }) => ({ url: `/v1/reports/${encodeURIComponent(code)}/manage-link/resend`, method: 'POST' }),
		}),
	}),
});

export const { useClaimManageLinkMutation, useResendManageLinkMutation } = manageApi;
