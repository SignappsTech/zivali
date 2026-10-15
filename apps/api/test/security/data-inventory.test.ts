// C1: prisma/data-inventory.json lists every model and R2 bucket with its privacy facts.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

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

	it('lists every column of every table in schema app, and no other', async () => {
		const rows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
			select table_name::text, column_name::text from information_schema.columns
			where table_schema = 'app' and table_name <> '_prisma_migrations'`;
		const actual: Record<string, string[]> = {};
		for (const { table_name, column_name } of rows) (actual[table_name] ??= []).push(column_name);
		const listed = Object.fromEntries(
			Object.entries(inventory.models).map(([name, entry]) => [
				name,
				[...(entry.personal_data as string[]), ...(entry.other_columns as string[])].sort(),
			])
		);
		for (const columns of Object.values(actual)) columns.sort();
		expect(listed).toEqual(actual);
	});

	it('describes category, personal data, basis, retention, export and delete for each entry', () => {
		for (const entry of Object.values(inventory.buckets)) {
			expect(entry).toEqual({
				category: expect.any(String),
				personal_data: expect.any(Array),
				basis: expect.any(String),
				retention: expect.any(String),
				export: expect.any(Boolean),
				delete: expect.any(String),
			});
		}
		for (const entry of Object.values(inventory.models)) {
			expect(entry).toEqual({
				category: expect.any(String),
				personal_data: expect.any(Array),
				other_columns: expect.any(Array),
				basis: expect.any(String),
				retention: expect.any(String),
				export: expect.any(Boolean),
				delete: expect.any(String),
			});
		}
	});
});
