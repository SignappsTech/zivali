// db.keepalive (every 6 h, ADR-022): one trivial query, so Supabase Free does not pause the project.
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	await ctx.prisma.$queryRaw`select 1`;
}
