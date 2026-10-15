// notify.send delivery (C10, TASK-22.3) against the local database with the mock push and email adapters: inbox rows
// (deduped) with their user:<id> broadcast, per-type prefs, quiet hours, push and email text from @zivali/i18n in the
// recipient's locale, email_outbox rows, DeviceNotRegistered, one nearby alert per report, the chat email follow-up.
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { NotificationType } from '@zivali/types';

import { adapters } from '../../adapters/index.ts';
import { mockEmail } from '../../adapters/email/mock.ts';
import { mockPush } from '../../adapters/push/mock.ts';
import { NotificationsDomain } from '../../domains/notifications/index.ts';
import { quietMinutesLeft } from '../../domains/notifications/notifications.domain.ts';
import { sources, type Source } from '../../domains/notifications/sources.ts';
import { runJob } from '../../jobs/index.ts';
import { hashKey } from '../../lib/crypto.ts';
import { systemCtx, type Ctx } from '../../lib/ctx.ts';
import { drain, startJobs, type Jobs } from '../../lib/jobs.ts';
import { broadcast } from '../../lib/realtime.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

vi.mock('../../lib/realtime.ts', async (original) => {
	const real = await original<typeof import('../../lib/realtime.ts')>();
	return { ...real, broadcast: vi.fn(real.broadcast) };
});

beforeAll(() => startJobs(), 30_000);

const ids: string[] = [];
const conversations: string[] = [];
afterAll(async () => {
	await prisma.conversations.deleteMany({ where: { id: { in: conversations } } });
	await deleteAuthUsers(ids);
});

const saved = { ...sources };
afterEach(() => {
	for (const key of Object.keys(sources) as NotificationType[]) delete sources[key];
	Object.assign(sources, saved);
	vi.mocked(broadcast).mockClear();
});

/** A recipient with a profile, a confirmed email (unless told otherwise) and one push token. */
async function recipient(
	options: { locale?: 'sl' | 'en'; email_verified?: boolean; is_anonymous?: boolean; token?: string } = {}
) {
	const {
		locale = 'sl',
		email_verified = true,
		is_anonymous = false,
		token = `ExponentPushToken[${randomUUID()}]`,
	} = options;
	const id = await createAuthUser({ email_verified, is_anonymous });
	ids.push(id);
	await prisma.profiles.create({ data: { id, locale, is_anonymous } });
	await prisma.push_tokens.create({ data: { user_id: id, token, platform: 'ios' } });
	return { id, email: `${id}@test.invalid`, token };
}

type Sent = { jobs: { queue: string; data: object; options?: object }[] };
function testCtx(overrides: Partial<Ctx> = {}) {
	const push = mockPush();
	const email = mockEmail();
	const sent: Sent['jobs'] = [];
	const jobs: Jobs = {
		async send(queue, data, options) {
			sent.push({ queue, data, options });
			return randomUUID();
		},
	};
	const ctx = systemCtx({ adapters: { ...adapters, push, email }, jobs, ...overrides });
	return { ctx, push: push.sent!, email: email.sent!, jobs: sent };
}

const source = (vars: Record<string, unknown> | null): Source => vi.fn(async () => vars);
const job = (user_id: string, type: NotificationType, extra: object = {}, dedupe_key: string = randomUUID()) => ({
	user_id,
	type,
	payload: { template: type, ...extra },
	dedupe_key,
});
const inbox = (user_id: string) =>
	prisma.notifications.findMany({ where: { user_id }, orderBy: { created_at: 'asc' } });
const outbox = (user_id: string) => prisma.email_outbox.findMany({ where: { user_id } });

const iso = new Date().toISOString();
const report_code = 'Pq7abcde';
const SAMPLES: Record<Exclude<NotificationType, 'manage_link'>, Record<string, unknown>> = {
	match_chip: {
		match_id: randomUUID(),
		lost_code: report_code,
		other_code: 'Hk3abcde',
		other_type: 'sighted',
		pet_name: 'Luna',
		species: 'dog',
	},
	match_suggested: {
		match_id: randomUUID(),
		lost_code: report_code,
		strength: 'strong',
		other_type: 'found',
		species: 'cat',
	},
	match_confirmed: { conversation_id: randomUUID(), report_code, species: 'cat', report_type: 'found' },
	chat_message: { conversation_id: randomUUID(), preview_alias: 'Oseba, ki išče žival', unread_count: 2 },
	nearby_lost: {
		report_code,
		species: 'dog',
		distance_band: '1to3',
		has_area: true,
		area_name: 'Bežigrad',
		reported_at: iso,
	},
	report_reminder: { report_code, day: 14, pet_name: 'Luna', species: 'dog' },
	report_expiring: { report_code, report_type: 'lost', days_left: 3, species: 'dog' },
	report_closed: { report_code, report_type: 'found', idle_days: 30, reopen_days: 7, species: 'cat' },
	report_hidden: { report_code, report_type: 'lost', support_email: 'podpora@najdimo.si' },
	report_reunited: { report_code, species: 'dog' },
	payment_receipt: {
		payment_id: randomUUID(),
		amount_cents: 500,
		purpose: 'tip',
		paid_at: iso,
		receipt_ref: 'R-2026-0001',
		is_test: true,
	},
};

// C10 §Types: expected channels and SL text (push title or email subject) per type.
const EXPECTED: Record<
	keyof typeof SAMPLES,
	{ in_app: boolean; push?: string; email?: string; link: string; reason: string }
> = {
	match_chip: {
		in_app: true,
		push: 'Številka čipa se ujema · Luna',
		email: 'Številka čipa se ujema: Luna',
		link: '/r/Pq7abcde/ujemanja',
		reason: 'iskanje, prijavo ali pogovor',
	},
	match_suggested: {
		in_app: true,
		push: 'Zelo verjetno ujemanje · vaša mačka',
		email: 'Morda smo našli žival, ki jo iščete',
		link: '/r/Pq7abcde/ujemanja',
		reason: 'iskanje, prijavo ali pogovor',
	},
	match_confirmed: {
		in_app: true,
		push: 'Ujemanje je potrjeno',
		email: 'Ujemanje je potrjeno – odprite pogovor',
		link: `/nabiralnik/${SAMPLES.match_confirmed.conversation_id}`,
		reason: 'iskanje, prijavo ali pogovor',
	},
	// The email comes from the 30-minute follow-up (own test below).
	chat_message: { in_app: true, push: 'Novo sporočilo · Oseba, ki išče žival', link: '', reason: '' },
	// Email is opt-in (default off).
	nearby_lost: { in_app: true, push: 'Izgubljen pes v vaši bližini', link: '/r/Pq7abcde', reason: '' },
	report_reminder: {
		in_app: true,
		push: 'Še iščete žival?',
		email: 'Še iščete žival?',
		link: '/moje-prijave?r=Pq7abcde&action=keep',
		reason: 'iskanje, prijavo ali pogovor',
	},
	report_expiring: {
		in_app: true,
		email: 'Iskanje se bo čez 3 dni zaključilo',
		link: '/moje-prijave?r=Pq7abcde&action=keep',
		reason: 'iskanje, prijavo ali pogovor',
	},
	report_closed: {
		in_app: true,
		email: 'Prijava je zaključena',
		link: '/moje-prijave',
		reason: 'iskanje, prijavo ali pogovor',
	},
	report_hidden: {
		in_app: true,
		email: 'Prijava je v pregledu',
		link: '/moje-prijave',
		reason: 'iskanje, prijavo ali pogovor',
	},
	report_reunited: { in_app: true, push: 'Pes je spet doma', link: '', reason: '' },
	payment_receipt: {
		in_app: true,
		// Intl puts a no-break space before the euro sign.
		email: 'Test · Potrdilo o plačilu: 5,00 €',
		link: '/racun/placila',
		reason: 'opravili plačilo',
	},
};

describe('notify.send per C10 type (SL recipient, mock adapters)', () => {
	it.each(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[])('%s', async (type) => {
		const user = await recipient();
		sources[type] = source(SAMPLES[type]);
		const expected = EXPECTED[type];
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, type, { report_id: randomUUID() }), t.ctx);

		const rows = await inbox(user.id);
		expect(rows).toHaveLength(expected.in_app ? 1 : 0);
		expect(rows[0]?.type).toBe(type);

		if (expected.push) {
			expect(t.push).toEqual([
				expect.objectContaining({
					to: user.token,
					title: expected.push,
					data: expect.objectContaining({ type }),
				}),
			]);
			expect(t.push[0]!.body.length).toBeGreaterThan(0);
		} else expect(t.push).toEqual([]);

		const sent = await outbox(user.id);
		if (expected.email) {
			expect(sent).toEqual([
				expect.objectContaining({
					template: type,
					locale: 'sl',
					status: 'mocked',
					to_address_hash: hashKey(`email:${user.email}`),
					provider_id: 'mock-1',
				}),
			]);
			expect(t.email).toEqual([expect.objectContaining({ to: user.email, subject: expected.email })]);
			expect(t.email[0]!.html).toContain(`http://localhost:3000${expected.link}`.replaceAll('&', '&amp;'));
			expect(t.email[0]!.html).toContain(expected.reason);
			expect(t.email[0]!.text).toContain(`http://localhost:3000${expected.link}`);
		} else {
			expect(sent).toEqual([]);
			expect(t.email).toEqual([]);
		}
	});

	it('manage_link: email only to the given address, no user, URL with the token in the fragment', async () => {
		const t = testCtx({ locale: 'en' });
		const token = `tok_${randomUUID()}`;
		const to = `${randomUUID()}@test.invalid`;
		await NotificationsDomain.sendManageLink(
			{ to, report_code, report_type: 'found', species: 'cat', manage_token: token },
			t.ctx
		);
		expect(t.email).toEqual([expect.objectContaining({ to, subject: 'Your private link to your report' })]);
		expect(t.email[0]!.html).toContain(`http://localhost:3000/en/m#${token}`);
		expect(t.email[0]!.html).toContain('you gave this address when you made a report');
		expect(t.email[0]!.html).not.toContain('Notification settings');
		const [row] = await prisma.email_outbox.findMany({ where: { to_address_hash: hashKey(`email:${to}`) } });
		expect(row).toMatchObject({ user_id: null, template: 'manage_link', locale: 'en', status: 'mocked' });
		// The secret token is in the email only, never in a row.
		expect(JSON.stringify(row)).not.toContain(token);
		await prisma.email_outbox.delete({ where: { id: row!.id } });
	});
});

describe('locale (C16, TASK-10.4 AC5)', () => {
	it('renders push and email with createTranslator in each recipient’s profiles.locale', async () => {
		sources.match_chip = source(SAMPLES.match_chip);
		const sl = await recipient({ locale: 'sl' });
		const en = await recipient({ locale: 'en' });
		const t = testCtx();
		await NotificationsDomain.deliver(job(sl.id, 'match_chip'), t.ctx);
		await NotificationsDomain.deliver(job(en.id, 'match_chip'), t.ctx);
		expect(t.push.map((m) => [m.title, m.body])).toEqual([
			[
				'Številka čipa se ujema · Luna',
				'Opažena žival ima enako številko čipa, a se je morda že premaknila. Odprite ujemanje.',
			],
			[
				'Chip number matches · Luna',
				'A sighted animal has the same chip number, but it may have moved on. Open the match.',
			],
		]);
		expect(t.email.map((m) => m.subject)).toEqual(['Številka čipa se ujema: Luna', 'Chip number matches: Luna']);
		expect(t.email[1]!.html).toContain('http://localhost:3000/en/r/Pq7abcde/matches');
		expect(t.email[1]!.html).toContain('<html lang="en">');
		expect((await outbox(en.id))[0]?.locale).toBe('en');
	});
});

describe('payload and text', () => {
	it('derives has_name, cuts pet_name to 18 characters and escapes it in the email HTML', async () => {
		const user = await recipient();
		sources.match_chip = source({ ...SAMPLES.match_chip, pet_name: '<b>Lunaaaaaaaaaaaaaaaaaaa</b>' });
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'match_chip'), t.ctx);
		const [row] = await inbox(user.id);
		expect(row!.payload).toMatchObject({ has_name: 'yes', pet_name: '<b>Lunaaaaaaaaaaa…' });
		expect(t.email[0]!.html).toContain('&lt;b&gt;Lunaaaaaaaaaaa…');
		expect(t.email[0]!.html).not.toContain('<b>Luna');
	});

	it('names the species when the pet has no name', async () => {
		const user = await recipient();
		sources.report_reminder = source({ report_code, day: 7, species: 'cat' });
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'report_reminder'), t.ctx);
		expect((await inbox(user.id))[0]!.payload).toMatchObject({ has_name: 'no' });
		expect(t.push[0]!.body).toBe('Vaša mačka: iščete že 7 dni. Nadaljujte iskanje ali ga zaključite.');
	});

	it('broadcasts notification.created with the inbox DTO on user:<id>', async () => {
		const user = await recipient();
		sources.report_reunited = source(SAMPLES.report_reunited);
		await NotificationsDomain.deliver(job(user.id, 'report_reunited'), testCtx().ctx);
		const [row] = await inbox(user.id);
		expect(broadcast).toHaveBeenCalledWith(
			`user:${user.id}`,
			'notification.created',
			{
				id: row!.id,
				type: 'report_reunited',
				payload: SAMPLES.report_reunited,
				read_at: null,
				created_at: row!.created_at.toISOString(),
			},
			expect.anything()
		);
	});

	it('keeps the Vet Partner fields out of the inbox and push, and shows the labelled line in the email', async () => {
		const user = await recipient();
		await prisma.notification_prefs.create({ data: { user_id: user.id, type: 'nearby_lost', email: true } });
		sources.nearby_lost = source({
			...SAMPLES.nearby_lost,
			has_vet_partner: true,
			clinic_name: 'Ambulanta Mrak',
			clinic_area: 'Bežigrad',
			clinic_url: 'https://example.test/c?id=1',
		});
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'nearby_lost', { report_id: randomUUID() }), t.ctx);
		const [row] = await inbox(user.id);
		expect(Object.keys(row!.payload as object).sort()).toEqual(
			['area_name', 'distance_band', 'has_area', 'report_code', 'reported_at', 'species'].sort()
		);
		expect(JSON.stringify(t.push)).not.toContain('Mrak');
		expect(t.push[0]!.body).toBe('Bežigrad, 1–3 km od vašega območja. Ste ga morda videli?');
		const html = t.email[0]!.html;
		expect(html).toContain(
			'Oglas · Potrebujete veterinarja? Najbližja ambulanta: <a href="https://example.test/c?id=1">'
		);
		// Alert emails carry the signed one-click unsubscribe link and header.
		expect(html).toContain('Izklopi ta opozorila');
		expect(t.email[0]!.headers?.['List-Unsubscribe']).toMatch(
			/^<http:\/\/localhost:4000\/v1\/notifications\/unsubscribe\?token=.+>$/
		);
		expect(t.email[0]!.subject).toBe('Izgubljen pes v vaši bližini');
	});
});

describe('prefs, verification, dedupe', () => {
	it('honours per-type prefs: push off, in-app off, email off', async () => {
		const user = await recipient();
		await prisma.notification_prefs.create({
			data: { user_id: user.id, type: 'match_suggested', push: false, in_app: false, email: false },
		});
		sources.match_suggested = source(SAMPLES.match_suggested);
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'match_suggested'), t.ctx);
		expect(await inbox(user.id)).toEqual([]);
		expect(t.push).toEqual([]);
		expect(t.email).toEqual([]);
	});

	it('sends no email to an unconfirmed address or an anonymous finder, but keeps in-app and push', async () => {
		sources.match_confirmed = source(SAMPLES.match_confirmed);
		for (const options of [{ email_verified: false }, { is_anonymous: true }]) {
			const user = await recipient(options);
			const t = testCtx();
			await NotificationsDomain.deliver(job(user.id, 'match_confirmed'), t.ctx);
			expect(await inbox(user.id)).toHaveLength(1);
			expect(t.push).toHaveLength(1);
			expect(t.email).toEqual([]);
			expect(await outbox(user.id)).toEqual([]);
		}
	});

	it('stores one inbox row per dedupe_key and does not push or email a duplicate', async () => {
		const user = await recipient();
		sources.match_chip = source(SAMPLES.match_chip);
		const t = testCtx();
		const input = job(user.id, 'match_chip');
		await NotificationsDomain.deliver(input, t.ctx);
		await NotificationsDomain.deliver(input, t.ctx);
		expect(await inbox(user.id)).toHaveLength(1);
		expect(t.push).toHaveLength(1);
		expect(t.email).toHaveLength(1);
	});

	it('pushes a nearby alert at most once per report per user (alert_deliveries)', async () => {
		const user = await recipient();
		sources.nearby_lost = source(SAMPLES.nearby_lost);
		const report_id = randomUUID();
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'nearby_lost', { report_id }), t.ctx);
		await NotificationsDomain.deliver(job(user.id, 'nearby_lost', { report_id }), t.ctx);
		expect(t.push).toHaveLength(1);
		expect(await inbox(user.id)).toHaveLength(1);
		expect(await prisma.alert_deliveries.findMany({ where: { user_id: user.id } })).toEqual([
			expect.objectContaining({ report_id, channel: 'push' }),
		]);
	});

	it('deletes a token the push service reports as DeviceNotRegistered', async () => {
		const user = await recipient({ token: `ExponentPushToken[unregistered-${randomUUID()}]` });
		sources.report_reunited = source(SAMPLES.report_reunited);
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'report_reunited'), t.ctx);
		expect(t.push).toHaveLength(1);
		expect(await prisma.push_tokens.count({ where: { user_id: user.id } })).toBe(0);
	});

	it('records a failed email in email_outbox without failing the job', async () => {
		const user = await recipient();
		sources.report_hidden = source(SAMPLES.report_hidden);
		const t = testCtx();
		t.ctx.adapters.email.send = async () => {
			throw new Error('brevo: HTTP 502');
		};
		await NotificationsDomain.deliver(job(user.id, 'report_hidden'), t.ctx);
		expect(await outbox(user.id)).toEqual([
			expect.objectContaining({ status: 'failed', error: 'brevo: HTTP 502', provider_id: null }),
		]);
	});
});

describe('quiet hours (Europe/Ljubljana)', () => {
	// 2026-10-15 21:30 UTC = 23:30 in Ljubljana (CEST).
	const night = new Date('2026-10-15T21:30:20Z');

	it('computes the minutes left in the window, overnight windows included', () => {
		const q = (quiet_from: string | null, quiet_to: string | null, now = night) =>
			quietMinutesLeft({ quiet_from, quiet_to }, now);
		expect(q('22:00', '07:00')).toBe(450);
		expect(q('22:00', '07:00', new Date('2026-10-16T04:59:00Z'))).toBe(1);
		expect(q('22:00', '07:00', new Date('2026-10-16T05:00:00Z'))).toBe(0);
		expect(q('23:00', '23:45')).toBe(15);
		expect(q('08:00', '20:00')).toBe(0);
		expect(q(null, '07:00')).toBe(0);
		expect(q('07:00', '07:00')).toBe(0);
	});

	it('defers a quiet-hours type to the end of the quiet hours, without delivering it now', async () => {
		const user = await recipient();
		await prisma.profiles.update({ where: { id: user.id }, data: { quiet_from: '22:00', quiet_to: '07:00' } });
		sources.match_suggested = source(SAMPLES.match_suggested);
		const t = testCtx({ now: night });
		const input = job(user.id, 'match_suggested');
		await NotificationsDomain.deliver(input, t.ctx);
		expect(await inbox(user.id)).toEqual([]);
		expect(t.push).toEqual([]);
		// 07:00 in Ljubljana = 05:00 UTC.
		expect(t.jobs).toEqual([
			{ queue: 'notify.send', data: input, options: { startAfter: new Date('2026-10-16T05:00:00Z') } },
		]);
		expect(sources.match_suggested).not.toHaveBeenCalled();
	});

	it('ignores quiet hours for match_chip and chat_message', async () => {
		const user = await recipient();
		await prisma.profiles.update({ where: { id: user.id }, data: { quiet_from: '22:00', quiet_to: '07:00' } });
		sources.match_chip = source(SAMPLES.match_chip);
		const t = testCtx({ now: night });
		await NotificationsDomain.deliver(job(user.id, 'match_chip'), t.ctx);
		expect(t.push).toHaveLength(1);
		expect(t.jobs).toEqual([]);
	});
});

describe('chat_message email after 30 minutes unread', () => {
	async function conversation(user_id: string, last_read_at: Date | null) {
		const conv = await prisma.conversations.create({ data: { about_report_id: randomUUID() } });
		conversations.push(conv.id);
		await prisma.conversation_participants.create({
			data: { conversation_id: conv.id, user_id, role: 'owner', last_read_at },
		});
		return conv.id;
	}

	it('schedules one follow-up per unread streak, which emails without a second inbox row or push', async () => {
		const user = await recipient();
		const thread_id = await conversation(user.id, null);
		sources.chat_message = source({ ...SAMPLES.chat_message, conversation_id: thread_id });
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'chat_message', { thread_id, message_id: randomUUID() }), t.ctx);
		await NotificationsDomain.deliver(job(user.id, 'chat_message', { thread_id, message_id: randomUUID() }), t.ctx);
		expect(t.push).toHaveLength(2);
		expect(t.email).toEqual([]);
		expect(t.jobs).toHaveLength(2);
		const [first, second] = t.jobs as {
			data: { dedupe_key: string };
			options: { id: string; startAfter: number };
		}[];
		expect(first!.options).toEqual({ id: second!.options.id, startAfter: 1800 });
		expect(first!.data).toEqual({
			user_id: user.id,
			type: 'chat_message',
			payload: { template: 'chat_message', thread_id },
			dedupe_key: `email:${thread_id}`,
		});

		// Reading the conversation starts a new streak, so the next follow-up gets another id.
		await prisma.conversation_participants.update({
			where: { conversation_id_user_id: { conversation_id: thread_id, user_id: user.id } },
			data: { last_read_at: new Date() },
		});
		await NotificationsDomain.deliver(job(user.id, 'chat_message', { thread_id, message_id: randomUUID() }), t.ctx);
		expect((t.jobs[2]!.options as { id: string }).id).not.toBe(first!.options.id);

		const followUp = testCtx();
		await NotificationsDomain.deliver(first!.data, followUp.ctx);
		expect(followUp.push).toEqual([]);
		expect(await inbox(user.id)).toHaveLength(3);
		expect(followUp.email).toEqual([expect.objectContaining({ subject: 'Imate 2 neprebrani sporočili' })]);
		expect(followUp.email[0]!.html).toContain(`/nabiralnik/${thread_id}`);
	});

	it('sends no follow-up email when the conversation has been read', async () => {
		const user = await recipient();
		sources.chat_message = source(null);
		const t = testCtx();
		await NotificationsDomain.deliver(job(user.id, 'chat_message', { thread_id: randomUUID() }, 'email:x'), t.ctx);
		expect(t.email).toEqual([]);
	});
});

describe('job handling', () => {
	it('runs end to end: enqueueNotification → notify.send → inbox row', async () => {
		const user = await recipient();
		sources.report_reunited = source(SAMPLES.report_reunited);
		await NotificationsDomain.enqueueNotification(job(user.id, 'report_reunited'), systemCtx());
		await drain(runJob);
		expect(await inbox(user.id)).toEqual([expect.objectContaining({ type: 'report_reunited' })]);
	});

	it('drops an invalid job, a recipient without profile and a moot notification; a type without a source throws', async () => {
		const t = testCtx();
		await expect(NotificationsDomain.deliver({ marker: 'x' }, t.ctx)).resolves.toBeUndefined();
		await expect(NotificationsDomain.deliver(job(randomUUID(), 'match_chip'), t.ctx)).resolves.toBeUndefined();
		const user = await recipient();
		sources.match_chip = source(null);
		await NotificationsDomain.deliver(job(user.id, 'match_chip'), t.ctx);
		expect(await inbox(user.id)).toEqual([]);
		delete sources.match_chip;
		await expect(NotificationsDomain.deliver(job(user.id, 'match_chip'), t.ctx)).rejects.toThrow(
			'no variables source for match_chip'
		);
	});
});
