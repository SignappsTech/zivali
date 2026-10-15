// Supabase Realtime Broadcast on private channels (ADR-023): realtime.send inside the caller's transaction, so the
// event goes out only if the write commits. Receiving is authorised by the "members receive" policy on
// realtime.messages (app.can_join_topic); clients cannot broadcast. realtime.send turns its own errors into warnings.
import type { Prisma } from '../prisma/prisma.ts';

export type Topic = `conversation:${string}` | `user:${string}`;

export async function broadcast(tx: Prisma.TransactionClient, topic: Topic, event: string, payload: object) {
	await tx.$executeRaw`select realtime.send(${JSON.stringify(payload)}::jsonb, ${event}, ${topic}, true)`;
}
