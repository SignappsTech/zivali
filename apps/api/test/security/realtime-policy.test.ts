// ADR-023 on top of ADR-021: the only policy is "members receive" (select) on realtime.messages; app.can_join_topic
// lets a user receive their own user:<id> topic and the conversations they take part in, nothing else. No policy
// lets clients insert (broadcast), and anon/authenticated still cannot reach schema app directly.
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../../prisma/prisma.ts';

const ids = { member: randomUUID(), outsider: randomUUID(), conversation: randomUUID() };

const hasRealtime = async () =>
	(await prisma.$queryRaw<{ ok: boolean }[]>`select to_regclass('realtime.messages') is not null as ok`)[0]!.ok;

/** What `uid` receives on `topic`, evaluated by the policy as role authenticated (rolled back). */
async function receives(uid: string, topic: string): Promise<boolean> {
	let seen = false;
	await prisma
		.$transaction(async (tx) => {
			await tx.$executeRaw`select realtime.send('{"probe":true}'::jsonb, 'probe', ${topic}, true)`;
			await tx.$executeRaw`set local role authenticated`;
			await tx.$executeRaw`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: 'authenticated' })}, true)`;
			await tx.$executeRaw`select set_config('realtime.topic', ${topic}, true)`;
			const [row] = await tx.$queryRaw<{ n: number }[]>`
				select count(*)::int as n from realtime.messages where topic = ${topic} and event = 'probe'`;
			seen = row!.n > 0;
			throw new Error('rollback');
		})
		.catch((err: Error) => {
			if (err.message !== 'rollback') throw err;
		});
	return seen;
}

beforeAll(async () => {
	await prisma.profiles.createMany({ data: [{ id: ids.member }, { id: ids.outsider }] });
	await prisma.conversations.create({
		data: {
			id: ids.conversation,
			about_report_id: randomUUID(),
			participants: { create: { user_id: ids.member, role: 'contact' } },
		},
	});
});

afterAll(async () => {
	await prisma.conversations.delete({ where: { id: ids.conversation } });
	await prisma.profiles.deleteMany({ where: { id: { in: [ids.member, ids.outsider] } } });
});

describe('app.can_join_topic', () => {
	it('is security definer, executable by authenticated only, and app stays unreachable', async () => {
		const [fn] = await prisma.$queryRaw<{ definer: boolean; anon: boolean; auth: boolean; pub: boolean }[]>`
			select p.prosecdef as definer,
				has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
				has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth,
				exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0) as pub
			from pg_proc p where p.oid = 'app.can_join_topic(uuid, text)'::regprocedure`;
		expect(fn).toEqual({ definer: true, anon: false, auth: true, pub: false });
		await expect(
			prisma.$transaction(async (tx) => {
				await tx.$executeRaw`set local role authenticated`;
				await tx.$queryRaw`select app.can_join_topic(${ids.member}::uuid, 'user:x')`;
			})
		).rejects.toThrow(/permission denied for schema app/);
	});

	it('answers own user topic and member conversations only', async () => {
		const join = async (uid: string | null, topic: string) =>
			(
				await prisma.$queryRaw<{ ok: boolean | null }[]>`
					select app.can_join_topic(${uid}::uuid, ${topic}) as ok`
			)[0]!.ok === true;
		expect(await join(ids.member, `user:${ids.member}`)).toBe(true);
		expect(await join(ids.member, `user:${ids.outsider}`)).toBe(false);
		expect(await join(ids.member, `conversation:${ids.conversation}`)).toBe(true);
		expect(await join(ids.outsider, `conversation:${ids.conversation}`)).toBe(false);
		expect(await join(ids.member, `conversation:not-a-uuid`)).toBe(false);
		expect(await join(ids.member, 'reports')).toBe(false);
		expect(await join(null, `user:${ids.member}`)).toBe(false);
	});
});

describe('realtime.messages policies', () => {
	it('has only the members receive select policy for authenticated: clients cannot broadcast', async ({ skip }) => {
		if (!(await hasRealtime())) skip();
		const policies = await prisma.$queryRaw<{ name: string; cmd: string; roles: string[]; qual: string }[]>`
			select policyname as name, cmd, roles::text[] as roles, qual from pg_policies
			where schemaname = 'realtime' and tablename = 'messages'`;
		expect(policies).toEqual([
			{
				name: 'members receive',
				cmd: 'SELECT',
				roles: ['authenticated'],
				qual: 'app.can_join_topic(auth.uid(), realtime.topic())',
			},
		]);
	});

	it('lets participants receive their conversation and users their own inbox, nobody else', async ({ skip }) => {
		if (!(await hasRealtime())) skip();
		expect(await receives(ids.member, `conversation:${ids.conversation}`)).toBe(true);
		expect(await receives(ids.outsider, `conversation:${ids.conversation}`)).toBe(false);
		expect(await receives(ids.member, `user:${ids.member}`)).toBe(true);
		expect(await receives(ids.outsider, `user:${ids.member}`)).toBe(false);
	});
});
