// Domains throw AppError with a stable C1 code; the error middleware renders it with the code's HTTP status.
// Codes and statuses are the shared C1 table in @zivali/types (also used by the clients).
import { ERROR_HTTP_STATUS, type ErrorCode } from '@zivali/types';

export { ERROR_HTTP_STATUS, type ErrorCode };

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
		return ERROR_HTTP_STATUS[this.code];
	}
}
