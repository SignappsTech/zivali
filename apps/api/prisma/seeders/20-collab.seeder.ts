// Matching, chat and notification fixtures (C8-C10), local only: nearby-alert subscriptions for the fixture users
// and, on top of the reports from 10-reports (TASK-6.6), a suggested and a confirmed match, the confirmed match's
// conversation with messages, and the notifications both sides would have received. Idempotent (natural keys and
// fixed message ids); outside APP_ENV=local or without the fixture profiles (00-users) it does nothing, without
// reports it seeds alerts only.
import { coarsenPoint } from '@zivali/validation/geo';

import { config } from '../../lib/config.ts';
import { logger } from '../../lib/logger.ts';
import { prisma } from '../prisma.ts';
import { fixtureUsers } from './00-users.seeder.ts';

const userId = (email: string) => fixtureUsers.find((user) => user.email === email)!.id;
export const OWNER = userId('owner@zivali.test');
export const OWNER2 = userId('owner2@zivali.test');
export const FINDER = userId('finder@zivali.test');

const messageId = (n: number) => `00000000-0000-4000-8000-c${String(n).padStart(11, '0')}`;

// Raw centres; coarsened once on first insert like every stored user location (C6 §Storage).
const ALERTS = [
	{ user_id: OWNER, centre: { lat: 46.0511, lng: 14.5051 }, radius_km: 5, species: ['dog', 'cat'], paused: false },
	{ user_id: FINDER, centre: { lat: 46.0569, lng: 14.5058 }, radius_km: 10, species: ['dog'], paused: false },
	{ user_id: OWNER2, centre: { lat: 46.5547, lng: 15.6459 }, radius_km: 3, species: ['cat'], paused: true },
];

const MESSAGES = [
	{ from: FINDER, body: 'Pozdravljeni, mislim, da je vaša žival pri meni.' },
	{ from: OWNER, body: 'Hvala! Ima kakšno posebno znamenje?' },
	{ from: FINDER, body: 'Je pri meni, lahko pridete po 17h.' },
];

type Report = { id: string; type: string; species: string; short_code: string; manager_id: string };

// Columns per C4; the reports table belongs to TASK-6.6, so it is read with SQL instead of the Prisma client.
async function fixtureReports(): Promise<Report[]> {
	const [{ ready }] = await prisma.$queryRaw<{ ready: boolean }[]>`
		select to_regclass('app.reports') is not null and to_regclass('app.report_managers') is not null as ready`;
	if (!ready) return [];
	return prisma.$queryRaw<Report[]>`
		select r.id::text, r.type::text, r.species::text, r.short_code, m.user_id::text as manager_id
		from app.reports r join app.report_managers m on m.report_id = r.id
		where m.user_id in (${OWNER}::uuid, ${FINDER}::uuid) and r.status::text in ('open', 'matched')
		order by r.created_at, r.id`;
}

// The owner's lost reports paired with the finder's found or sighted reports of the same species.
function pairs(reports: Report[]): { lost: Report; other: Report }[] {
	const others = reports.filter((report) => report.manager_id === FINDER && report.type !== 'lost');
	const result: { lost: Report; other: Report }[] = [];
	for (const lost of reports.filter((report) => report.manager_id === OWNER && report.type === 'lost')) {
		const index = others.findIndex((other) => other.species === lost.species);
		if (index >= 0) result.push({ lost, other: others.splice(index, 1)[0]! });
	}
	return result;
}

async function seedAlerts(): Promise<void> {
	for (const alert of ALERTS) {
		const centre = coarsenPoint(alert.centre);
		// on conflict do nothing: an unchanged subscription keeps its stored (already coarsened) centre.
		await prisma.$executeRaw`
			insert into app.alert_subscriptions (id, user_id, center_point, radius_km, species, paused, updated_at)
			values (gen_random_uuid(), ${alert.user_id}::uuid,
				extensions.st_setsrid(extensions.st_makepoint(${centre.lng}, ${centre.lat}), 4326)::extensions.geography,
				${alert.radius_km}, ${alert.species}::text[], ${alert.paused}, now())
			on conflict (user_id) do nothing`;
	}
}

async function seedMatches(suggested: { lost: Report; other: Report }, confirmed: { lost: Report; other: Report }) {
	type MatchData = { score: number; strength: string; state: 'suggested' | 'confirmed' };
	const upsertMatch = (pair: { lost: Report; other: Report }, data: MatchData) =>
		prisma.matches.upsert({
			where: { lost_report_id_other_report_id: { lost_report_id: pair.lost.id, other_report_id: pair.other.id } },
			create: {
				lost_report_id: pair.lost.id,
				other_report_id: pair.other.id,
				...data,
				chip_match: false,
				reasons: [
					{ code: 'distance', band: '1to3' },
					{ code: 'time', hours_band: 'lt24' },
					{ code: 'colour', overlap: 1 },
				],
				notified_at: new Date(),
			},
			update: {},
		});
	const suggestion = await upsertMatch(suggested, { score: 0.72, strength: 'good', state: 'suggested' });
	const match = await upsertMatch(confirmed, { score: 0.86, strength: 'strong', state: 'confirmed' });
	await prisma.match_feedback.upsert({
		where: { match_id_user_id: { match_id: match.id, user_id: OWNER } },
		create: { match_id: match.id, user_id: OWNER, verdict: 'confirm' },
		update: {},
	});

	const start = Date.now() - MESSAGES.length * 60_000;
	const conversation = await prisma.conversations.upsert({
		where: { match_id: match.id },
		create: {
			match_id: match.id,
			lost_report_id: confirmed.lost.id,
			other_report_id: confirmed.other.id,
			about_report_id: confirmed.lost.id,
			participants: {
				create: [
					// The owner has read up to their own reply; the finder's last message is unread.
					{ user_id: OWNER, role: 'owner', last_read_at: new Date(start + 60_000) },
					{ user_id: FINDER, role: 'finder' },
				],
			},
		},
		update: {},
	});
	for (const [i, message] of MESSAGES.entries()) {
		await prisma.messages.upsert({
			where: { id: messageId(i + 1) },
			create: {
				id: messageId(i + 1),
				conversation_id: conversation.id,
				sender_id: message.from,
				kind: 'text',
				body: message.body,
				created_at: new Date(start + i * 60_000),
			},
			update: {},
		});
	}

	const notifications = [
		{
			user_id: OWNER,
			type: 'match_suggested',
			dedupe_key: `match_suggested:${suggestion.id}`,
			payload: {
				match_id: suggestion.id,
				lost_code: suggested.lost.short_code,
				strength: 'good',
				other_type: suggested.other.type,
				has_name: 'no',
				species: suggested.lost.species,
			},
		},
		{
			user_id: FINDER,
			type: 'match_confirmed',
			dedupe_key: `match_confirmed:${match.id}`,
			payload: {
				conversation_id: conversation.id,
				report_code: confirmed.other.short_code,
				species: confirmed.other.species,
				report_type: confirmed.other.type,
			},
		},
		{
			user_id: OWNER,
			type: 'chat_message',
			dedupe_key: `chat_message:${conversation.id}`,
			payload: { conversation_id: conversation.id, preview_alias: 'finder', unread_count: 1 },
		},
	];
	for (const { user_id, dedupe_key, ...data } of notifications) {
		await prisma.notifications.upsert({
			where: { user_id_dedupe_key: { user_id, dedupe_key } },
			create: { user_id, dedupe_key, ...data },
			update: {},
		});
	}
}

export default async function seedCollab(): Promise<void> {
	if (config.APP_ENV !== 'local') {
		logger.warn('collab fixtures skipped: local only');
		return;
	}
	const users = [OWNER, OWNER2, FINDER];
	if ((await prisma.profiles.count({ where: { id: { in: users } } })) < users.length) {
		logger.warn('collab fixtures skipped: needs the fixture users (00-users)');
		return;
	}
	await seedAlerts();

	const [suggested, confirmed] = pairs(await fixtureReports());
	if (!suggested || !confirmed) {
		logger.warn('matches, chat and notifications skipped: needs two lost/found fixture pairs (10-reports)');
		return;
	}
	await seedMatches(suggested, confirmed);
	logger.info('collab fixtures ready');
}
