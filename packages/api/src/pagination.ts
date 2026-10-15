// Keyset pagination (C1): lists are `{ items, next_cursor }`, requested with `?cursor=&limit=`.

export type Page<T> = { items: T[]; next_cursor: string | null };
export type PageParams = { cursor?: string | null; limit?: number };

/**
 * `infiniteQueryOptions` for an RTK Query infinite endpoint; `query` gets the cursor as `pageParam`:
 * `build.infiniteQuery<Page<Report>, Filters, string | null>({ infiniteQueryOptions: pageParams, query: … })`.
 */
export const pageParams = {
	initialPageParam: null as string | null,
	getNextPageParam: <T>(last: Page<T>): string | null => last.next_cursor,
};

/** All items of an infinite query, in order. */
export const flattenPages = <T>(data: { pages: Page<T>[] } | undefined): T[] =>
	data?.pages.flatMap((page) => page.items) ?? [];
