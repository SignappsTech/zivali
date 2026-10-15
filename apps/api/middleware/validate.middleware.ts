// validate(schema, source) for body, query and params. A failure throws AppError('VALIDATION') with dotted-path
// issues (rendered as 400 by the error middleware). The parsed (coerced, stripped) value replaces the input.
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../lib/errors.ts';

export type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodType, source: Source = 'body'): RequestHandler {
	return async (req, _res, next) => {
		const result = await schema.safeParseAsync(req[source]);
		if (!result.success) {
			const issues = result.error.issues.map((issue) => ({
				path: issue.path.length ? issue.path.map(String).join('.') : '(root)',
				message: issue.message,
			}));
			throw new AppError('VALIDATION', 'Validation failed', undefined, issues);
		}
		const value = result.data;
		// Express 5 exposes req.query as a getter, so define the property instead of assigning it.
		Object.defineProperty(req, source, { value, writable: true, configurable: true, enumerable: true });
		next();
	};
}

export default { validate };
