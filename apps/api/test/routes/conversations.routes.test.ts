// /v1/conversations (C9) over real auth.users rows: the permission matrix and every refusal, aliases, cursors,
// broadcasts in the send transaction (realtime.messages), chat_message notifications, read-only on report close
// and the retention purge.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Message } from '@zivali/validation';

import { app } from '../../app.ts';
import { chatMessageVars } from '../../domains/chat/chat.notify.ts';
import { ChatDomain } from '../../domains/chat/index.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { handlers, type JobCtx } from '../../jobs/index.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import configStore from '../../lib/config-store.ts';
import { jobs, startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

type User = { id: string; auth: string; actor: Actor };
type Kind = { anonymous?: boolean; verified?: boolean; role?: 'MODERATOR' | 'ADMIN'; aal?: 'aal1' | 'aal2' };

const userIds: string[] = [];
const reportIds: string[] = [];
const matchIds: string[] = [];

async function user(kind: Kind = {}): Promise<User> {
	const { anonymous = false, verified = true, role = 'USER', aal = 'aal1' } = kind;
	const id = await createAuthUser({ email_verified: verified, is_anonymous: anonymous });
	userIds.push(id);
	await prisma.profiles.create({ data: { id, is_anonymous: anonymous, role } });
	const token = await signTestToken({ sub: id, is_anonymous: anonymous, aal });
	const actor: Actor = { user_id: id, role, is_anonymous: anonymous, aal, email_verified: verified, locale: 'sl' };
	return { id, auth: `Bearer ${token}`, actor };
}

async function report(owner: User, type: 'lost' | 'found' | 'sighted' = 'lost') {
	const created = await ReportsDomain.insertReport(
		{ type, species: 'dog', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
		userCtx(owner.actor)
	);
	reportIds.push(created.id);
	return created;
}

const open = (who: User, body: object) =>
	request(app).post('/v1/conversations').set('Authorization', who.auth).send(body);
const send = (who: User, id: string, body: object) =>
	request(app).post(`/v1/conversations/${id}/messages`).set('Authorization', who.auth).send(body);
const messages = (who: User, id: string, query = '') =>
	request(app).get(`/v1/conversations/${id}/messages${query}`).set('Authorization', who.auth);
const inbox = (who: User, query = '') => request(app).get(`/v1/conversations${query}`).set('Authorization', who.auth);

const hasRealtime = async () =>
	(await prisma.$queryRaw<{ ok: boolean }[]>`select to_regclass('realtime.messages') is not null as ok`)[0]!.ok;
const broadcasts = (topic: string) =>
	prisma.$queryRaw<{ event: string; payload: Record<string, unknown> }[]>`
		select event, payload from realtime.messages where topic = ${topic} order by inserted_at, id`;
const notifications = (conversation_id: string) =>
	prisma.$queryRaw<{ data: { user_id: string; type: string; payload: object; dedupe_key: string } }[]>`
		select data from pgboss.job
		where name = 'notify.send' and data->>'type' = 'chat_message' and data->'payload'->>'thread_id' = ${conversation_id}
		order by created_on`;

let owner: User, stranger: User, anonFinder: User, anonOther: User, unverified: User, mod: User, admin: User;
let lost: { id: string; short_code: string };
let found: { id: string; short_code: string };

beforeAll(async () => {
	await startJobs();
	// Anonymous callers are counted per IP (all 127.0.0.1 here): start every run with fresh chat windows.
	await prisma.rate_limits.deleteMany({ where: { name: { in: ['contact', 'chat.message', 'chat.message_day'] } } });
	[owner, stranger, anonFinder, anonOther, unverified, mod, admin] = await Promise.all([
		user(),
		user(),
		user({ anonymous: true }),
		user({ anonymous: true }),
		user({ verified: false }),
		user({ role: 'MODERATOR', aal: 'aal2' }),
		user({ role: 'ADMIN', aal: 'aal2' }),
	]);
	lost = await report(owner, 'lost');
	found = await report(anonFinder, 'found');
}, 60_000);

afterAll(async () => {
	await prisma.conversations.deleteMany({ where: { about_report_id: { in: reportIds } } });
	await prisma.matches.deleteMany({ where: { id: { in: matchIds } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'user_id' = any(${userIds})`;
	await deleteAuthUsers(userIds);
});

describe('POST /v1/conversations', () => {
	it('needs a session, a confirmed email, and from anonymous users a report they manage', async () => {
		expect((await request(app).post('/v1/conversations').send({ about_report_code: lost.short_code })).status).toBe(
			401
		);
		const res = await open(unverified, { about_report_code: lost.short_code });
		expect([res.status, res.body.error.code]).toEqual([403, 'UNVERIFIED_EMAIL']);
		const anon = await open(anonOther, { about_report_code: lost.short_code });
		expect([anon.status, anon.body.error.code]).toEqual([403, 'FORBIDDEN']);
	});

	it('validates the body and answers 404 for an unknown report', async () => {
		expect((await open(stranger, { about_report_code: 'nope' })).status).toBe(400);
		const res = await open(stranger, { about_report_code: 'zzzzzzzz' });
		expect([res.status, res.body.error.code]).toEqual([404, 'NOT_FOUND']);
	});

	it('opens one conversation per report and caller: caller as contact, the managers as owner', async () => {
		const first = await open(stranger, { about_report_code: lost.short_code });
		expect(first.status).toBe(200);
		expect((await open(stranger, { about_report_code: lost.short_code })).body).toEqual(first.body);
		const participants = await prisma.conversation_participants.findMany({
			where: { conversation_id: first.body.id },
			select: { user_id: true, role: true },
			orderBy: { role: 'asc' },
		});
		expect(participants).toEqual([
			{ user_id: stranger.id, role: 'contact' },
			{ user_id: owner.id, role: 'owner' },
		]);
	});

	it('lets an anonymous manager contact another report, and staff open conversations like any user', async () => {
		expect((await open(anonFinder, { about_report_code: lost.short_code })).status).toBe(200);
		expect((await open(mod, { about_report_code: found.short_code })).status).toBe(200);
		expect((await open(admin, { about_report_code: found.short_code })).status).toBe(200);
	});

	it('refuses a conversation with yourself and about a closed or hidden report', async () => {
		const self = await open(owner, { about_report_code: lost.short_code });
		expect([self.status, self.body.error.code]).toEqual([403, 'FORBIDDEN']);
		const closed = await report(owner, 'lost');
		await prisma.reports.update({ where: { id: closed.id }, data: { status: 'closed', closed_at: new Date() } });
		const gone = await open(stranger, { about_report_code: closed.short_code });
		expect([gone.status, gone.body.error.code]).toEqual([410, 'GONE']);
		const hidden = await report(owner, 'lost');
		await prisma.reports.update({ where: { id: hidden.id }, data: { moderation_state: 'hidden' } });
		expect((await open(stranger, { about_report_code: hidden.short_code })).status).toBe(404);
	});

	it('opens the match conversation for both sides of a confirmed match only', async () => {
		const match = await prisma.matches.create({
			data: {
				lost_report_id: lost.id,
				other_report_id: found.id,
				score: 0.9,
				strength: 'strong',
				chip_match: false,
				reasons: {},
			},
		});
		matchIds.push(match.id);
		const pending = await open(owner, { about_report_code: lost.short_code, match_id: match.id });
		expect([pending.status, pending.body.error.code]).toEqual([403, 'FORBIDDEN']);
		await prisma.matches.update({ where: { id: match.id }, data: { state: 'confirmed' } });
		const outsider = await open(stranger, { about_report_code: lost.short_code, match_id: match.id });
		expect([outsider.status, outsider.body.error.code]).toEqual([403, 'FORBIDDEN']);
		const wrongReport = await open(owner, { about_report_code: found.short_code, match_id: randomUUID() });
		expect(wrongReport.status).toBe(404);

		const byOwner = await open(owner, { about_report_code: lost.short_code, match_id: match.id });
		expect(byOwner.status).toBe(200);
		expect((await open(anonFinder, { about_report_code: found.short_code, match_id: match.id })).body).toEqual(
			byOwner.body
		);
		const conversation = await prisma.conversations.findUniqueOrThrow({
			where: { id: byOwner.body.id },
			include: { participants: { select: { user_id: true, role: true }, orderBy: { role: 'asc' } } },
		});
		expect(conversation).toMatchObject({
			about_report_id: lost.id,
			lost_report_id: lost.id,
			other_report_id: found.id,
			match_id: match.id,
			participants: [
				{ user_id: anonFinder.id, role: 'finder' },
				{ user_id: owner.id, role: 'owner' },
			],
		});
	});

	it('rate-limits contact to 10 per day', async () => {
		const caller = await user();
		for (let i = 0; i < 10; i++)
			expect((await open(caller, { about_report_code: lost.short_code })).status).toBe(200);
		const res = await open(caller, { about_report_code: lost.short_code });
		expect([res.status, res.body.error.code]).toEqual([429, 'RATE_LIMITED']);
	});
});

describe('messages', () => {
	let id: string;
	let contact: User;

	beforeAll(async () => {
		contact = await user();
		id = (await open(contact, { about_report_code: lost.short_code })).body.id;
	});

	it('refuses non-participants, staff included, on every conversation endpoint', async () => {
		for (const who of [stranger, mod, admin, anonOther]) {
			for (const res of [
				await messages(who, id),
				await send(who, id, { body: 'Živjo' }),
				await request(app).post(`/v1/conversations/${id}/read`).set('Authorization', who.auth),
				await request(app)
					.post(`/v1/conversations/${id}/block`)
					.set('Authorization', who.auth)
					.send({ participant_id: owner.id }),
			])
				expect([res.status, res.body.error.code]).toEqual([403, 'FORBIDDEN']);
		}
		expect((await messages(stranger, randomUUID())).status).toBe(403);
		expect((await request(app).get(`/v1/conversations/${id}/messages`)).status).toBe(401);
	});

	it('stores a text message, flags links and returns the Message DTO with role aliases', async () => {
		const res = await send(contact, id, { body: '  Je pri meni, lahko pridete po 17h.  ' });
		expect(res.status).toBe(201);
		expect(Message.parse(res.body)).toEqual(res.body);
		expect(res.body).toMatchObject({
			conversation_id: id,
			sender_alias_key: 'contact',
			kind: 'text',
			body: 'Je pri meni, lahko pridete po 17h.',
			has_link: false,
		});
		expect(res.body).not.toHaveProperty('sender_id');
		for (const body of ['Plačajte na https://example.org/x', 'glej www.primer.si', 'revolut.me/ana'])
			expect((await send(contact, id, { body })).body.has_link).toBe(true);
		const reply = await send(owner, id, { body: 'Hvala!' });
		expect(reply.body.sender_alias_key).toBe('owner');
	});

	it('validates the body: empty, too long, location without kind', async () => {
		expect((await send(contact, id, { body: '   ' })).status).toBe(400);
		expect((await send(contact, id, { body: 'x'.repeat(2001) })).status).toBe(400);
		expect((await send(contact, id, { body: 'tu', location: { lat: 46, lng: 14.5 } })).status).toBe(400);
	});

	it('allows location messages only from a manager of the report, coarsened 20-30 m', async () => {
		const point = { lat: 46.0569, lng: 14.5058 };
		const refused = await send(contact, id, { body: 'Tukaj', kind: 'location', location: point });
		expect([refused.status, refused.body.error.code]).toEqual([403, 'FORBIDDEN']);
		const res = await send(owner, id, { body: 'Tukaj', kind: 'location', location: point });
		expect(res.status).toBe(201);
		const dLat = (res.body.location.lat - point.lat) * 111_320;
		const dLng = (res.body.location.lng - point.lng) * 111_320 * Math.cos((point.lat * Math.PI) / 180);
		expect(Math.hypot(dLat, dLng)).toBeGreaterThan(19.5);
		expect(Math.hypot(dLat, dLng)).toBeLessThan(30.5);
	});

	it('lists oldest-first with exclusive after and before cursors', async () => {
		const all = (await messages(contact, id, '?limit=50')).body;
		expect(all.next_cursor).toBeNull();
		const times = all.items.map((m: { created_at: string }) => m.created_at);
		expect([...times].sort()).toEqual(times);
		const n = all.items.length;
		expect(n).toBeGreaterThanOrEqual(5);

		const latest = (await messages(contact, id, '?limit=2')).body;
		expect(latest.items).toEqual(all.items.slice(n - 2));
		expect(latest.next_cursor).toBe(all.items[n - 2].id);
		const older = (await messages(contact, id, `?limit=2&before=${latest.next_cursor}`)).body;
		expect(older.items).toEqual(all.items.slice(n - 4, n - 2));

		const forward = (await messages(contact, id, `?limit=2&after=${all.items[0].id}`)).body;
		expect(forward.items).toEqual(all.items.slice(1, 3));
		expect(forward.next_cursor).toBe(all.items[2].id);
		const end = (await messages(contact, id, `?after=${all.items[n - 1].id}`)).body;
		expect(end).toEqual({ items: [], next_cursor: null });

		expect((await messages(contact, id, `?after=${randomUUID()}`)).status).toBe(400);
		expect((await messages(contact, id, `?after=${all.items[0].id}&before=${all.items[1].id}`)).status).toBe(400);
		expect((await messages(contact, id, '?limit=51')).status).toBe(400);
	});

	it('broadcasts message.created with the DTO and conversation.updated in the same transaction', async ({ skip }) => {
		if (!(await hasRealtime())) skip();
		const res = await send(contact, id, { body: 'Broadcast?' });
		const events = await broadcasts(`conversation:${id}`);
		expect(events.at(-1)).toEqual({ event: 'message.created', payload: res.body });
		const inboxEvents = await broadcasts(`user:${owner.id}`);
		expect(inboxEvents.at(-1)).toMatchObject({
			event: 'conversation.updated',
			payload: { conversation_id: id, status: 'active', updated_at: res.body.created_at },
		});
		// The sender's own inbox gets nothing for its own message.
		expect((await broadcasts(`user:${contact.id}`)).at(-1)?.payload.updated_at).not.toBe(res.body.created_at);
	});

	it('queues one chat_message notification per window for offline participants, without the body', async () => {
		const quiet = await user();
		const cid = (await open(quiet, { about_report_code: found.short_code })).body.id;
		const first = (await send(quiet, cid, { body: 'Prvo sporočilo' })).body;
		await send(quiet, cid, { body: 'Drugo sporočilo' });
		const queued = await notifications(cid);
		const window = Math.floor(Date.now() / 300_000);
		expect(queued.length).toBeGreaterThanOrEqual(1);
		expect(queued[0]!.data).toEqual({
			user_id: anonFinder.id,
			type: 'chat_message',
			payload: { template: 'chat_message', thread_id: cid, message_id: first.id },
			dedupe_key: expect.stringMatching(new RegExp(`^chat:${cid}:(${window}|${window - 1})$`)),
		});
		expect(new Set(queued.map((job) => job.data.dedupe_key)).size).toBeLessThanOrEqual(2);
		expect(JSON.stringify(queued)).not.toContain('sporočilo');
		// A participant who just read the conversation is online: no notification.
		await request(app).post(`/v1/conversations/${cid}/read`).set('Authorization', anonFinder.auth);
		const before = (await notifications(cid)).length;
		await send(quiet, cid, { body: 'Tretje' });
		expect((await notifications(cid)).length).toBe(before);
	});

	it('derives the chat_message notification variables from ids only', async () => {
		const sender = await user();
		const cid = (await open(sender, { about_report_code: lost.short_code })).body.id;
		const sent = (await send(sender, cid, { body: 'Tajno besedilo' })).body;
		const ctx = systemCtx();
		const vars = await chatMessageVars(
			{ template: 'chat_message', thread_id: cid, message_id: sent.id },
			{ user_id: owner.id, locale: 'sl' },
			ctx
		);
		expect(vars).toEqual({ conversation_id: cid, preview_alias: 'contact', unread_count: 1 });
		await prisma.conversation_participants.update({
			where: { conversation_id_user_id: { conversation_id: cid, user_id: owner.id } },
			data: { last_read_at: new Date(Date.now() + 1000) },
		});
		expect(
			await chatMessageVars(
				{ template: 'chat_message', thread_id: cid, message_id: sent.id },
				{ user_id: owner.id, locale: 'sl' },
				ctx
			)
		).toBeNull();
	});

	it('marks read: unread drops to 0 and conversation.read is broadcast', async () => {
		const unread = async () =>
			(await inbox(owner)).body.items.find((item: { id: string }) => item.id === id).unread as number;
		expect(await unread()).toBeGreaterThan(0);
		const res = await request(app).post(`/v1/conversations/${id}/read`).set('Authorization', owner.auth);
		expect(res.status).toBe(204);
		expect(await unread()).toBe(0);
		if (await hasRealtime())
			expect((await broadcasts(`conversation:${id}`)).at(-1)).toMatchObject({
				event: 'conversation.read',
				payload: { conversation_id: id, reader_id: owner.id },
			});
	});

	it('blocks another participant: their messages are refused, the blocker can still write', async () => {
		const target = await user();
		const cid = (await open(target, { about_report_code: lost.short_code })).body.id;
		const block = (participant_id: string) =>
			request(app)
				.post(`/v1/conversations/${cid}/block`)
				.set('Authorization', owner.auth)
				.send({ participant_id });
		expect((await block(owner.id)).status).toBe(400);
		expect((await block(stranger.id)).status).toBe(400);
		expect((await block('not-a-uuid')).status).toBe(400);
		expect((await block(target.id)).status).toBe(204);
		expect((await block(target.id)).status).toBe(204);
		const refused = await send(target, cid, { body: 'Halo?' });
		expect([refused.status, refused.body.error.code]).toEqual([403, 'FORBIDDEN']);
		expect((await send(owner, cid, { body: 'Ne pišite več.' })).status).toBe(201);
	});

	it('rate-limits sending to 30 per minute', async () => {
		const talker = await user();
		const cid = (await open(talker, { about_report_code: found.short_code })).body.id;
		// Fixed one-minute windows: 61 sends cross at most one boundary, so one window must overflow.
		let status = 0;
		for (let i = 0; i < 61 && status !== 429; i++) status = (await send(talker, cid, { body: `#${i}` })).status;
		expect(status).toBe(429);
	});
});

describe('daily message limit', () => {
	it('refuses sends beyond rate.chat.message_day with 429', async () => {
		const talker = await user();
		const cid = (await open(talker, { about_report_code: found.short_code })).body.id;
		await prisma.app_config.upsert({
			where: { key: 'rate.chat.message_day' },
			create: { key: 'rate.chat.message_day', value: { limit: 1, window: 86400 } },
			update: { value: { limit: 1, window: 86400 } },
		});
		configStore.invalidate();
		try {
			await send(talker, cid, { body: 'Prvo' }).expect(201);
			const res = await send(talker, cid, { body: 'Drugo' });
			expect([res.status, res.body.error.code]).toEqual([429, 'RATE_LIMITED']);
		} finally {
			await prisma.app_config.deleteMany({ where: { key: 'rate.chat.message_day' } });
			configStore.invalidate();
		}
	});
});

describe('GET /v1/conversations', () => {
	it('lists the own conversations with aliases, preview, unread and keyset pages', async () => {
		const asker = await user();
		const a = (await open(asker, { about_report_code: lost.short_code })).body.id;
		const b = (await open(asker, { about_report_code: found.short_code })).body.id;
		await send(asker, a, { body: 'Novejše sporočilo' });
		await send(anonFinder, b, { body: 'Odgovor najditelja' }).expect(201);

		const list = (await inbox(asker)).body;
		expect(list.items.map((item: { id: string }) => item.id)).toEqual([b, a]);
		expect(list.items[0]).toEqual({
			id: b,
			about_report: { short_code: found.short_code, type: 'found', species: 'dog', thumb_url: null },
			my_alias_key: 'contact',
			other_alias_key: 'finder',
			last_message_preview: 'Odgovor najditelja',
			unread: 1,
			status: 'active',
		});
		expect(list.items[1]).toMatchObject({ my_alias_key: 'contact', other_alias_key: 'owner', unread: 0 });

		const first = (await inbox(asker, '?limit=1')).body;
		expect(first.items.map((item: { id: string }) => item.id)).toEqual([b]);
		const second = (await inbox(asker, `?limit=1&cursor=${first.next_cursor}`)).body;
		expect(second).toEqual({ items: [list.items[1]], next_cursor: null });
		expect((await inbox(asker, '?cursor=abc')).status).toBe(400);

		const theirs = (await inbox(anonFinder)).body.items.find((item: { id: string }) => item.id === b);
		expect(theirs).toMatchObject({ my_alias_key: 'finder', other_alias_key: 'contact' });
		expect((await request(app).get('/v1/conversations')).status).toBe(401);
	});

	it('keeps the cursor position when a message arrives between pages (no repeated items)', async () => {
		const asker = await user();
		const third = await report(owner, 'lost');
		const ids: string[] = [];
		for (const code of [lost.short_code, found.short_code, third.short_code]) {
			const cid = (await open(asker, { about_report_code: code })).body.id;
			await send(asker, cid, { body: 'Pozdravljeni' }).expect(201);
			ids.push(cid);
		}
		const [oldest, middle, newest] = ids as [string, string, string];
		const first = (await inbox(asker, '?limit=2')).body;
		expect(first.items.map((item: { id: string }) => item.id)).toEqual([newest, middle]);
		await send(asker, middle, { body: 'Novo sporočilo vmes' }).expect(201);
		const second = (await inbox(asker, `?limit=2&cursor=${first.next_cursor}`)).body;
		expect(second.items.map((item: { id: string }) => item.id)).toEqual([oldest]);
		expect(second.next_cursor).toBeNull();
		for (const bad of ['abc', Buffer.from('x|y').toString('base64url'), 'a'.repeat(501)])
			expect((await inbox(asker, `?cursor=${bad}`)).status).toBe(400);
	});

	it('names a sighting manager sighter', async () => {
		const sighter = await user({ anonymous: true });
		const sighting = await report(sighter, 'sighted');
		const asker = await user();
		const cid = (await open(asker, { about_report_code: sighting.short_code })).body.id;
		expect((await send(sighter, cid, { body: 'Videl sem ga.' })).body.sender_alias_key).toBe('sighter');
	});
});

describe('read-only and retention', () => {
	it('makes conversations read-only when their report closes and refuses new messages with GONE', async () => {
		const closing = await report(owner, 'lost');
		const asker = await user();
		const cid = (await open(asker, { about_report_code: closing.short_code })).body.id;
		await send(asker, cid, { body: 'Še iščete?' }).expect(201);

		expect(await ChatDomain.closeForReport({ report_id: closing.id }, systemCtx())).toBe(1);
		const res = await send(asker, cid, { body: 'Halo?' });
		expect([res.status, res.body.error.code]).toEqual([410, 'GONE']);
		expect((await messages(asker, cid)).body.items).toHaveLength(1);
		const item = (await inbox(asker)).body.items.find((row: { id: string }) => row.id === cid);
		expect(item.status).toBe('read_only');
		if (await hasRealtime())
			expect((await broadcasts(`user:${owner.id}`)).at(-1)).toMatchObject({
				event: 'conversation.updated',
				payload: { conversation_id: cid, status: 'read_only' },
			});
	});

	it('makes a match conversation read-only when the other (found) side closes', async () => {
		const lostSide = await report(owner, 'lost');
		const foundSide = await report(anonFinder, 'found');
		const match = await prisma.matches.create({
			data: {
				lost_report_id: lostSide.id,
				other_report_id: foundSide.id,
				score: 0.9,
				strength: 'strong',
				chip_match: false,
				reasons: {},
				state: 'confirmed',
			},
		});
		matchIds.push(match.id);
		const cid = (await open(owner, { about_report_code: lostSide.short_code, match_id: match.id })).body.id;
		expect(await ChatDomain.closeForReport({ report_id: foundSide.id }, systemCtx())).toBe(1);
		const res = await send(owner, cid, { body: 'Halo?' });
		expect([res.status, res.body.error.code]).toEqual([410, 'GONE']);
		await prisma.conversations.deleteMany({ where: { id: cid } });
	});

	it('retention.purge deletes conversations 6 months after close with their messages, keeps younger ones', async () => {
		const asker = await user();
		const old = await report(owner, 'lost');
		const recent = await report(owner, 'lost');
		const oldId = (await open(asker, { about_report_code: old.short_code })).body.id;
		const recentId = (await open(asker, { about_report_code: recent.short_code })).body.id;
		await send(asker, oldId, { body: 'Staro' }).expect(201);
		const now = new Date();
		const monthsAgo = (n: number) => new Date(new Date(now).setUTCMonth(now.getUTCMonth() - n));
		await prisma.conversations.update({
			where: { id: oldId },
			data: { status: 'read_only', closed_at: monthsAgo(7) },
		});
		await prisma.conversations.update({
			where: { id: recentId },
			data: { status: 'read_only', closed_at: monthsAgo(5) },
		});
		const ctx: JobCtx = { ...systemCtx({ now }), prisma, send: jobs.send };
		await handlers['retention.purge']({}, ctx);
		expect(await prisma.conversations.findUnique({ where: { id: oldId } })).toBeNull();
		expect(await prisma.messages.count({ where: { conversation_id: oldId } })).toBe(0);
		expect(await prisma.conversations.findUnique({ where: { id: recentId } })).not.toBeNull();
	});
});
