import type { ObjectRef, StorageAdapter } from './index.ts';

// In-memory storage for tests. Presigned URLs are memory:// placeholders; tests call put() directly.
export function memoryStorage(): StorageAdapter {
	const objects = new Map<string, { body: Buffer; contentType: string }>();
	const id = (r: ObjectRef) => `${r.bucket}/${r.key}`;
	return {
		async presignPut(ref, { contentType, expiresInS = 300 }) {
			return {
				url: `memory://${id(ref)}`,
				method: 'PUT',
				headers: { 'Content-Type': contentType },
				expiresAt: new Date(Date.now() + expiresInS * 1000),
			};
		},
		async presignGet(ref, { expiresInS = 600 } = {}) {
			return `memory://${id(ref)}?expires=${Date.now() + expiresInS * 1000}`;
		},
		async put(ref, body, contentType) {
			objects.set(id(ref), { body, contentType });
		},
		async get(ref) {
			const o = objects.get(id(ref));
			if (!o) throw new Error(`storage: ${id(ref)} not found`);
			return o.body;
		},
		async copy(from, to) {
			const o = objects.get(id(from));
			if (!o) throw new Error(`storage: ${id(from)} not found`);
			objects.set(id(to), o);
		},
		async delete(ref) {
			objects.delete(id(ref));
		},
		async head(ref) {
			const o = objects.get(id(ref));
			return o ? { size: o.body.length, contentType: o.contentType } : null;
		},
	};
}
