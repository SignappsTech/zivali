// C1: prisma/data-inventory.json lists every model and R2 bucket with its privacy facts.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { Prisma } from '../../generated/client.ts';

type Entry = Record<string, unknown>;
const inventory = JSON.parse(readFileSync(new URL('../../prisma/data-inventory.json', import.meta.url), 'utf8')) as {
	models: Record<string, Entry>;
	buckets: Record<string, Entry>;
};

describe('data inventory', () => {
	it('lists every Prisma model, and no model that does not exist', () => {
		expect(Object.keys(inventory.models).sort()).toEqual(Object.values(Prisma.ModelName).sort());
	});

	it('lists the R2 buckets (C5)', () => {
		expect(Object.keys(inventory.buckets).sort()).toEqual(['zivali-backups', 'zivali-media', 'zivali-private']);
	});

	it('describes category, personal data, basis, retention, export and delete for each entry', () => {
		for (const entry of [...Object.values(inventory.models), ...Object.values(inventory.buckets)]) {
			expect(entry).toEqual({
				category: expect.any(String),
				personal_data: expect.any(Array),
				basis: expect.any(String),
				retention: expect.any(String),
				export: expect.any(Boolean),
				delete: expect.any(String),
			});
		}
	});
});
