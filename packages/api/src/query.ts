// TanStack Query helpers shared by web and mobile. Plain objects, so this package needs no TanStack dependency:
// `new QueryClient({ defaultOptions: queryDefaults })`.
import { ApiError } from './client.ts';

/** True for 4xx responses: retrying will not change the answer (RATE_LIMITED included). */
export const isClientError = (error: unknown): boolean =>
	error instanceof ApiError && error.status >= 400 && error.status < 500;

export const queryDefaults = {
	queries: {
		staleTime: 30_000,
		/** Two retries for network and 5xx errors, none for 4xx (frontend.md §Error handling). */
		retry: (failureCount: number, error: unknown): boolean => failureCount < 2 && !isClientError(error),
	},
};

/**
 * Query key factory per domain: `export const reportKeys = queryKeys('reports')`, then
 * `useQuery({ queryKey: reportKeys.detail(code) })` and `invalidateQueries({ queryKey: reportKeys.all })`.
 */
export function queryKeys<const D extends string>(domain: D) {
	return {
		all: [domain] as const,
		list: (params: object = {}) => [domain, 'list', params] as const,
		detail: (id: string) => [domain, 'detail', id] as const,
	};
}

/** A list response (C1): keyset pagination with `?cursor=&limit=`. */
export type Page<T> = { items: T[]; next_cursor: string | null };
export type PageParams = { cursor?: string | null; limit?: number };

/** Spread into `useInfiniteQuery`; the query function gets the cursor as `pageParam`. */
export const pageParams = {
	initialPageParam: null as string | null,
	getNextPageParam: <T>(last: Page<T>): string | null => last.next_cursor,
};

/** All items of an infinite query, in order. */
export const flattenPages = <T>(data: { pages: Page<T>[] } | undefined): T[] =>
	data?.pages.flatMap((page) => page.items) ?? [];
