// Domains throw AppError with a stable C1 code; the error middleware renders it with the code's HTTP status.
// Codes and statuses are the shared C1 table in @zivali/types (also used by the clients).
import { ERROR_HTTP_STATUS, type ErrorCode } from '@zivali/types';

export { ERROR_HTTP_STATUS, type ErrorCode };

export class AppError extends Error {
	readonly code: ErrorCode;
	readonly details?: Record<string, unknown>;
	/** VALIDATION only: one entry per failed field, `path` is dotted ('location.lat'). */
	readonly issues?: { path: string; message: string }[];

	constructor(
		code: ErrorCode,
		message: string = code,
		details?: Record<string, unknown>,
		issues?: { path: string; message: string }[]
	) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.details = details;
		this.issues = issues;
	}

	get status(): number {
		return ERROR_HTTP_STATUS[this.code];
	}
}
