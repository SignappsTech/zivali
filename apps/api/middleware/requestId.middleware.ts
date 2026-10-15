// First middleware: one id per request, taken from a well-formed incoming `x-request-id` or generated.
import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

const SAFE_ID = /^[\w-]{8,64}$/;

export const requestId: RequestHandler = (req, res, next) => {
	const incoming = req.get('x-request-id');
	req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
	res.set('x-request-id', String(req.id));
	next();
};

export default requestId;
