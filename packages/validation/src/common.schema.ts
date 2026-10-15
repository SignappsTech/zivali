// C1 building blocks: ids, dates, points, cursors, list pages, the error body.
import { ErrorCode } from './enums.ts';
import { z } from './zod.ts';

export const Uuid = z.uuid();
export const IsoDateTime = z.iso.datetime({ offset: true });
export const IsoDate = z.iso.date();
/** Report short code: 8 chars base58. */
export const ShortCode = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{8}$/, 'Invalid code');
/** ASCII lower-case slug (municipalities, regions, shelters). */
export const Slug = z
	.string()
	.max(100)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');
export const Lat = z.number().min(-90).max(90);
export const Lng = z.number().min(-180).max(180);
/** Trimmed, non-empty text of at most `max` characters. Too long aborts, so later refines never see huge input. */
export const text = (max: number) => z.string().trim().min(1).max(max, { abort: true });
/** "HH:MM", Europe/Ljubljana (quiet hours). */
export const ClockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');

export const LatLng = z.object({ lat: Lat, lng: Lng }).openapi('LatLng');
export const Location = z.object({ lat: Lat, lng: Lng, accuracy_m: z.number().min(0).optional() }).openapi('Location');

// Query strings arrive as strings: coerce numbers, split comma lists (or repeated keys).
export const limit = (max: number) => z.coerce.number().int().min(1).max(max).optional();
export const Cursor = z.string().min(1).max(500);
export const csv = <T extends z.ZodType<unknown, string>>(item: T) =>
	z
		.union([z.string(), z.array(z.string())])
		.transform((v) => (Array.isArray(v) ? v : v.split(',')))
		.pipe(z.array(item).min(1));
const numbers = (s: string) => s.split(',').map((n) => (n.trim() === '' ? NaN : Number(n)));
/** `w,s,e,n` → [w, s, e, n] */
export const BBoxQuery = z
	.string()
	.transform(numbers)
	.pipe(z.tuple([Lng, Lat, Lng, Lat]));

export const CursorQuery = z.object({ cursor: Cursor.optional(), limit: limit(50) });
export const IdParams = z.object({ id: Uuid });
export const CodeParams = z.object({ code: ShortCode });

export const page = <T extends z.ZodType>(item: T) =>
	z.object({ items: z.array(item), next_cursor: z.string().nullable() });
export const IdResponse = z.object({ id: Uuid }).openapi('IdResponse');

export const ApiErrorBody = z
	.object({
		error: z.object({
			code: ErrorCode,
			message: z.string(),
			details: z.record(z.string(), z.unknown()).optional(),
			issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
		}),
	})
	.openapi('ApiErrorBody', {
		description: 'Body of every error response (C1); clients map `code` to `errors.<code>`.',
		example: { error: { code: 'RATE_LIMITED', message: 'Too many reports', details: { retry_after_s: 1800 } } },
	});
