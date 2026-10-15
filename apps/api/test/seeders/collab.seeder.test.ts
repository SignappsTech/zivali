// Seeder 20-collab (C8-C10): alert subscriptions with coarsened centres; matches, a conversation with messages and
// notifications on top of the 10-reports fixtures (TASK-6.6). Idempotent.
import { beforeAll, describe, expect, it } from 'vitest';

import seedCollab, { FINDER, OWNER, OWNER2 } from '../../prisma/seeders/20-collab.seeder.ts';
import { prisma } from '../../prisma/prisma.ts';

const [{ hasReports }] = await prisma.$queryRaw<{ hasReports: boolean }[]>`
	select to_regclass('app.reports') is not null as "hasReports"`;

const counts = async () => ({
	alerts: await prisma.alert_subscriptions.count(),
	matches: await prisma.matches.count(),
	conversations: await prisma.conversations.count(),
	messages: await prisma.messages.count(),
	notifications: await prisma.notifications.count(),
});

describe('seeder 20-collab', () => {
	let first: Awaited<ReturnType<typeof counts>>;

	beforeAll(async () => {
		for (const id of [OWNER, OWNER2, FINDER]) {
			await prisma.profiles.upsert({ where: { id }, create: { id }, update: {} });
		}
		await seedCollab();
		first = await counts();
		await seedCollab();
	});

	it('is idempotent', async () => {
		expect(await counts()).toEqual(first);
	});

	it('creates alert subscriptions with a coarsened centre that reruns keep', async () => {
		const rows = await prisma.$queryRaw<{ user_id: string; radius_km: number; species: string[]; m: number }[]>`
			select user_id::text, radius_km, species,
				extensions.st_distance(center_point, extensions.st_makepoint(14.5051, 46.0511)::extensions.geography) as m
			from app.alert_subscriptions where user_id in (${OWNER}::uuid, ${OWNER2}::uuid, ${FINDER}::uuid)
			order by user_id`;
		expect(rows.map(({ user_id, radius_km, species }) => ({ user_id, radius_km, species }))).toEqual([
			{ user_id: OWNER, radius_km: 5, species: ['dog', 'cat'] },
			{ user_id: OWNER2, radius_km: 3, species: ['cat'] },
			{ user_id: FINDER, radius_km: 10, species: ['dog'] },
		]);
		const owner = rows.find((row) => row.user_id === OWNER)!;
		expect(owner.m).toBeGreaterThanOrEqual(19);
		expect(owner.m).toBeLessThanOrEqual(31);
	});

	it.runIf(hasReports)('creates a suggested and a confirmed match, the chat and the notifications', async () => {
		const matches = await prisma.matches.findMany({ select: { state: true } });
		expect(matches.map((match) => match.state).sort()).toEqual(expect.arrayContaining(['confirmed', 'suggested']));

		const conversation = await prisma.conversations.findFirstOrThrow({
			where: { match: { state: 'confirmed' } },
			include: {
				participants: { select: { user_id: true, role: true }, orderBy: { role: 'desc' } },
				messages: { select: { sender_id: true, kind: true }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }] },
			},
		});
		expect(conversation.status).toBe('active');
		expect(conversation.participants).toEqual([
			{ user_id: OWNER, role: 'owner' },
			{ user_id: FINDER, role: 'finder' },
		]);
		expect(conversation.messages.map((message) => message.sender_id)).toEqual([FINDER, OWNER, FINDER]);

		const notifications = await prisma.notifications.findMany({
			where: { user_id: { in: [OWNER, FINDER] } },
			select: { user_id: true, type: true },
		});
		expect(notifications).toEqual(
			expect.arrayContaining([
				{ user_id: OWNER, type: 'match_suggested' },
				{ user_id: OWNER, type: 'chat_message' },
				{ user_id: FINDER, type: 'match_confirmed' },
			])
		);
	});

	it.skipIf(hasReports)('seeds no matches or chat without the reports of TASK-6.6', async () => {
		expect(await prisma.matches.count()).toBe(0);
		expect(await prisma.conversations.count()).toBe(0);
	});
});
