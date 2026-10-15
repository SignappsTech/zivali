// C8 match review. Stubs owned by TASK-20.2 (match review API) until apps/api/openapi.json has these routes; then
// `gen:api` generates them and this file is deleted.
import type { ConfirmMatchResponse, MatchList, MatchListQuery, RejectMatchInput, Uuid } from '@zivali/types';

import { api } from './rtk.ts';

export const matchesApi = api.enhanceEndpoints({ addTagTypes: ['Matches', 'Reports'] }).injectEndpoints({
	endpoints: (build) => ({
		listMatches: build.query<MatchList, { code: string } & MatchListQuery>({
			query: ({ code, state }) => ({ url: `/v1/reports/${code}/matches`, params: { state: state?.join(',') } }),
			providesTags: ['Matches'],
		}),
		// Opens the conversation (C9); the lost report becomes `matched`. UNVERIFIED_EMAIL, CONFLICT.
		confirmMatch: build.mutation<ConfirmMatchResponse, { id: Uuid }>({
			query: ({ id }) => ({ url: `/v1/matches/${id}/confirm`, method: 'POST' }),
			invalidatesTags: ['Matches', 'Reports'],
		}),
		rejectMatch: build.mutation<void, { id: Uuid; body?: RejectMatchInput }>({
			query: ({ id, body = {} }) => ({ url: `/v1/matches/${id}/reject`, method: 'POST', body }),
			invalidatesTags: ['Matches'],
		}),
	}),
});

export const { useListMatchesQuery, useConfirmMatchMutation, useRejectMatchMutation } = matchesApi;
