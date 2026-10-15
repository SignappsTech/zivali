// RTK Query over the client. `api` is the empty slice: generated endpoints (`generated/endpoints.ts`,
// `pnpm --filter @zivali/api gen:api`) and hand-written ones (infinite lists) extend it with injectEndpoints.
import { configureStore } from '@reduxjs/toolkit';
import { type BaseQueryApi, type BaseQueryFn, retry } from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';

import {
	type ApiClient,
	ApiError,
	type ApiIssue,
	type ErrorCode,
	type HttpMethod,
	type RequestOptions,
} from './client.ts';

/** What codegen emits in `query: (arg) => ({ … })`; a string is a GET path. */
export type QueryArgs =
	| string
	| {
			url: string;
			method?: HttpMethod;
			params?: RequestOptions['query'];
			body?: unknown;
			headers?: Record<string, string | undefined>;
	  };

/** Plain data, not the ApiError instance: the Redux state must stay serialisable. */
export type ApiErrorData = {
	code: ErrorCode;
	message: string;
	details?: Record<string, unknown>;
	issues?: ApiIssue[];
	requestId?: string;
};
/** `error` of a failed query or mutation; `status` is 0 for NETWORK. */
export type QueryError = { status: number; data: ApiErrorData };

/**
 * Per endpoint (`extraOptions` in an override): `idempotent: true` sends a fresh `Idempotency-Key` per call. A call
 * that is repeated (outbox, re-submit) passes its stable key as the `Idempotency-Key` header parameter instead.
 */
export type QueryExtraOptions = { idempotent?: true };

/** Thunk extra argument (createApiStore): each store, so each SSR request and test, has its own client. */
type Extra = { client: ApiClient };

export const baseQuery: BaseQueryFn<QueryArgs, unknown, QueryError, QueryExtraOptions> = async (
	args,
	{ signal, extra },
	extraOptions
) => {
	const { url, method = 'GET', params, body, headers } = typeof args === 'string' ? { url: args } : args;
	try {
		const data = await (extra as Extra).client.request(method, url, {
			query: params,
			body,
			headers,
			signal,
			idempotent: extraOptions?.idempotent,
		});
		// A 204 resolves to undefined, which RTK Query's development check reports as "neither data nor error".
		return { data: data ?? null };
	} catch (cause) {
		if (!(cause instanceof ApiError) && !signal.aborted) throw cause;
		// RTK drops the result of an aborted call; it only has to be an error.
		const error = cause instanceof ApiError ? cause : new ApiError('NETWORK', 'Request aborted', { cause });
		const { status, code, message, details, issues, requestId } = error;
		return { error: { status, data: { code, message, details, issues, requestId } } };
	}
};

/** Two retries for network and 5xx errors on queries; none for 4xx or mutations (frontend.md §Error handling). */
export const retryCondition = (
	error: unknown,
	_args: unknown,
	{ attempt, baseQueryApi }: { attempt: number; baseQueryApi: BaseQueryApi }
): boolean => {
	const { status } = error as QueryError;
	return (
		attempt <= 2 && baseQueryApi.type === 'query' && !baseQueryApi.signal.aborted && (status === 0 || status >= 500)
	);
};

export const api = createApi({
	reducerPath: 'api',
	baseQuery: retry(baseQuery, { retryCondition }),
	endpoints: () => ({}),
});

/** The app store: `createApiStore(createApiClient({ … }))`, or `createApiStore(createMockApi(routes))` in tests. */
export function createApiStore(client: ApiClient) {
	const extraArgument: Extra = { client };
	return configureStore({
		reducer: { [api.reducerPath]: api.reducer },
		middleware: (getDefault) => getDefault({ thunk: { extraArgument } }).concat(api.middleware),
	});
}
export type ApiStore = ReturnType<typeof createApiStore>;
