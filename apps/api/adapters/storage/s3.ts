// S3 API storage shared by R2 (EU jurisdiction endpoint) and MinIO. Path-style so the bucket sits in the URL path.
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { BucketName, StorageAdapter } from './index.ts';

export type S3StorageOptions = {
	endpoint: string;
	region: string;
	credentials: { accessKeyId: string; secretAccessKey: string };
	buckets: Record<BucketName, string>;
};

export function s3Storage({ endpoint, region, credentials, buckets }: S3StorageOptions): StorageAdapter {
	const client = new S3Client({ endpoint, region, credentials, forcePathStyle: true });
	const loc = (r: { bucket: BucketName; key: string }) => ({ Bucket: buckets[r.bucket], Key: r.key });
	return {
		async presignPut(ref, { contentType, expiresInS = 300 }) {
			const url = await getSignedUrl(client, new PutObjectCommand({ ...loc(ref), ContentType: contentType }), {
				expiresIn: expiresInS,
			});
			return {
				url,
				method: 'PUT',
				headers: { 'Content-Type': contentType },
				expiresAt: new Date(Date.now() + expiresInS * 1000),
			};
		},
		presignGet: (ref, { expiresInS = 600 } = {}) =>
			getSignedUrl(client, new GetObjectCommand(loc(ref)), { expiresIn: expiresInS }),
		async put(ref, body, contentType) {
			await client.send(new PutObjectCommand({ ...loc(ref), Body: body, ContentType: contentType }));
		},
		async get(ref) {
			const res = await client.send(new GetObjectCommand(loc(ref)));
			return Buffer.from(await res.Body!.transformToByteArray());
		},
		async copy(from, to) {
			await client.send(
				new CopyObjectCommand({ ...loc(to), CopySource: encodeURI(`${buckets[from.bucket]}/${from.key}`) })
			);
		},
		async delete(ref) {
			await client.send(new DeleteObjectCommand(loc(ref)));
		},
		async head(ref) {
			try {
				const res = await client.send(new HeadObjectCommand(loc(ref)));
				return { size: res.ContentLength ?? 0, contentType: res.ContentType };
			} catch (err) {
				if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404) return null;
				throw err;
			}
		},
	};
}
