import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import * as React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import type { AliasKey, ConversationSummary, Uuid } from '@zivali/types';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// P12 parts shared by the Inbox list, the thread and the manage screen (anonymous managers).

/** CH-170: block needs the other participant's id, which C9 does not list yet; Block shows once the API sends it. */
export type Conversation = ConversationSummary & { other_participant_id?: Uuid };

/** The row and header title: C9 has no pet name yet, so the P12 fallback by report type. */
export function useConversationTitle() {
	const t = useTranslations('chat');
	return (conversation: Pick<ConversationSummary, 'about_report'>) =>
		t('row_title_fallback', { type: conversation.about_report.type });
}

/** A participant's chosen display name, else the neutral role alias (C9 §Aliases); never an email or phone. */
export function useAlias() {
	const t = useTranslations('chat');
	return (key: AliasKey, displayName?: string) => {
		if (displayName) return key === 'shelter' ? t('alias_shelter', { organisation: displayName }) : displayName;
		// An organisation always has its name; without it, it reads as the finder it is.
		const role = key === 'shelter' ? 'finder' : key;
		return t(`alias_${role}`);
	};
}

/** "Prijava zaključena" with the lock icon for a read-only conversation (P12 status word); nothing while active. */
export function StatusWord({ conversation }: { conversation: Pick<ConversationSummary, 'status'> }) {
	const t = useTranslations('chat');
	if (conversation.status !== 'read_only') return null;
	return (
		<View className="flex-row items-center gap-1">
			<Icon as={LockSimpleIcon} weight="fill" size={16} className="text-muted-foreground" />
			<Text className="font-sans-bold text-sm text-muted-foreground">{t('row_status_closed')}</Text>
		</View>
	);
}

/** P12 M1 row, 80 px, no dividers: pet photo 64, title (bold when unread), status word, last line, the unread dot. */
export function ConversationRow({ conversation, onPress }: { conversation: ConversationSummary; onPress: () => void }) {
	const t = useTranslations('chat');
	const title = useConversationTitle()(conversation);
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing();
	const unread = conversation.unread > 0;
	const closed = conversation.status === 'read_only';
	const { thumb_url } = conversation.about_report;
	return (
		<Pressable
			role="button"
			aria-label={[
				unread ? t('row_unread_a11y', { title }) : title,
				closed && t('row_status_closed'),
				conversation.last_message_preview,
			]
				.filter(Boolean)
				.join(', ')}
			onPress={onPress}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className={cn(
				'min-h-20 flex-row items-center gap-4 rounded-row px-3 py-2 active:bg-foreground/10',
				!reduceMotion && 'active:scale-[0.98]'
			)}
		>
			{/* The title is next to it, so the photo is decorative (P12 copy §7). */}
			{thumb_url ? (
				<Image source={{ uri: thumb_url }} alt="" aria-hidden className="size-16 rounded-row bg-muted" />
			) : (
				<View aria-hidden className="size-16 items-center justify-center rounded-row bg-muted">
					<Icon as={PawPrintIcon} weight="fill" size={28} className="text-muted-foreground" />
				</View>
			)}
			<View className="min-w-0 flex-1">
				<Text
					numberOfLines={1}
					className={cn('text-lg leading-6', unread ? 'font-display' : 'font-display-semibold')}
				>
					{title}
				</Text>
				<StatusWord conversation={conversation} />
				{conversation.last_message_preview ? (
					<Text numberOfLines={1} className="text-control leading-[22px] text-muted-foreground">
						{conversation.last_message_preview}
					</Text>
				) : null}
			</View>
			{unread ? <View className="mt-2 size-2.5 self-start rounded-full bg-primary" /> : null}
		</Pressable>
	);
}
