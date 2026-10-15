// Keyed hashes for IPs and device ids (RATE_SALT) and AES-256-GCM for stored idempotent responses (IDEMPOTENCY_KEY).
// Raw IPs and device ids are never stored or logged (C1).
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

import { config } from './config.ts';

export function hashKey(value: string): string {
	return createHmac('sha256', config.RATE_SALT).update(value).digest('base64url');
}

const KEY = createHash('sha256').update(config.IDEMPOTENCY_KEY).digest();

/** JSON value → base64url(iv | tag | ciphertext). */
export function encryptJson(value: unknown): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', KEY, iv);
	const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

export function decryptJson(sealed: string): unknown {
	const raw = Buffer.from(sealed, 'base64url');
	const decipher = createDecipheriv('aes-256-gcm', KEY, raw.subarray(0, 12));
	decipher.setAuthTag(raw.subarray(12, 28));
	return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
}
