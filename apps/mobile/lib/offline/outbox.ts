import { randomUUID } from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import { addNetworkStateListener } from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { type ApiClient, ApiError } from '@zivali/api/client';
import { type PreparedPhoto, type PutFile, uploadPhoto } from '@zivali/api/photos';
import type { CreateReportInput, CreateReportResponse } from '@zivali/types';
import { getDb } from '@/lib/db';
import { outboxDir } from '@/lib/db/files';
import { isOnline } from '@/lib/net';

// Outbox (C17, C7 §Queued submissions, FR-042): found and sighted reports are stored with their photos and capture
// time first and sent once, now or when the connection is back. All state is in SQLite, so it survives app kills.

/** Secure-store key (default options) of the manage token for a report sent from this device. */
export const manageTokenKey = (reportId: string): string => `manage_token.${reportId}`;

/** Secure-store key of the JSON array of report ids that have a manage token: the wipe needs it for tokens without an outbox row (claimed links). */
export const MANAGE_TOKENS_INDEX = 'manage_tokens';

export async function listManageTokenIds(): Promise<string[]> {
	try {
		const ids: unknown = JSON.parse((await SecureStore.getItemAsync(MANAGE_TOKENS_INDEX)) ?? '[]');
		return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return []; // a corrupt index names nothing
	}
}

/** The one way a manage token is saved (C7, C17): the token, then its id in the index. */
export async function saveManageToken(reportId: string, token: string): Promise<void> {
	await SecureStore.setItemAsync(manageTokenKey(reportId), token);
	const ids = await listManageTokenIds();
	if (!ids.includes(reportId))
		await SecureStore.setItemAsync(MANAGE_TOKENS_INDEX, JSON.stringify([...ids, reportId]));
}

/** Items not sent yet (queued, sending, failed, needs action); asked about before sign-out. */
export async function pendingCount(): Promise<number> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ n: number }>(`select count(*) as n from outbox where status != 'sent'`);
	return row?.n ?? 0;
}

export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'needs_action';
/** The report as the form filled it; `event_at` is the capture time and `photo_ids` come at send time. */
export type OutboxPayload = Omit<CreateReportInput, 'type' | 'photo_ids' | 'event_at'> & { type: 'found' | 'sighted' };
/** A prepared photo on disk (the PhotoPicker's photos qualify as they are). */
export type OutboxPhoto = PreparedPhoto & { file: { uri: string } };
type Row = {
	id: string;
	kind: 'found' | 'sighted';
	payload: string;
	captured_at: string;
	status: OutboxStatus;
	attempts: number;
	/** ms; a queued item is not sent before it */
	next_attempt_at: number | null;
	/** C1 code (`NETWORK`, `RATE_LIMITED`, `VALIDATION`, …) or `CAPTCHA_REQUIRED`; for the queue UI's reason */
	last_error_code: string | null;
	last_error_message: string | null;
	result: string | null;
	created_at: number;
	updated_at: number;
};
export type OutboxItem = Omit<Row, 'payload' | 'result'> & {
	payload: OutboxPayload;
	result: { report_id: string; short_code: string } | null;
};
type PhotoRow = { position: number; path: string; sha256: string; width: number; height: number; bytes: number };
/** How send() reaches the API: the app client, the anonymous session (Turnstile sheet) and the file PUT. */
export type OutboxTransport = { api: ApiClient; ensureSession: () => Promise<unknown>; put: PutFile };

/** Retry delays for network and server faults, in minutes; the last one repeats. */
const BACKOFF_MIN = [1, 5, 15, 60];
const RETRY = new Set(['NETWORK', 'INTERNAL', 'SERVICE_UNAVAILABLE']);

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
const folder = (id: string) => new Directory(outboxDir, id);

/**
 * Stores the report (photos copied to documentDirectory/outbox/<id>/, row `queued`) and returns at once; the send
 * starts right away. `capturedAt` (ISO) becomes `event_at`, so a late send keeps the time of the sighting.
 */
export async function submitReport(
	{ photos, ...payload }: OutboxPayload & { photos: OutboxPhoto[] },
	{ capturedAt }: { capturedAt: string }
): Promise<{ outboxId: string }> {
	// The uuid is also the Idempotency-Key of every attempt (C1).
	const id = randomUUID();
	const dir = folder(id);
	try {
		dir.create({ intermediates: true, idempotent: true });
		const paths = await Promise.all(
			photos.map(async (photo, position) => {
				const copy = new File(dir, `${position}.jpg`);
				await new File(photo.file.uri).copy(copy);
				return copy.uri;
			})
		);
		const db = await getDb();
		const now = Date.now();
		await db.withTransactionAsync(async () => {
			await db.runAsync(
				`insert into outbox (id, kind, payload, captured_at, status, created_at, updated_at)
				values (?, ?, ?, ?, 'queued', ?, ?)`,
				id,
				payload.type,
				JSON.stringify(payload),
				capturedAt,
				now,
				now
			);
			for (const [position, { sha256, width, height, bytes }] of photos.entries()) {
				await db.runAsync(
					`insert into outbox_photos (outbox_id, position, path, sha256, width, height, bytes)
					values (?, ?, ?, ?, ?, ?, ?)`,
					id,
					position,
					paths[position],
					sha256,
					width,
					height,
					bytes
				);
			}
		});
	} catch (error) {
		if (dir.exists) dir.delete();
		throw error;
	}
	changed();
	void send();
	return { outboxId: id };
}

/** What a failed attempt leaves on the row (C17): wait and retry, wait for the person, or stop with the reason. */
function outcome(error: unknown, attempts: number, now: number) {
	const code = error instanceof ApiError ? error.code : 'INTERNAL';
	const message = error instanceof Error ? error.message : String(error);
	const backoff = now + BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length) - 1] * 60_000;
	// The Turnstile sheet was cancelled, timed out or failed: the person retries from the queue.
	if (code === 'CAPTCHA_FAILED') return { status: 'needs_action', code: 'CAPTCHA_REQUIRED', message, next: null };
	if (code === 'RATE_LIMITED') {
		const seconds = Number((error as ApiError).details?.retry_after_s);
		return { status: 'queued', code, message, next: seconds > 0 ? now + seconds * 1000 : backoff };
	}
	if (error instanceof ApiError && RETRY.has(code)) return { status: 'queued', code, message, next: backoff };
	// VALIDATION, FORBIDDEN and the rest: the item stays until the person retries or deletes it.
	return { status: 'failed', code, message, next: null };
}

async function deliver(transport: OutboxTransport, item: Row): Promise<void> {
	const db = await getDb();
	const { changes } = await db.runAsync(
		`update outbox set status = 'sending', updated_at = ? where id = ? and status = 'queued'`,
		Date.now(),
		item.id
	);
	// Deleted by the person while earlier items were sending.
	if (changes === 0) return;
	changed();
	try {
		await transport.ensureSession();
		const photos = await db.getAllAsync<PhotoRow>(
			'select position, path, sha256, width, height, bytes from outbox_photos where outbox_id = ? order by position',
			item.id
		);
		const photoIds: string[] = [];
		for (const { position, path, ...input } of photos) {
			// Every attempt registers every photo: one already uploaded answers `existing` without a new PUT, and that
			// also restarts its 24 h purge clock (C5), so an item that waited long never sends a purged photo id.
			const { photoId } = await uploadPhoto(
				transport.api,
				{ ...input, file: { uri: path } },
				{ put: transport.put }
			);
			await db.runAsync(
				'update outbox_photos set photo_id = ?, uploaded = 1 where outbox_id = ? and position = ?',
				photoId,
				item.id,
				position
			);
			photoIds.push(photoId);
		}
		// The same key and body replay the first response (C1), so a lost response gives the same report and token.
		const created = await transport.api.request<CreateReportResponse>('POST', '/v1/reports', {
			body: { ...JSON.parse(item.payload), photo_ids: photoIds, event_at: item.captured_at },
			idempotent: item.id,
		});
		// Keychain first: if the app dies before the row says `sent`, the retry replays the same token.
		if (created.manage_token) await saveManageToken(created.id, created.manage_token);
		await db.withTransactionAsync(async () => {
			await db.runAsync(
				`update outbox set status = 'sent', result = ?, next_attempt_at = null, last_error_code = null,
				last_error_message = null, updated_at = ? where id = ?`,
				JSON.stringify({ report_id: created.id, short_code: created.short_code }),
				Date.now(),
				item.id
			);
			await db.runAsync('delete from outbox_photos where outbox_id = ?', item.id);
		});
		if (folder(item.id).exists) folder(item.id).delete();
	} catch (error) {
		const now = Date.now();
		const { status, code, message, next } = outcome(error, item.attempts + 1, now);
		await db.runAsync(
			`update outbox set status = ?, attempts = attempts + 1, next_attempt_at = ?, last_error_code = ?,
			last_error_message = ?, updated_at = ? where id = ?`,
			status,
			next,
			code,
			message,
			now,
			item.id
		);
	}
	changed();
}

let transport: OutboxTransport | undefined;
let running: Promise<void> | undefined;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Foreground only (C17): the app being in the background waits for the next resume. */
const kick = () => {
	if (AppState.currentState !== 'background') void send();
};

async function run(sender: OutboxTransport): Promise<void> {
	const db = await getDb();
	// Only one run at a time, so a row still `sending` was cut off by an app kill: it goes again with the same key.
	await db.runAsync(`update outbox set status = 'queued' where status = 'sending'`);
	const due = await db.getAllAsync<Row>(
		`select * from outbox where status = 'queued' and coalesce(next_attempt_at, 0) <= ? order by created_at`,
		Date.now()
	);
	for (const item of due) await deliver(sender, item);
	const next = await db.getFirstAsync<{ at: number | null }>(
		`select min(next_attempt_at) as at from outbox where status = 'queued'`
	);
	clearTimeout(timer);
	if (next?.at != null && transport) timer = setTimeout(kick, Math.max(0, next.at - Date.now()));
}

/**
 * Sends every due queued item, one at a time. Single-flight: a call during a run makes it look again once done.
 * Never rejects; the outcome is on the rows. Does nothing before startOutbox().
 */
export function send(): Promise<void> {
	if (running) {
		again = true;
		return running;
	}
	running = (async () => {
		do {
			again = false;
			if (transport) await run(transport);
		} while (again);
	})()
		.catch(() => {}) // the database itself failed; the next trigger tries again
		.finally(() => {
			running = undefined;
		});
	return running;
}

/**
 * C17 triggers; call once at start-up (it counts as the launch): sends on launch, on resume, when the connection is
 * back (a network backoff is skipped then; a rate limit still waits) and when a backoff ends. Returns the stop.
 */
export function startOutbox(sender: OutboxTransport): () => void {
	transport = sender;
	const app = AppState.addEventListener('change', (state) => state === 'active' && kick());
	let wasOnline = false;
	const network = addNetworkStateListener((state) => {
		const online = isOnline(state);
		if (online && !wasOnline)
			void getDb()
				.then((db) =>
					db.runAsync(
						`update outbox set next_attempt_at = null where status = 'queued' and last_error_code = 'NETWORK'`
					)
				)
				.catch(() => {})
				.then(kick);
		wasOnline = online;
	});
	kick();
	return () => {
		app.remove();
		network.remove();
		clearTimeout(timer);
		transport = undefined;
	};
}

async function listItems(): Promise<OutboxItem[]> {
	const db = await getDb();
	const rows = await db.getAllAsync<Row>('select * from outbox order by created_at desc');
	return rows.map(({ payload, result, ...row }) => ({
		...row,
		payload: JSON.parse(payload) as OutboxPayload,
		result: result ? JSON.parse(result) : null,
	}));
}

/** A queued, failed or needs-action item is sent now, with a fresh backoff. */
async function retry(id: string): Promise<void> {
	const db = await getDb();
	await db.runAsync(
		`update outbox set status = 'queued', attempts = 0, next_attempt_at = null, updated_at = ?
		where id = ? and status in ('queued', 'failed', 'needs_action')`,
		Date.now(),
		id
	);
	changed();
	await send();
}

/** The person deletes an item and its photos; one being sent right now stays. */
async function remove(id: string): Promise<void> {
	const db = await getDb();
	const { changes } = await db.runAsync(`delete from outbox where id = ? and status != 'sending'`, id);
	if (changes > 0 && folder(id).exists) folder(id).delete();
	changed();
}

/** The outbox, newest first, kept current as items change (queue UI, success screen). */
export function useOutbox(): {
	items: OutboxItem[];
	retry: (id: string) => Promise<void>;
	remove: (id: string) => Promise<void>;
} {
	const [items, setItems] = useState<OutboxItem[]>([]);
	useEffect(() => {
		let latest = 0;
		const load = () => {
			const call = ++latest;
			listItems()
				.then((next) => call === latest && setItems(next))
				.catch(() => {});
		};
		listeners.add(load);
		load();
		return () => {
			latest = -1;
			listeners.delete(load);
		};
	}, []);
	return { items, retry, remove };
}
