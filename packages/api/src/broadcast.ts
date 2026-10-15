// Supabase Realtime Broadcast on private channels (C9 §Realtime, ADR-023), used by `chat` and `notifications`.
// Typed structurally, so this package needs no supabase-js: pass the app's Supabase client.
import type { RealtimeEvent } from '@zivali/types';

export type BroadcastChannel = {
	on(
		type: 'broadcast',
		filter: { event: string },
		callback: (message: { payload?: unknown }) => void
	): BroadcastChannel;
	subscribe(callback: (status: string) => void): unknown;
};
/** The app's `SupabaseClient` (web `lib/supabase/client.ts`, mobile `lib/supabase.ts`). */
export type RealtimeClient = {
	channel(topic: string, options: { config: { private: boolean } }): BroadcastChannel;
	removeChannel(channel: BroadcastChannel): unknown;
};

/**
 * Joins `topic` as a private channel. `onSubscribed` runs on every (re)subscribe, so callers re-fetch what they
 * missed while offline. Returns the unsubscribe function (a `useEffect` cleanup).
 */
export function subscribeBroadcast(
	realtime: RealtimeClient,
	topic: string,
	handlers: Partial<Record<RealtimeEvent, (payload: unknown) => void>>,
	onSubscribed: () => void
): () => void {
	let channel = realtime.channel(topic, { config: { private: true } });
	for (const [event, handler] of Object.entries(handlers))
		channel = channel.on('broadcast', { event }, ({ payload }) => handler(payload));
	channel.subscribe((status) => {
		if (status === 'SUBSCRIBED') onSubscribed();
	});
	return () => void realtime.removeChannel(channel);
}
