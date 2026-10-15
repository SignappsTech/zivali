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
	}),
});

export const { useClaimManageLinkMutation } = manageApi;
