// Seeder 10-reports (C4, C5): 30 Slovenian fixture reports with pets, chip pairs, fixed short codes and photos
// processed and published through PhotosDomain, idempotent.
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
		const photoState = () =>
			prisma.photos.findMany({
				where: { report_id: { in: fixtureIds(1, 30) } },
				select: { id: true, status: true, updated_at: true },
				orderBy: { id: 'asc' },
			});
		const afterFirst = await photoState();
		await seedReports();
		// The rerun processes nothing again (TASK-114.36).
		expect(await photoState()).toEqual(afterFirst);

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

		// Fixed short codes (CH-409): Seed1111… and the web mock API's detail codes for lost 3 and found 13.
		const codes = await prisma.reports.findMany({
			where: { id: { in: fixtureIds(1, 30) } },
			select: { id: true, short_code: true, type: true },
		});
		const code = (n: number) => codes.find((r) => r.id === fixtureIds(1, 30)[n - 1]);
		expect(code(1)).toMatchObject({ short_code: 'Seed1111', type: 'lost' });
		expect(code(3)).toMatchObject({ short_code: 'Rex12345', type: 'lost' });
		expect(code(13)).toMatchObject({ short_code: 'Hk3vT9qP', type: 'found' });
		expect(code(30)?.short_code).toBe('Seed111W');

		// Photos (CH-193): display and thumb are PhotosDomain's variants, not the original JPEG twice.
		const photos = await prisma.photos.findMany({
			where: { report_id: { in: fixtureIds(1, 30) } },
			select: { id: true, report_id: true, status: true, public_display_url: true, public_thumb_url: true },
		});
		expect(photos.length).toBeGreaterThanOrEqual(20);
		for (const photo of photos) {
			const prefix = `r/${photo.report_id}/${photo.id}/`;
			expect(photo).toMatchObject({
				status: 'published',
				public_display_url: expect.stringMatching(new RegExp(`/${prefix}display\\.jpg$`)),
				public_thumb_url: expect.stringMatching(new RegExp(`/${prefix}thumb\\.webp$`)),
			});
			const display = await adapters.storage.head({ bucket: 'media', key: `${prefix}display.jpg` });
			const thumb = await adapters.storage.head({ bucket: 'media', key: `${prefix}thumb.webp` });
			expect(thumb!.size).toBeLessThan(display!.size);
		}
	}, 120_000);
});
