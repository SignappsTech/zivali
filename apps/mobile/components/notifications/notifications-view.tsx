import { type Href, useRouter } from 'expo-router';
import type { IconWeight, Icon as PhosphorIcon } from 'phosphor-react-native';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import { useLocale, useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { subscribeInbox, useListNotificationsQuery, useMarkReadMutation } from '@zivali/api/notifications';
import { useTransitionReportMutation } from '@zivali/api/reports';
import type { ApiStore } from '@zivali/api/rtk';
import type { NotificationType } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { PermissionNote } from '@/components/shell/permission-primer';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { statusIcons } from '@/components/ui/status-label';
import { Text } from '@/components/ui/text';
import {
	type InboxGroup,
	type InboxRow,
	inboxGroups,
	notificationTarget,
	notificationValues,
	payloadCode,
	rowTime,
} from '@/lib/notifications';
import { usePushStatus } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// The type keys are built at runtime; `@zivali/i18n check` guards the catalogue and the tests render every type.
type Translate = (key: string, values?: Record<string, string | number>) => string;

const MATCH = 'text-status-found-subtle-foreground';
/** P13 icons, in the status text colour: chip match shield, match sparkle, message, nearby, reminder, system. */
function rowIcon(type: NotificationType): { as: PhosphorIcon; weight: IconWeight; className?: string } {
	switch (type) {
		case 'match_chip':
			return { as: ShieldCheckIcon, weight: 'fill', className: MATCH };
		case 'match_suggested':
		case 'match_confirmed':
			return { as: SparkleIcon, weight: 'fill', className: MATCH };
		case 'chat_message':
			return { as: ChatCircleIcon, weight: 'fill' };
		case 'nearby_lost':
			return { as: statusIcons.lost, weight: 'fill', className: 'text-status-lost-subtle-foreground' };
		case 'report_reunited':
			return { as: statusIcons.reunited, weight: 'fill', className: 'text-status-reunited-subtle-foreground' };
		case 'report_reminder':
		case 'report_expiring':
		case 'report_closed':
			return { as: ClockIcon, weight: 'bold' };
		default:
			return { as: InfoIcon, weight: 'regular' };
	}
}

/** The search reminders (day 7, 14, 30 and the 90-day close) carry "Keep searching" and "Close search". */
const hasSearchActions = ({ notification: n }: InboxRow) =>
	n.type === 'report_reminder' || (n.type === 'report_expiring' && n.payload.report_type === 'lost');

function NotificationRow({ row, group, onOpen }: { row: InboxRow; group: InboxGroup['group']; onOpen: () => void }) {
	const t = useTranslations('notifications');
	const tn = t as unknown as Translate;
	const locale = useLocale() as 'sl' | 'en';
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing();
	const { notification: n, unread } = row;
	const values = notificationValues(n, locale);
	const title = tn(`${n.type}.title`, values);
	const body = tn(`${n.type}.body`, values);
	const time = rowTime(n.created_at, group, locale);
	const icon = rowIcon(n.type);
	return (
		<Pressable
			role="button"
			aria-label={[unread ? t('row_unread_a11y', { title }) : title, body, time].join(', ')}
			disabled={!notificationTarget(n)}
			onPress={onOpen}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className={cn(
				'flex-row items-start gap-3.5 rounded-row px-5 py-2 active:bg-accent',
				!reduceMotion && 'active:scale-[0.98]'
			)}
		>
			{unread ? <View className="absolute left-[5px] top-[29px] size-2.5 rounded-full bg-primary" /> : null}
			<View className="size-12 items-center justify-center">
				<Icon as={icon.as} weight={icon.weight} size={30} className={icon.className} />
			</View>
			<View className="min-w-0 flex-1">
				<Text className={cn('text-control-lg', unread && 'font-sans-bold')}>{title}</Text>
				<Text className="mt-0.5 text-control leading-[22px]">{body}</Text>
			</View>
			<Text className="text-xs leading-6 text-muted-foreground" style={{ fontVariant: ['tabular-nums'] }}>
				{time}
			</Text>
		</Pressable>
	);
}

function SearchActions({ code, onDone }: { code: string; onDone: () => void }) {
	const t = useTranslations();
	const router = useRouter();
	const errorText = useErrorText();
	const [transition, { isLoading }] = useTransitionReportMutation();
	const keep = async () => {
		try {
			await transition({ code, body: { action: 'extend' } }).unwrap();
			onDone();
			toast.success(t('profile.saved'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	return (
		<View className="-mt-1 flex-row flex-wrap gap-x-1 pb-1 pl-[70px] pr-5">
			<Button variant="text" loading={isLoading} onPress={keep}>
				{t('notifications.reminder_keep')}
			</Button>
			{/* Closing asks for the reason on the listing (owner actions), so it opens there. */}
			<Button
				variant="text"
				onPress={() => {
					onDone();
					router.push(`/r/${code}` as Href);
				}}
			>
				<Text className="text-foreground">{t('notifications.reminder_close')}</Text>
			</Button>
		</View>
	);
}

/** Inline region error (system §10.9): a note with the error icon, one sentence and "Poskusi znova". */
export function InlineError({
	retrying,
	onRetry,
	className,
}: {
	retrying: boolean;
	onRetry: () => void;
	className?: string;
}) {
	const t = useTranslations('common');
	return (
		<View className={cn('flex-row gap-3 rounded-row bg-muted px-[18px] py-4', className)}>
			<Icon as={WarningCircleIcon} weight="fill" size={22} className="mt-0.5 text-destructive" />
			<View className="min-w-0 flex-1 items-start">
				<Text className="text-control leading-[22px]">{t('inline_error')}</Text>
				<Button variant="text" className="-ml-3" loading={retrying} onPress={onRetry}>
					{t('inline_error_retry')}
				</Button>
			</View>
		</View>
	);
}

/** Skeleton rows while the first page loads, announced once as "Nalaganje …". */
export function Loading({ className }: { className?: string }) {
	const t = useTranslations('common');
	return (
		<View accessible aria-label={t('loading')} aria-busy className={cn('gap-5 pt-5', className)}>
			{[0, 1, 2].map((i) => (
				<View key={i} className="flex-row gap-3.5">
					<Skeleton className="size-12 rounded-row" />
					<View className="flex-1 gap-2 pt-1">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-full" />
					</View>
				</View>
			))}
		</View>
	);
}

/**
 * P13 Notifications view: newest first in Today, This week, Earlier; an unread row has the primary dot, a bold title
 * and "unread" in its name. Tapping marks it read and opens its target. New notifications arrive over Realtime
 * (`user:<id>`), which re-fetches the list. Push denied: the P2 note (the inbox and email still tell the user).
 */
export function NotificationsView() {
	const t = useTranslations();
	const router = useRouter();
	const errorText = useErrorText();
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const userId = useSession().session?.user.id;
	const [push] = usePushStatus();
	const { data, isLoading, isError, isFetching, refetch } = useListNotificationsQuery();
	const [markRead, { isLoading: markingAll }] = useMarkReadMutation();

	React.useEffect(() => (userId ? subscribeInbox(supabase, dispatch, userId) : undefined), [dispatch, userId]);

	const groups = data ? inboxGroups(data.items) : [];
	const read = (row: InboxRow) => {
		if (row.unread) void markRead({ ids: row.ids });
	};
	const markAll = () =>
		markRead({ all: true })
			.unwrap()
			.catch((failure) => toast.error(errorText(failure)));

	let content: React.ReactNode;
	if (isLoading) content = <Loading className="px-5" />;
	else if (isError && !data)
		content = <InlineError className="mx-5 mt-5" retrying={isFetching} onRetry={() => void refetch()} />;
	else if (!groups.length)
		content = (
			<View className="flex-1 justify-center px-5 pb-10">
				<EmptyState
					title={t('notifications.empty_title')}
					description={t('notifications.empty_body')}
					action={
						<Button variant="text" className="-ml-3" onPress={() => router.push('/settings/alerts')}>
							{t('notifications.empty_action')}
						</Button>
					}
				/>
			</View>
		);
	else
		content = groups.map(({ group, rows }) => (
			<View key={group}>
				<Text role="heading" className="mb-0.5 mt-3 px-5 font-sans-bold text-control text-muted-foreground">
					{t(`notifications.group_${group}`)}
				</Text>
				{rows.map((row) => {
					const code = hasSearchActions(row) ? payloadCode(row.notification, 'report_code') : null;
					return (
						<View key={row.notification.id}>
							<NotificationRow
								row={row}
								group={group}
								onOpen={() => {
									read(row);
									const target = notificationTarget(row.notification);
									if (target) router.push(target as Href);
								}}
							/>
							{code ? <SearchActions code={code} onDone={() => read(row)} /> : null}
						</View>
					);
				})}
			</View>
		));

	return (
		<ScrollView contentContainerClassName="grow pb-6">
			<View className="flex-row flex-wrap items-center justify-between gap-x-3 px-5 pt-6">
				<Text role="heading" className="font-display text-[28px] leading-8 tracking-[-0.56px]">
					{t('notifications.title')}
				</Text>
				{data && data.unread > 0 ? (
					<Button variant="text" loading={markingAll} onPress={markAll}>
						{t('notifications.mark_all')}
					</Button>
				) : null}
			</View>
			{push === 'denied' ? <PermissionNote kind="notifications" className="mx-5 mt-3" /> : null}
			{content}
		</ScrollView>
	);
}
