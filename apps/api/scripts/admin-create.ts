// `pnpm admin:create <email> [--i-know-this-is-production]` (ADR-018): promotes an existing account with a confirmed
// email to ADMIN. The only way to the first admin: a CLI run from a checkout, never an HTTP endpoint. Without the flag
// it refuses any target but the local stack; with it, the operator must also type the email again at the prompt.
// The account is found through the Supabase Auth Admin API; the role is set (and audited, actor = system) by the same
// domain function as PUT /v1/admin/users/:id/role.
// `--reset-mfa <email>` is the lost-authenticator recovery (TASK-34.6, docs/tech/admin-runbook.md): it deletes all of the
// account's MFA factors through the Admin API (audited, actor = system) so the person enrols again; same guards.
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

import { SignJWT } from 'jose';

import { AdminDomain } from '../domains/admin/index.ts';
import { UsersDomain } from '../domains/users/index.ts';
import { config, type Config } from '../lib/config.ts';
import { systemCtx } from '../lib/ctx.ts';
import { AuditDao } from '../domains/platform/index.ts';
import { prisma } from '../prisma/prisma.ts';
import { isLocalStack } from '../prisma/seeders/00-users.seeder.ts';

export const PRODUCTION_FLAG = '--i-know-this-is-production';
export const RESET_MFA_FLAG = '--reset-mfa';
const PER_PAGE = 1000;

type Target = Pick<Config, 'APP_ENV' | 'SUPABASE_URL' | 'DATABASE_URL'>;
type AuthUser = { id: string; email?: string; email_confirmed_at?: string | null; is_anonymous?: boolean };

/** Local = APP_ENV local with both the database and Supabase on this machine. */
export const isLocalTarget = (target: Target): boolean =>
	target.APP_ENV === 'local' && isLocalStack(target.SUPABASE_URL, target.DATABASE_URL);

/** The local stack signs with the shared JWT secret (as seeder 00-users does); anywhere else the secret key is needed. */
async function adminApiKey(): Promise<string> {
	if (isLocalTarget(config) && config.SUPABASE_JWT_SECRET)
		return new SignJWT({ role: 'service_role' })
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setIssuedAt()
			.setExpirationTime('5m')
			.sign(new TextEncoder().encode(config.SUPABASE_JWT_SECRET));
	if (!config.SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY is not set');
	return config.SUPABASE_SECRET_KEY;
}

/** One Supabase Auth Admin API call, e.g. adminApi('/users?page=1'). */
export async function adminApi<T>(path: string, method = 'GET', body?: object): Promise<T> {
	const key = await adminApiKey();
	const res = await fetch(`${config.SUPABASE_URL}/auth/v1/admin${path}`, {
		method,
		headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: body && JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Supabase Admin API ${method} answered ${res.status}`);
	return (await res.json()) as T;
}

/** Pages through the Auth Admin API (`filter` narrows the list where GoTrue supports it); exact email match. */
async function findAuthUser(email: string): Promise<AuthUser | null> {
	for (let page = 1; ; page++) {
		const { users } = await adminApi<{ users: AuthUser[] }>(
			`/users?page=${page}&per_page=${PER_PAGE}&filter=${encodeURIComponent(email)}`
		);
		const user = users.find((candidate) => candidate.email?.toLowerCase() === email);
		if (user) return user;
		if (users.length < PER_PAGE) return null;
	}
}

/** Promotes the account behind `email` to ADMIN; throws with a message for the operator. */
export async function adminCreate(email: string) {
	const user = await findAuthUser(email.trim().toLowerCase());
	if (!user) throw new Error('No account with this email: sign up first');
	if (user.is_anonymous || !user.email_confirmed_at) throw new Error('The account has no confirmed email yet');
	await UsersDomain.ensureProfile({ user_id: user.id, is_anonymous: false });
	return AdminDomain.setUserRole({ id: user.id, role: 'ADMIN', note: 'pnpm admin:create' }, systemCtx());
}

/** Deletes every MFA factor of the account behind `email` (lost device); returns how many. Audited. */
export async function resetMfa(email: string) {
	const user = await findAuthUser(email.trim().toLowerCase());
	if (!user) throw new Error('No account with this email');
	const factors = await adminApi<{ id: string }[]>(`/users/${user.id}/factors`);
	for (const factor of factors) await adminApi(`/users/${user.id}/factors/${factor.id}`, 'DELETE');
	await AuditDao.write(undefined, {
		actor_id: null,
		action: 'admin.mfa.reset',
		target_type: 'profile',
		target_id: user.id,
		diff: { removed: factors.length },
		note: 'pnpm admin:create --reset-mfa',
	});
	return { id: user.id, removed: factors.length };
}

const out = (line: string) => process.stdout.write(`${line}\n`);

async function confirmProduction(email: string, what: string): Promise<boolean> {
	if (!process.stdin.isTTY) return false;
	const hosts = [config.DATABASE_URL, config.SUPABASE_URL].map((url) => new URL(url).hostname).join(', ');
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await rl.question(`${what} on ${config.APP_ENV} (${hosts}). Type the email again: `);
		return answer.trim().toLowerCase() === email.trim().toLowerCase();
	} finally {
		rl.close();
	}
}

export async function main(argv: string[]): Promise<number> {
	const flags = argv.filter((arg) => arg.startsWith('--'));
	const args = argv.filter((arg) => !arg.startsWith('--'));
	const email = args[0];
	if (
		args.length !== 1 ||
		!email ||
		!/^[^\s@]+@[^\s@]+$/.test(email) ||
		flags.some((f) => f !== PRODUCTION_FLAG && f !== RESET_MFA_FLAG)
	) {
		out(`Usage: pnpm admin:create [${RESET_MFA_FLAG}] <email> [${PRODUCTION_FLAG}]`);
		return 2;
	}
	const reset = flags.includes(RESET_MFA_FLAG);
	if (!isLocalTarget(config)) {
		if (!flags.includes(PRODUCTION_FLAG)) {
			out(
				`Refused: the target is not the local stack. Pass ${PRODUCTION_FLAG} to ${reset ? 'reset MFA for' : 'promote'} an account there.`
			);
			return 1;
		}
		if (!(await confirmProduction(email, reset ? 'Reset MFA' : 'Promote to ADMIN'))) {
			out('Refused: not confirmed (an interactive terminal is required).');
			return 1;
		}
	}
	if (reset) {
		const { id, removed } = await resetMfa(email);
		out(`Removed ${removed} MFA factor(s) of ${id} (audited). They must sign in and enrol a new authenticator.`);
		return 0;
	}
	const { id } = await adminCreate(email);
	out(`Promoted ${id} to ADMIN (audited). Staff routes need a TOTP factor: sign in and enrol one.`);
	return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	main(process.argv.slice(2))
		.catch((err: unknown) => {
			out(`Failed: ${err instanceof Error ? err.message : String(err)}`);
			return 1;
		})
		.then(async (code) => {
			await prisma.$disconnect();
			process.exit(code);
		});
}
