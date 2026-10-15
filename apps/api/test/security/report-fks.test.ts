// TASK-6.16: matches, conversations and alert_deliveries reference reports with ON DELETE CASCADE (as retention.purge
// expects), and ads.species is app."SPECIES"[].
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ReportsDomain } from '../../domains/reports/index.ts';
import { userCtx } from '../../lib/ctx.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import { prisma } from '../../prisma/prisma.ts';

const USER = randomUUID();
const ctx = userCtx({
	user_id: USER,
	role: 'USER',
	is_anonymous: false,
	aal: 'aal1',
	email_verified: true,
	locale: 'sl',
});
const newReport = async (type: 'lost' | 'found') =>
	(
		await ReportsDomain.insertReport(
			{ type, species: 'dog', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
			ctx
		)
	).id;

describe('report foreign keys', () => {
	beforeAll(async () => {
		if (!(await prisma.municipalities.count())) await seedGeo();
		await prisma.profiles.create({ data: { id: USER } });
	});
	afterAll(async () => {
		await prisma.profiles.deleteMany({ where: { id: USER } });
	});

	it('deletes matches, conversations and alert deliveries with their report', async () => {
		const lost = await newReport('lost');
		const found = await newReport('found');
		const match = await prisma.matches.create({
			data: {
				lost_report_id: lost,
				other_report_id: found,
				score: 0.9,
				strength: 'strong',
				chip_match: false,
				reasons: {},
			},
		});
		const conversation = await prisma.conversations.create({
			data: { lost_report_id: lost, other_report_id: found, about_report_id: found, match_id: match.id },
		});
		await prisma.alert_deliveries.create({ data: { report_id: found, user_id: USER, channel: 'push' } });

		await prisma.reports.delete({ where: { id: found } });

		expect(await prisma.matches.count({ where: { id: match.id } })).toBe(0);
		expect(await prisma.conversations.count({ where: { id: conversation.id } })).toBe(0);
		expect(await prisma.alert_deliveries.count({ where: { report_id: found } })).toBe(0);
		await prisma.reports.delete({ where: { id: lost } });
	});

	it('rejects a conversation or delivery for a missing report', async () => {
		await expect(prisma.conversations.create({ data: { about_report_id: randomUUID() } })).rejects.toThrow(
			/conversations_about_report_id_fkey|Foreign key/
		);
		await expect(
			prisma.alert_deliveries.create({ data: { report_id: randomUUID(), user_id: USER, channel: 'push' } })
		).rejects.toThrow(/alert_deliveries_report_id_fkey|Foreign key/);
	});

	it('types ads.species as the SPECIES enum array', async () => {
		const [row] = await prisma.$queryRaw<{ type: string }[]>`
			select format_type(atttypid, atttypmod) as type from pg_attribute
			where attrelid = 'app.ads'::regclass and attname = 'species'`;
		expect(row.type).toMatch(/SPECIES.*\[\]/);
	});
});
