// Object storage (ADR-014, C5). STORAGE_PROVIDER r2 | minio | memory; unset = memory outside production.
// Keys are always chosen by the server (C5), never from user file names.
import type { Config } from '../../lib/config.ts';
import { pickProvider } from '../select.ts';
import { memoryStorage } from './memory.ts';
import { s3Storage } from './s3.ts';

export type BucketName = 'private' | 'media' | 'backups';
export type ObjectRef = { bucket: BucketName; key: string };
export type ObjectHead = { size: number; contentType?: string };
export type PresignedPut = { url: string; method: 'PUT'; headers: Record<string, string>; expiresAt: Date };

export type StorageAdapter = {
	presignPut(ref: ObjectRef, opts: { contentType: string; expiresInS?: number }): Promise<PresignedPut>;
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
	const p = pickProvider<'r2' | 'minio'>('STORAGE_PROVIDER', wanted, wanted === 'r2' ? r2Creds : true, production);
	if (p === 'mock') return memoryStorage();
	const credentials = {
		accessKeyId: cfg.R2_ACCESS_KEY_ID ?? 'zivali',
		secretAccessKey: cfg.R2_SECRET_ACCESS_KEY ?? 'zivali-local-only',
	};
	return p === 'r2'
		? s3Storage({ endpoint: R2_EU_ENDPOINT(cfg.R2_ACCOUNT_ID!), region: 'auto', credentials, buckets })
		: s3Storage({ endpoint: cfg.S3_ENDPOINT, region: 'us-east-1', credentials, buckets });
}
