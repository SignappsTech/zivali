// In-memory API for tests and for UI work before an endpoint is merged. It runs the real client over a fake
// fetch, so headers and error parsing behave exactly as against apps/api.
//   const api = createMockApi({ 'GET /v1/reports/:code': report, 'POST /v1/reports': ({ body }) => created });
import { type ApiClient, type ApiClientOptions, type ErrorCode, createApiClient, ERROR_STATUS } from './client.ts';

export type MockRequest = {
	method: string;
	path: string;
	params: Record<string, string>;
	query: Record<string, string>;
	headers: Record<string, string>;
	body: unknown;
};

/** A route returns the JSON body (status 200, `undefined` → 204) or a `Response` (see `mockError`). */
export type MockHandler = (request: MockRequest) => unknown;
/** Keys are `'<METHOD> <path pattern>'` with `:param` segments; a non-function value is a static fixture. */
export type MockRoutes = Record<string, MockHandler | object>;

// Not Response.json(): the React Native jest environment polyfills Response without it.
const json = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** An error response in the C1 shape, with the status that belongs to the code. */
export const mockError = (code: ErrorCode, message: string = code, details?: Record<string, unknown>): Response =>
	json({ error: { code, message, details } }, ERROR_STATUS[code]);

function matchPath(pattern: string, path: string): Record<string, string> | null {
	const want = pattern.split('/');
	const got = path.split('/');
	if (want.length !== got.length) return null;
	const params: Record<string, string> = {};
	for (const [i, segment] of want.entries()) {
		if (segment.startsWith(':')) params[segment.slice(1)] = decodeURIComponent(got[i]);
		else if (segment !== got[i]) return null;
	}
	return params;
}

export function createMockApi(
	routes: MockRoutes = {},
	options: Partial<ApiClientOptions> = {}
): ApiClient & { calls: MockRequest[] } {
	const calls: MockRequest[] = [];
	const table = Object.entries(routes).map(([key, value]) => {
		const [method, pattern] = key.split(' ') as [string, string];
		return { method, pattern, value };
	});

	const mockFetch: typeof fetch = async (input, init = {}) => {
		const url = new URL(String(input));
		const method = init.method ?? 'GET';
		for (const route of table) {
			const params = route.method === method ? matchPath(route.pattern, url.pathname) : null;
			if (!params) continue;
			const request: MockRequest = {
				method,
				path: url.pathname,
				params,
				query: Object.fromEntries(url.searchParams),
				headers: init.headers as Record<string, string>,
				body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
			};
			calls.push(request);
			const result =
				typeof route.value === 'function' ? await (route.value as MockHandler)(request) : route.value;
			if (result instanceof Response) return result;
			return result === undefined ? new Response(null, { status: 204 }) : json(result);
		}
		return mockError('NOT_FOUND', `No mock for ${method} ${url.pathname}`);
	};

	const client = createApiClient({
		baseUrl: 'http://api.mock',
		getAccessToken: () => 'mock-token',
		deviceId: '00000000-0000-4000-8000-000000000000',
		locale: 'sl',
		...options,
		fetch: mockFetch,
	});
	return { ...client, calls };
}
