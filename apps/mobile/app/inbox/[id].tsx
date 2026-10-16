import { useLocalSearchParams } from 'expo-router';

import { Thread } from '@/components/chat/thread';

// C15 `inbox/[id]`: one conversation (P12), opened from the Inbox list, a push (C10), a confirmed match or the manage
// screen. Protected flow: no ad component.
export default function ConversationScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <Thread id={id} />;
}
