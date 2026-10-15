// Seeder 10-reports (C4, C5): 30 Slovenian fixture reports with pets, chip pairs and uploaded photos, idempotent.
import { describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import seedUsers from '../../prisma/seeders/00-users.seeder.ts';
import seedReports from '../../prisma/seeders/10-reports.seeder.ts';
import { prisma } from '../../prisma/prisma.ts';

const fixtureIds = (kind: number, count: number) =>
	Array.from({ length: count }, (_, i) => `00000000-0000-4000-8000-${kind}${String(i + 1).padStart(11, '0')}`);

describe('seeder 10-reports', () => {
	it('creates lost, found and sighted reports in Slovenia, pets, two chip pairs and published photos, idempotently', async () => {
		await seedUsers();
		await seedReports();
		await seedReports();

		const reports = await prisma.$queryRaw<{ type: string; chip_number: string | null; in_slovenia: boolean }[]>`
			select type::text, chip_number, in_slovenia from app.reports where id::text like '00000000-0000-4000-8000-1%'`;
		expect(reports.length).toBeGreaterThanOrEqual(30);
		expect(new Set(reports.map((r) => r.type))).toEqual(new Set(['lost', 'found', 'sighted']));
		expect(reports.every((r) => r.in_slovenia)).toBe(true);

		const typesByChip = new Map<string, Set<string>>();
		for (const { chip_number, type } of reports)
			if (chip_number) typesByChip.set(chip_number, (typesByChip.get(chip_number) ?? new Set()).add(type));
		const pairs = [...typesByChip.values()].filter((types) => types.has('lost') && types.has('found'));
		expect(pairs).toHaveLength(2);

		expect(await prisma.pets.count({ where: { id: { in: fixtureIds(2, 5) } } })).toBe(5);

		const photos = await prisma.photos.findMany({
			where: { report_id: { in: fixtureIds(1, 30) } },
			select: { id: true, report_id: true, status: true, public_display_url: true },
		});
		expect(photos.length).toBeGreaterThanOrEqual(20);
		for (const photo of photos) {
			const key = `r/${photo.report_id}/${photo.id}/display.jpg`;
			expect(photo).toMatchObject({
				status: 'published',
				public_display_url: expect.stringMatching(new RegExp(`/${key}$`)),
			});
			expect(await adapters.storage.head({ bucket: 'media', key })).toMatchObject({ size: expect.any(Number) });
		}
	}, 120_000);
});
