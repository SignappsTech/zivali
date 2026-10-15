// Seeder 05-directory (C18): the 17 shelters and 212 municipality assignments from ./data (README there), each new row
// with version 1 and a directory_changes entry. Idempotent: existing rows are kept, so admin edits (TASK-89) survive.
// Runs in every environment (public reference data); needs 01-geo for the municipality ids.
import { readFileSync } from 'node:fs';

import { DirectoryDomain } from '../../domains/directory/index.ts';
import { systemCtx } from '../../lib/ctx.ts';

const read = (name: string) => readFileSync(new URL(`./data/${name}.csv`, import.meta.url), 'utf8');

export default async function seedDirectory(): Promise<void> {
	await DirectoryDomain.loadInitialDirectory(
		{ shelters: read('shelters'), municipalities: read('municipality_shelters') },
		systemCtx()
	);
}
