// Supabase Realtime Broadcast on private channels (ADR-023): the API writes, clients only receive (RLS on
// realtime.messages). Call it with the transaction client of the write it announces, so it is sent only on commit.
import type { RealtimeEvent } from '@zivali/types';

import { prisma, type Prisma } from '../prisma/prisma.ts';

export async function broadcast(
	topic: string,
	event: RealtimeEvent,
	payload: object,
	tx?: Prisma.TransactionClient
): Promise<void> {
	const db = tx ?? prisma;
	await db.$executeRaw`select realtime.send(${JSON.stringify(payload)}::jsonb, ${event}, ${topic}, true)`;
}

export default { broadcast };
