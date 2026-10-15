// Object storage (ADR-014, C5). STORAGE_PROVIDER r2 | minio | memory | off; unset = memory outside production.
// Keys are always chosen by the server (C5), never from user file names.
import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { memoryStorage } from './memory.ts';
import { s3Storage } from './s3.ts';

export type BucketName = 'private' | 'media' | 'backups';
export type ObjectRef = { bucket: BucketName; key: string };
/** Presigned uploads are photos: 1 MB max (C5 MAX_PHOTO_BYTES). */
export const MAX_UPLOAD_BYTES = 1_048_576;
const SAFE_KEY = /^[\w][\w/.-]*$/;
/** Keys are server-chosen (C5); refuse anything that could escape a prefix. */
export function assertSafeKey(key: string): void {
	if (!SAFE_KEY.test(key) || key.includes('..')) throw new Error('storage: unsafe object key');
}
export function assertUploadLength(n: number): void {
	if (!Number.isInteger(n) || n < 1 || n > MAX_UPLOAD_BYTES) throw new Error('storage: invalid content length');
}
export type ObjectHead = { size: number; contentType?: string };
export type PresignedPut = { url: string; method: 'PUT'; headers: Record<string, string>; expiresAt: Date };

export type StorageAdapter = {
	presignPut(
		ref: ObjectRef,
		opts: { contentType: string; contentLength: number; expiresInS?: number }
	): Promise<PresignedPut>;
	presignGet(ref: ObjectRef, opts?: { expiresInS?: number }): Promise<string>;
	put(ref: ObjectRef, body: Buffer, contentType: string): Promise<void>;
	get(ref: ObjectRef): Promise<Buffer>;
	copy(from: ObjectRef, to: ObjectRef): Promise<void>;
	delete(ref: ObjectRef): Promise<void>;
	/** Resolves null when the object does not exist. */
	head(ref: ObjectRef): Promise<ObjectHead | null>;
};

export const R2_EU_ENDPOINT = (accountId: string) => `https://${accountId}.eu.r2.cloudflarestorage.com`;

export function createStorage(cfg: Config): StorageAdapter {
	const buckets: Record<BucketName, string> = {
		private: cfg.R2_BUCKET_PRIVATE,
		media: cfg.R2_BUCKET_MEDIA,
		backups: cfg.R2_BUCKET_BACKUPS,
	};
	const production = cfg.NODE_ENV === 'production';
	const wanted = cfg.STORAGE_PROVIDER === 'memory' ? 'mock' : cfg.STORAGE_PROVIDER;
	const r2Creds = !!(cfg.R2_ACCOUNT_ID && cfg.R2_ACCESS_KEY_ID && cfg.R2_SECRET_ACCESS_KEY);
	// minio ships built-in dev credentials, so it never counts as configured in production.
	const hasCredentials = wanted === 'r2' ? r2Creds : !production;
	const p = pickProvider<'r2' | 'minio'>('STORAGE_PROVIDER', wanted, hasCredentials, production);
	if (p === 'off') return offAdapter<StorageAdapter>('STORAGE_PROVIDER');
	if (p === 'mock') return memoryStorage();
	const credentials = {
		accessKeyId: cfg.R2_ACCESS_KEY_ID ?? 'zivali',
		secretAccessKey: cfg.R2_SECRET_ACCESS_KEY ?? 'zivali-local-only',
	};
	return p === 'r2'
		? s3Storage({ endpoint: R2_EU_ENDPOINT(cfg.R2_ACCOUNT_ID!), region: 'auto', credentials, buckets })
		: s3Storage({ endpoint: cfg.S3_ENDPOINT, region: 'us-east-1', credentials, buckets });
}
