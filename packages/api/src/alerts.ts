// C10 nearby alerts. Endpoints are injectEndpoints stubs for TASK-23.1: delete them when `gen:api` emits the
// generated ones. Send the centre through coarsenPoint() (@zivali/validation/geo) first (C6 §Storage).
import type { AlertSubscription, AlertSubscriptionInput } from '@zivali/types';

import { api } from './rtk.ts';

export const alertsApi = api.enhanceEndpoints({ addTagTypes: ['AlertSubscription'] }).injectEndpoints({
	endpoints: (build) => ({
		getAlertSubscription: build.query<AlertSubscription | null, void>({
			query: () => '/v1/alert-subscription',
			providesTags: ['AlertSubscription'],
		}),
		saveAlertSubscription: build.mutation<AlertSubscription, AlertSubscriptionInput>({
			query: (body) => ({ url: '/v1/alert-subscription', method: 'PUT', body }),
			invalidatesTags: ['AlertSubscription'],
		}),
		deleteAlertSubscription: build.mutation<void, void>({
			query: () => ({ url: '/v1/alert-subscription', method: 'DELETE' }),
			invalidatesTags: ['AlertSubscription'],
		}),
	}),
});

export const { useGetAlertSubscriptionQuery, useSaveAlertSubscriptionMutation, useDeleteAlertSubscriptionMutation } =
	alertsApi;
