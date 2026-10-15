// C1 conventions shared by every domain: snake_case keys, ISO 8601 UTC strings, money in integer cents.
import type { ErrorCode } from './enums.ts';

/** RFC 4122 / 9562 UUID string. */
export type Uuid = string;
/** ISO 8601 date-time string in UTC, e.g. `2026-10-15T07:42:10Z`. */
export type IsoDateTime = string;
/** ISO 8601 calendar date, e.g. `2026-10-15`. */
export type IsoDate = string;

/** WGS84 point (C6). */
export type LatLng = { lat: number; lng: number };
/** Location payload of a report or lookup (C6). */
export type Location = LatLng & { accuracy_m?: number };

/** Keyset-paginated list (C1): `?cursor=&limit=`. */
export type Page<T> = { items: T[]; next_cursor: string | null };
export type CursorQuery = { cursor?: string; limit?: number };
export type IdResponse = { id: Uuid };

export type ApiErrorIssue = { path: string; message: string };
/** Error body of every non-2xx response (C1). */
export type ApiErrorBody = {
	error: { code: ErrorCode; message: string; details?: Record<string, unknown>; issues?: ApiErrorIssue[] };
};

/** C12 consent record (cookie / secure-store `zz_consent`). */
export type ConsentState = { v: number; analytics: boolean; ts: IsoDateTime };
