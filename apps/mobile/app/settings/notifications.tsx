import { skipToken } from '@reduxjs/toolkit/query';
import { Redirect, Stack } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { BellSlashIcon } from 'phosphor-react-native/src/icons/BellSlash';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import * as React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslations } from 'use-intl';

import { useRequireAuth } from '@zivali/api/auth';
import { meApi } from '@zivali/api/me';
import {
	notificationsApi,
	useGetPrefsQuery,
	useSetPrefMutation,
	useSetQuietHoursMutation,
} from '@zivali/api/notifications';
import type { ApiStore } from '@zivali/api/rtk';
import type { Me, NotificationPref, NotificationPrefs, NotificationType } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { InlineError, Loading } from '@/components/notifications/notifications-view';
import { PermissionPrimer } from '@/components/shell/permission-primer';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { resendConfirmation } from '@/lib/auth';
import { usePushPermission, usePushStatus } from '@/lib/push';

type Channel = 'push' | 'email' | 'in_app';

/** P13 "How to tell me": four rows over the C10 types; every switch can be turned off (TASK-114.14). */
const ROWS: { key: 'matches' | 'messages' | 'nearby' | 'reminders'; types: NotificationType[] }[] = [
	{ key: 'matches', types: ['match_chip', 'match_suggested', 'match_confirmed'] },
	{ key: 'messages', types: ['chat_message'] },
	{ key: 'nearby', types: ['nearby_lost'] },
	{ key: 'reminders', types: ['report_reminder', 'report_expiring', 'report_closed'] },
];
const CHANNELS = [
	['push', 'channel_push'],
	['email', 'channel_email'],
	['in_app', 'channel_inapp'],
] as const;

/** As the API without a stored row (C10): every channel on, nearby email opt-in. */
const fallback = (type: NotificationType): NotificationPref => ({
	type,
	in_app: true,
	push: true,
	email: type !== 'nearby_lost',
});
const isOn = (prefs: NotificationPrefs, types: NotificationType[], channel: Channel) =>
	types.every((type) => (prefs.items.find((item) => item.type === type) ?? fallback(type))[channel]);

/** "22:00", "7:00", "22.00" or "2200" -> "HH:MM"; null for anything else. */
export function parseClock(text: string): string | null {
	const match = /^(\d{1,2})[:.]?(\d{2})$/.exec(text.trim());
	if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
	return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function Note({ icon, text, action }: { icon: PhosphorIcon; text: string; action: React.ReactNode }) {
	return (
		<View className="flex-row gap-3 rounded-row bg-muted px-[18px] py-4">
			<Icon as={icon} weight="fill" size={22} className="mt-0.5" />
			<View className="min-w-0 flex-1 items-start">
				<Text className="text-control leading-[22px]">{text}</Text>
				{action}
			</View>
		</View>
	);
}

function QuietHours({ prefs }: { prefs: NotificationPrefs }) {
	const t = useTranslations('alerts');
	const tc = useTranslations('profile');
	const errorText = useErrorText();
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const [setQuietHours, { isLoading }] = useSetQuietHoursMutation();
	const [from, setFrom] = React.useState(prefs.quiet_from ?? '');
	const [to, setTo] = React.useState(prefs.quiet_to ?? '');
	const [invalid, setInvalid] = React.useState({ from: false, to: false });

	const save = async (quiet_from: string | null, quiet_to: string | null) => {
		if (quiet_from === prefs.quiet_from && quiet_to === prefs.quiet_to) return;
		try {
			await setQuietHours({ quiet_from, quiet_to }).unwrap();
			// The profile carries them too: the offline proximity alerts read them from there (C17).
			dispatch(meApi.util.invalidateTags(['Me']));
			toast.success(tc('saved'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	// Saved once both are valid times; both empty means none.
	const commit = () => {
		const [start, end] = [parseClock(from), parseClock(to)];
		setInvalid({ from: Boolean(from.trim()) && !start, to: Boolean(to.trim()) && !end });
		if (start && end) {
			setFrom(start);
			setTo(end);
			void save(start, end);
		} else if (!from.trim() && !to.trim()) void save(null, null);
	};
	const field = (label: 'quiet_from' | 'quiet_to', value: string, set: (v: string) => void, bad: boolean) => (
		<FormField className="flex-1" label={t(label)} error={bad ? t('quiet_invalid') : undefined}>
			<Input
				value={value}
				onChangeText={set}
				onEndEditing={commit}
				placeholder={label === 'quiet_from' ? '22:00' : '07:00'}
				keyboardType="numbers-and-punctuation"
				maxLength={5}
			/>
		</FormField>
	);

	return (
		<View className="mt-10">
			<Text role="heading" className="font-display text-[22px] leading-7 tracking-[-0.22px]">
				{t('quiet_title')}
			</Text>
			<View className="mt-3 flex-row gap-5">
				{field('quiet_from', from, setFrom, invalid.from)}
				{field('quiet_to', to, setTo, invalid.to)}
			</View>
			<Text className="mt-3 text-sm text-muted-foreground">{t('quiet_help')}</Text>
			{prefs.quiet_from || prefs.quiet_to ? (
				<Button
					variant="text"
					className="-ml-3 mt-1 self-start"
					loading={isLoading}
					onPress={() => {
						setFrom('');
						setTo('');
						setInvalid({ from: false, to: false });
						void save(null, null);
					}}
				>
					{t('quiet_off')}
				</Button>
			) : null}
		</View>
	);
}

function Channels({ prefs, me }: { prefs: NotificationPrefs; me: Me | null }) {
	const t = useTranslations();
	const errorText = useErrorText();
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const [setPref] = useSetPrefMutation();
	const [push, recheckPush] = usePushStatus();
	const { request } = usePushPermission();
	/** The row whose push switch was turned on while the OS can still ask: the primer runs first. */
	const [asking, setAsking] = React.useState<NotificationType[] | null>(null);
	const [sending, setSending] = React.useState(false);

	const change = async (types: NotificationType[], channel: Channel, value: boolean) => {
		// Optimistic, so the switch moves at once; undone when the API refuses.
		const patch = dispatch(
			notificationsApi.util.updateQueryData('getPrefs', undefined, (draft) => {
				for (const type of types) {
					const item = draft.items.find((i) => i.type === type);
					if (item) item[channel] = value;
					else draft.items.push({ ...fallback(type), [channel]: value });
				}
			})
		);
		try {
			await Promise.all(types.map((type) => setPref({ type, body: { [channel]: value } }).unwrap()));
			toast.success(t('profile.saved'));
		} catch (failure) {
			patch.undo();
			toast.error(errorText(failure));
		}
	};

	const resend = async () => {
		if (!me?.email) return;
		setSending(true);
		try {
			await resendConfirmation(me.email);
			toast.success(t('alerts.email_sent'));
		} catch (failure) {
			toast.error(errorText(failure));
		} finally {
			setSending(false);
		}
	};

	return (
		<View className="gap-4">
			{push === 'denied' ? (
				<Note
					icon={BellSlashIcon}
					text={t('alerts.push_denied')}
					action={
						<Button variant="text" className="-ml-3 mt-1" onPress={() => Linking.openSettings()}>
							{t('alerts.push_open_settings')}
						</Button>
					}
				/>
			) : null}
			{me?.email && !me.email_verified ? (
				<Note
					icon={EnvelopeSimpleIcon}
					text={t('alerts.email_unverified')}
					action={
						<Button variant="text" className="-ml-3 mt-1" loading={sending} onPress={resend}>
							{t('alerts.email_resend')}
						</Button>
					}
				/>
			) : null}
			<View>
				<View aria-hidden className="flex-row items-end pb-1.5">
					<View className="flex-1" />
					{CHANNELS.map(([channel, label]) => (
						<Text
							key={channel}
							className="w-16 text-center font-sans-bold text-[13px] leading-4 text-muted-foreground"
						>
							{t(`alerts.${label}`)}
						</Text>
					))}
				</View>
				{ROWS.map(({ key, types }) => {
					const type = t(`alerts.type_${key}`);
					return (
						<View key={key} role="group" aria-label={type} className="min-h-12 flex-row items-center">
							<Text className="flex-1 font-sans-bold leading-5">{type}</Text>
							{CHANNELS.map(([channel, label]) => (
								<View key={channel} className="w-16 items-center">
									<Switch
										aria-label={t('alerts.channel_switch_a11y', {
											type,
											channel: t(`alerts.${label}`),
										})}
										// Push shows what the phone will do: off while the OS permission is missing.
										checked={
											isOn(prefs, types, channel) && (channel !== 'push' || push === 'granted')
										}
										disabled={channel === 'push' && push !== 'granted' && push !== 'ask'}
										onCheckedChange={(value) => {
											if (channel === 'push' && value && push === 'ask') setAsking(types);
											else void change(types, channel, value);
										}}
									/>
								</View>
							))}
						</View>
					);
				})}
			</View>
			<PermissionPrimer
				kind="notifications"
				open={asking !== null}
				request={request}
				onResult={(granted) => {
					const types = asking;
					setAsking(null);
					recheckPush();
					if (granted && types && !isOn(prefs, types, 'push')) void change(types, 'push', true);
				}}
			/>
		</View>
	);
}

/**
 * P13 "How we tell you" (settings stack): per type and channel switches, the permission notes and quiet hours. Saves on
 * every change with the "Saved" toast; push denied leaves the inbox and email (P2 fallback).
 */
export default function NotificationSettings() {
	const t = useTranslations('alerts');
	const { me, gate } = useRequireAuth();
	const { data: prefs, isLoading, isFetching, refetch } = useGetPrefsQuery(gate === 'signin' ? skipToken : undefined);
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<>
			<Stack.Screen options={{ title: t('channels_title') }} />
			<ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-8 pt-6">
				{prefs ? (
					<>
						<Channels prefs={prefs} me={me} />
						<QuietHours prefs={prefs} />
					</>
				) : isLoading || gate === 'loading' ? (
					<Loading />
				) : (
					<InlineError retrying={isFetching} onRetry={() => void refetch()} />
				)}
			</ScrollView>
		</>
	);
}
