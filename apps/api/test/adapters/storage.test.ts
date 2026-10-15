import { request } from 'node:http';

import { describe, expect, it } from 'vitest';

import { createStorage, R2_EU_ENDPOINT, type StorageAdapter } from '../../adapters/storage/index.ts';
import { config } from '../../lib/config.ts';

const base = { ...config, NODE_ENV: 'test' as const };

async function minioUp(): Promise<boolean> {
	try {
		return (await fetch('http://127.0.0.1:9000/minio/health/live', { signal: AbortSignal.timeout(1000) })).ok;
	} catch {
		return false;
	}
}
const hasMinio = await minioUp();

function contract(name: string, make: () => StorageAdapter, enabled = true) {
	describe.skipIf(!enabled)(`storage: ${name}`, () => {
		it('puts, heads, copies, gets, deletes across buckets', async () => {
			const s = make();
			const id = crypto.randomUUID();
			const src = { bucket: 'private', key: `uploads/test/${id}.jpg` } as const;
			const dst = { bucket: 'media', key: `r/test/${id}.jpg` } as const;
			expect(await s.head(src)).toBeNull();
			await s.put(src, Buffer.from('hello'), 'image/jpeg');
			expect(await s.head(src)).toMatchObject({ size: 5, contentType: 'image/jpeg' });
			await s.copy(src, dst);
			expect((await s.get(dst)).toString()).toBe('hello');
			await s.delete(src);
			await s.delete(dst);
			expect(await s.head(src)).toBeNull();
			expect(await s.head(dst)).toBeNull();
		});

		it('refuses unsafe keys and bad upload lengths', async () => {
			const s = make();
			for (const key of ['../x', 'a/../b', '/abs', 'a b', '']) {
				await expect(s.head({ bucket: 'private', key })).rejects.toThrow(/unsafe/);
			}
			const ref = { bucket: 'private', key: 'uploads/ok.jpg' } as const;
			for (const contentLength of [0, 1.5, 1_048_577]) {
				await expect(s.presignPut(ref, { contentType: 'image/jpeg', contentLength })).rejects.toThrow(/length/);
			}
		});

		it('presigned PUT then GET round trip', async () => {
			const s = make();
			const ref = { bucket: 'private', key: `uploads/test/${crypto.randomUUID()}.jpg` } as const;
			const put = await s.presignPut(ref, { contentType: 'image/jpeg', contentLength: 3 });
			expect(put).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } });
			expect(put.expiresAt.getTime()).toBeGreaterThan(Date.now());
			if (put.url.startsWith('memory://')) {
				await s.put(ref, Buffer.from('abc'), 'image/jpeg');
			} else {
				const res = await fetch(put.url, { method: 'PUT', headers: put.headers, body: 'abc' });
				expect(res.ok).toBe(true);
			}
			const get = await s.presignGet(ref);
			if (!get.startsWith('memory://')) expect(await (await fetch(get)).text()).toBe('abc');
			await s.delete(ref);
		});
	});
}

contract('memory', () => createStorage({ ...base, STORAGE_PROVIDER: 'memory' }));
contract('minio', () => createStorage({ ...base, STORAGE_PROVIDER: 'minio' }), hasMinio);

describe.skipIf(!hasMinio)('storage: minio presigned PUT is pinned to type and length', () => {
	const s = createStorage({ ...base, STORAGE_PROVIDER: 'minio' });
	const sign = () =>
		s.presignPut(
			{ bucket: 'private', key: `uploads/test/${crypto.randomUUID()}.jpg` },
			{ contentType: 'image/jpeg', contentLength: 3 }
		);

	it('403 for another Content-Type', async () => {
		const put = await sign();
		const res = await fetch(put.url, { method: 'PUT', headers: { 'Content-Type': 'text/html' }, body: 'abc' });
		expect(res.status).toBe(403);
	});

	it('403 for another Content-Length', async () => {
		const put = await sign();
		const status = await new Promise<number>((resolve, reject) => {
			const req = request(put.url, { method: 'PUT', headers: { ...put.headers, 'Content-Length': 4 } }, (res) => {
				res.resume();
				resolve(res.statusCode ?? 0);
			});
			req.on('error', reject);
			req.end('abcd');
		});
		expect(status).toBe(403);
	});
});

describe('storage: r2', () => {
	const r2 = createStorage({
		...base,
		STORAGE_PROVIDER: 'r2',
		R2_ACCOUNT_ID: 'acct123',
		R2_ACCESS_KEY_ID: 'AKID',
		R2_SECRET_ACCESS_KEY: 'secret',
	});

	it('uses the EU jurisdiction endpoint for presigned URLs (ADR-014)', async () => {
		const endpoint = 'https://acct123.eu.r2.cloudflarestorage.com';
		expect(R2_EU_ENDPOINT('acct123')).toBe(endpoint);
		const put = await r2.presignPut(
			{ bucket: 'private', key: 'uploads/u/p.jpg' },
			{ contentType: 'image/jpeg', contentLength: 3 }
		);
		const get = await r2.presignGet({ bucket: 'media', key: 'r/a/b/display.webp' });
		expect(put.url.startsWith(`${endpoint}/zivali-private/uploads/u/p.jpg?`)).toBe(true);
		expect(get.startsWith(`${endpoint}/zivali-media/r/a/b/display.webp?`)).toBe(true);
		expect(`${put.url}${get}`).not.toMatch(/\/\/acct123\.r2\./);
		expect(`${put.url}${get}`).not.toMatch(/x-amz-checksum|x-amz-sdk-checksum/i);
		expect(new URL(put.url).searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
	});
});
