// validate(schema, source) for body, query and params. A failure throws the ZodError; the error middleware
// turns it into VALIDATION with dotted-path issues. The parsed (coerced, stripped) value replaces the input.
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodType, source: Source = 'body'): RequestHandler {
	return async (req, _res, next) => {
		const value = await schema.parseAsync(req[source]);
		// Express 5 exposes req.query as a getter, so define the property instead of assigning it.
		Object.defineProperty(req, source, { value, writable: true, configurable: true, enumerable: true });
		next();
	};
}

export default { validate };
