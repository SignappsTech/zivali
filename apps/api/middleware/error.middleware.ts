// Central error middleware (C1): every failure leaves as { error: { code, message, details?, issues? } }.
// Express 5 forwards thrown errors and rejected promises here, so controllers and domains never catch to rethrow.
import type { ErrorRequestHandler, RequestHandler } from 'express';

import { Prisma } from '../generated/client.ts';
import { AppError } from '../lib/errors.ts';

const busy = () => new AppError('SERVICE_UNAVAILABLE', 'Busy, try again', { retry_after_s: 1 });

function toAppError(err: unknown): AppError | undefined {
	if (err instanceof AppError) return err;
	if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === 'P2002') return new AppError('CONFLICT', 'Resource already exists');
		if (err.code === 'P2025') return new AppError('NOT_FOUND', 'Resource not found');
		if (err.code === 'P2024') return busy();
	}
	// A burst that outlasts the small pool's connect timeout (node-postgres, possibly wrapped by the Prisma adapter):
	// the client retries, it is not a server bug.
	for (let e: unknown = err, i = 0; e instanceof Error && i < 3; e = e.cause, i++) {
		if (e.message.includes('timeout exceeded when trying to connect')) return busy();
	}
	// body-parser errors (malformed JSON, body over 1 MB) are 4xx with a `type`; never echo the body back.
	const { status, type } = (err ?? {}) as { status?: number; type?: string };
	if (type && status && status < 500) return new AppError('VALIDATION', 'Invalid request body', { reason: type });
}

export const notFound: RequestHandler = () => {
	throw new AppError('NOT_FOUND', 'Route not found');
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
	// A response already streaming cannot change status; Express closes the connection.
	if (res.headersSent) return next(err);

	// Only validate() produces VALIDATION from Zod. Any other ZodError (e.g. a failed .parse in a mapper) is our
	// bug, not bad input: it falls through to INTERNAL and is logged.
	const known = toAppError(err);
	if (!known) {
		req.log.error({ err }, 'unhandled error');
		res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
		return;
	}

	const retryAfter = known.details?.retry_after_s;
	if ((known.code === 'RATE_LIMITED' || known.code === 'SERVICE_UNAVAILABLE') && typeof retryAfter === 'number')
		res.set('Retry-After', String(retryAfter));

	res.status(known.status).json({
		error: {
			code: known.code,
			message: known.message,
			...(known.details && { details: known.details }),
			...(known.issues && { issues: known.issues }),
		},
	});
};

export default { notFound, errorHandler };
