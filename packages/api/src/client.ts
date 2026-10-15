// Thin fetch client over the REST API (contract C1): the transport under the RTK Query slice (`rtk.ts`), and
// usable on its own where there is no store (server components, the mobile outbox).

/** Error codes from C1 with their HTTP status; `NETWORK` is client-side only (no response). */
export const ERROR_STATUS = {
	VALIDATION: 400,
	UNAUTHENTICATED: 401,
	FORBIDDEN: 403,
	UNVERIFIED_EMAIL: 403,
	AAL2_REQUIRED: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	DUPLICATE_OPEN_REPORT: 409,
	GONE: 410,
	MIN_AMOUNT: 422,
	LIVE_MODE_FORBIDDEN: 422,
	CAPTCHA_FAILED: 422,
	RATE_LIMITED: 429,
	INTERNAL: 500,
	SERVICE_UNAVAILABLE: 503,
	NETWORK: 0,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;
export type ApiIssue = { path: string; message: string };
export type ApiErrorBody = {
	error: { code: string; message?: string; details?: Record<string, unknown>; issues?: ApiIssue[] };
};

export class ApiError extends Error {
	override name = 'ApiError';
	readonly code: ErrorCode;
	/** HTTP status; 0 for `NETWORK`. */
	readonly status: number;
	readonly details?: Record<string, unknown>;
	readonly issues?: ApiIssue[];
	readonly requestId?: string;

	constructor(
		code: ErrorCode,
		message: string,
		init: {
			status?: number;
			details?: Record<string, unknown>;
			issues?: ApiIssue[];
			requestId?: string;
			cause?: unknown;
		} = {}
	) {
		super(message, { cause: init.cause });
		this.code = code;
		this.status = init.status ?? ERROR_STATUS[code];
		this.details = init.details;
		this.issues = init.issues;
		this.requestId = init.requestId;
	}
}

/** Builds an ApiError from a non-2xx response body; unknown or unreadable bodies become `INTERNAL`. */
export function parseApiError(status: number, body: unknown, requestId?: string): ApiError {
	const error = (body as Partial<ApiErrorBody> | null)?.error;
	const code =
		error?.code && Object.hasOwn(ERROR_STATUS, error.code) && error.code !== 'NETWORK'
			? (error.code as ErrorCode)
			: 'INTERNAL';
	return new ApiError(code, error?.message ?? `HTTP ${status}`, {
		status,
		details: error?.details,
		issues: error?.issues,
		requestId,
	});
}

export type Locale = 'sl' | 'en';
type Token = string | null | undefined;

export type ApiClientOptions = {
	baseUrl: string;
	/** Called on every request, so a refreshed session token is picked up. */
	getAccessToken?: () => Token | Promise<Token>;
	/** Install/browser uuid (C7); sent as `x-device-id` when set. */
	deviceId?: string;
	locale: Locale;
	fetch?: typeof fetch;
};

export type RequestOptions = {
	/** Query string; `undefined` and `null` values are left out (`cursor`, `limit`, filters). */
	query?: Record<string, string | number | boolean | null | undefined>;
	body?: unknown;
	/**
	 * Sends `Idempotency-Key` (C1). Pass a stable key (outbox id, one key per form submit) when the call can be
	 * repeated; `true` makes a fresh key for this call only.
	 */
	idempotent?: true | string;
	/** Extra headers (header parameters from the OpenAPI spec); the client's own headers win. */
	headers?: Record<string, string | undefined>;
	signal?: AbortSignal;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiClient = {
	request<T>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T>;
};

// Hermes (React Native) has no crypto.randomUUID; a Math.random v4 is enough for an idempotency key.
export const uuid = (): string =>
	globalThis.crypto?.randomUUID?.() ??
	'10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
		(Number(c) ^ ((Math.random() * 16) >> (Number(c) / 4))).toString(16)
	);

export function createApiClient(options: ApiClientOptions): ApiClient {
	const baseUrl = options.baseUrl.replace(/\/+$/, '');
	const doFetch = options.fetch ?? ((input, init) => fetch(input, init));

	return {
		async request<T>(
			method: HttpMethod,
			path: string,
			{ query, body, idempotent, headers: extra, signal }: RequestOptions = {}
		) {
			// A relative path could point the Bearer token at another host (`.evil.com/x`).
			if (!path.startsWith('/')) throw new Error(`API path must start with "/": ${path}`);
			// Built by hand: React Native's URLSearchParams is incomplete.
			const search = Object.entries(query ?? {})
				.filter(([, value]) => value != null)
				.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
				.join('&');
			const url = `${baseUrl}${path}${search ? `?${search}` : ''}`;

			const headers: Record<string, string> = {
				...Object.fromEntries(Object.entries(extra ?? {}).filter(([, v]) => v != null)),
				'Accept-Language': options.locale,
			};
			const token = await options.getAccessToken?.();
			if (token) headers.Authorization = `Bearer ${token}`;
			if (options.deviceId) headers['x-device-id'] = options.deviceId;
			if (idempotent) headers['Idempotency-Key'] = idempotent === true ? uuid() : idempotent;
			if (body !== undefined) headers['Content-Type'] = 'application/json';

			let res: Response;
			let text: string;
			try {
				res = await doFetch(url, {
					method,
					headers,
					body: body === undefined ? undefined : JSON.stringify(body),
					signal,
				});
				text = await res.text();
			} catch (cause) {
				if (signal?.aborted || (cause as Error | null)?.name === 'AbortError') throw cause;
				throw new ApiError('NETWORK', 'Network request failed', { cause });
			}
			const requestId = res.headers.get('x-request-id') ?? undefined;

			let json: unknown = undefined;
			try {
				if (text) json = JSON.parse(text);
			} catch (cause) {
				// A 2xx that is not JSON is a server fault; an error page (proxy) falls back to INTERNAL below.
				if (res.ok)
					throw new ApiError('INTERNAL', 'Invalid JSON response', { status: res.status, requestId, cause });
			}
			if (res.ok) return json as T;
			throw parseApiError(res.status, json, requestId);
		},
	};
}
