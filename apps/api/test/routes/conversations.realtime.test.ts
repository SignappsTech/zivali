// Two Realtime clients against the running Supabase Realtime (ADR-023, FR-009): a participant receives
// message.created within 2 s p95, a non-participant is refused, and a participant's own client broadcast reaches
// nobody. Runs only when a Realtime server is attached to the test database (schema _realtime); REALTIME_URL
// overrides `${SUPABASE_URL}/realtime/v1` (e.g. ws://realtime-dev.localhost:<port>/socket for a direct container).
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { config } from '../../lib/config.ts';
import { userCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

const attached = (
	await prisma.$queryRaw<{ ok: boolean }[]>`select to_regnamespace('_realtime') is not null as ok`
)[0]!.ok;
const BASE = (process.env.REALTIME_URL ?? `${config.SUPABASE_URL}/realtime/v1`).replace(/^http/, 'ws');
const MESSAGES = 20;

type Frame = { topic: string; event: string; payload: Record<string, any>; ref: string | null };

/** Minimal Phoenix v1 client: join a private channel with an access token, collect broadcasts with arrival times. */
class RealtimeClient {
	private ref = 0;
	private replies = new Map<string, (payload: Record<string, any>) => void>();
	readonly received: { event: string; payload: Record<string, any>; at: number }[] = [];

	private constructor(private ws: WebSocket) {
		ws.addEventListener('message', (message) => {
			const frame = JSON.parse(String(message.data)) as Frame;
			if (frame.event === 'phx_reply' && frame.ref) this.replies.get(frame.ref)?.(frame.payload);
			if (frame.event === 'broadcast')
				this.received.push({ event: frame.payload.event, payload: frame.payload.payload, at: performance.now() });
		});
	}

	static async connect(): Promise<RealtimeClient> {
		const apikey = await signTestToken({ role: 'anon' });
		const ws = new WebSocket(`${BASE}/websocket?apikey=${apikey}&vsn=1.0.0`);
		await new Promise((resolve, reject) => {
			ws.addEventListener('open', resolve, { once: true });
			ws.addEventListener('error', reject, { once: true });
		});
		return new RealtimeClient(ws);
	}

	private push(topic: string, event: string, payload: object): Promise<Record<string, any>> {
		const ref = String(++this.ref);
		const reply = new Promise<Record<string, any>>((resolve) => this.replies.set(ref, resolve));
		this.ws.send(JSON.stringify({ topic: `realtime:${topic}`, event, payload, ref, join_ref: ref }));
		return reply;
	}

	/** Resolves with the join status: 'ok', or 'error' when the policy refuses the topic. */
	async join(topic: string, access_token: string): Promise<string> {
		const config = { broadcast: { ack: false, self: false }, presence: { enabled: false }, private: true };
		const reply = await this.push(topic, 'phx_join', { config, access_token });
		return reply.status as string;
	}

	broadcast(topic: string, event: string, payload: object): void {
		const ref = String(++this.ref);
		this.ws.send(
			JSON.stringify({ topic: `realtime:${topic}`, event: 'broadcast', payload: { type: 'broadcast', event, payload }, ref })
		);
	}

	close(): void {
		this.ws.close();
	}
}

const p95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]!;

describe.skipIf(!attached)('Realtime chat delivery (two clients)', () => {
	const userIds: string[] = [];
	const clients: RealtimeClient[] = [];
	let reportId = '';
	let conversationId = '';
	const tokens = {} as Record<'sender' | 'receiver' | 'outsider', string>;

	beforeAll(async () => {
		for (const name of ['sender', 'receiver', 'outsider'] as const) {
			const id = await createAuthUser();
			userIds.push(id);
			await prisma.profiles.create({ data: { id } });
			tokens[name] = await signTestToken({ sub: id });
		}
		const receiver = userIds[1]!;
		const report = await ReportsDomain.insertReport(
			{ type: 'lost', species: 'cat', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
			userCtx({ user_id: receiver, role: 'USER', is_anonymous: false, aal: 'aal1', email_verified: true, locale: 'sl' })
		);
		reportId = report.id;
		const res = await request(app)
			.post('/v1/conversations')
			.set('Authorization', `Bearer ${tokens.sender}`)
			.send({ about_report_code: report.short_code });
		conversationId = res.body.id;
	}, 60_000);

	afterAll(async () => {
		for (const client of clients) client.close();
		await prisma.conversations.deleteMany({ where: { about_report_id: reportId } });
		await prisma.reports.deleteMany({ where: { id: reportId } });
		await deleteAuthUsers(userIds);
	});

	it('delivers message.created to the other participant within 2 s p95 and refuses outsiders', async () => {
		const topic = `conversation:${conversationId}`;
		const receiver = await RealtimeClient.connect();
		const outsider = await RealtimeClient.connect();
		clients.push(receiver, outsider);
		expect(await receiver.join(topic, tokens.receiver)).toBe('ok');
		expect(await outsider.join(topic, tokens.outsider)).toBe('error');

		const latencies: number[] = [];
		for (let i = 0; i < MESSAGES; i++) {
			const body = `ping ${i} ${randomUUID()}`;
			const start = performance.now();
			await request(app)
				.post(`/v1/conversations/${conversationId}/messages`)
				.set('Authorization', `Bearer ${tokens.sender}`)
				.send({ body })
				.expect(201);
			await expect
				.poll(() => receiver.received.find((event) => event.payload.body === body), { timeout: 5_000, interval: 10 })
				.toBeTruthy();
			latencies.push(receiver.received.find((event) => event.payload.body === body)!.at - start);
		}
		expect(receiver.received.filter((event) => event.event === 'message.created')).toHaveLength(MESSAGES);
		expect(outsider.received).toEqual([]);
		expect(p95(latencies)).toBeLessThan(2_000);
	});

	it('drops broadcasts sent by clients (no insert policy)', async () => {
		const topic = `conversation:${conversationId}`;
		const listener = await RealtimeClient.connect();
		const forger = await RealtimeClient.connect();
		clients.push(listener, forger);
		expect(await listener.join(topic, tokens.receiver)).toBe('ok');
		await forger.join(topic, tokens.sender);
		forger.broadcast(topic, 'message.created', { body: 'forged' });
		await new Promise((resolve) => setTimeout(resolve, 1_500));
		expect(listener.received).toEqual([]);
	});
});
