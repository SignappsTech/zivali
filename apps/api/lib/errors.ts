// Stable error codes and their HTTP status (C1). Domains throw AppError; the error middleware renders it.
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
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class AppError extends Error {
	readonly code: ErrorCode;
	readonly details?: Record<string, unknown>;

	constructor(code: ErrorCode, message: string = code, details?: Record<string, unknown>) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.details = details;
	}

	get status(): number {
		return ERROR_STATUS[this.code];
	}
}
