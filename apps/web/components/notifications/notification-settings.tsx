'use client';

import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { useStore } from 'react-redux';
import { toast } from 'sonner';

import { useRequireAuth } from '@zivali/api/auth';
import {
	notificationsApi,
	useGetPrefsQuery,
	useSetPrefMutation,
	useSetQuietHoursMutation,
} from '@zivali/api/notifications';
import type { ApiStore } from '@zivali/api/rtk';
import type { Me, NotificationPrefs, NotificationType } from '@zivali/types';
import { ResendButton, useErrorText } from '@/components/auth/parts';
import { InlineError, PageSkeleton } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { resendConfirmation } from '@/lib/auth';

type Channel = 'push' | 'email' | 'in_app';

/**
 * The four rows of P13 "How to tell me", each switching the C10 types it stands for. In app cannot be turned off for
 * matches and messages (P13), so those switches are locked on.
 */
const GROUPS: {
	key: string;
	label: 'type_matches' | 'type_messages' | 'type_nearby' | 'type_reminders';
	types: NotificationType[];
	locked?: boolean;
}[] = [
	{
		key: 'matches',
		label: 'type_matches',
		types: ['match_chip', 'match_suggested', 'match_confirmed'],
		locked: true,
	},
	{ key: 'messages', label: 'type_messages', types: ['chat_message'], locked: true },
	{ key: 'nearby', label: 'type_nearby', types: ['nearby_lost'] },
	{ key: 'reminders', label: 'type_reminders', types: ['report_reminder', 'report_expiring', 'report_closed'] },
];
const CHANNELS = [
	['push', 'channel_push'],
	['email', 'channel_email'],
	['in_app', 'channel_inapp'],
] as const;

const sectionTitle = 'font-display text-[22px] leading-7 font-bold tracking-[-0.01em]';

/**
 * Notification settings (FR-010, P13 sections 2 to 4 on web): a switch per row and channel, quiet hours, and the
 * unverified-email note. Each change saves at once with a "Saved." toast; push is the phone's permission, so web has
 * no permission note for it.
 */
export function NotificationSettings() {
	const t = useTranslations('common');
	const { me, gate } = useRequireAuth();
	const prefs = useGetPrefsQuery();

	let content: React.ReactNode = <PageSkeleton />;
	if (me && prefs.data) content = <Settings me={me} prefs={prefs.data} />;
	else if (prefs.isError || gate === 'error')
		content = <InlineError onRetry={() => void prefs.refetch()} retrying={prefs.isFetching} />;

	return (
		<>
			<div className="mt-8 max-w-[640px]">{content}</div>
			<Toaster closeLabel={t('close')} label={t('toasts_label')} />
		</>
	);
}

function Settings({ me, prefs }: { me: Me; prefs: NotificationPrefs }) {
	const t = useTranslations('alerts');
	const tProfile = useTranslations('profile');
	const locale = useLocale();
	const errorText = useErrorText();
	const store = useStore() as ApiStore;
	const [setPref] = useSetPrefMutation();
	const byType = new Map(prefs.items.map((item) => [item.type, item]));
	const isOn = (types: NotificationType[], channel: Channel) =>
		types.every((type) => byType.get(type)?.[channel] ?? true);

	const toggle = async (types: NotificationType[], channel: Channel, on: boolean) => {
		// Shown at once; the saved prefs are fetched again after the last request (also when one fails).
		store.dispatch(
			notificationsApi.util.updateQueryData('getPrefs', undefined, (draft) => {
				for (const item of draft.items) if (types.includes(item.type)) item[channel] = on;
			})
		);
		try {
			await Promise.all(types.map((type) => setPref({ type, body: { [channel]: on } }).unwrap()));
			toast.success(tProfile('saved'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};

	return (
		<>
			<section aria-labelledby="channels-title">
				<h2 id="channels-title" className={sectionTitle}>
					{t('channels_title')}
				</h2>
				{!me.email_verified && me.email && (
					<div
						role="note"
						className="mt-3 flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] leading-[22px]"
					>
						<EnvelopeSimpleIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
						<div className="grid justify-items-start">
							<p className="text-control">{t('email_unverified')}</p>
							<div className="-ml-3 mt-1 grid justify-items-start">
								<ResendButton
									label={t('email_resend')}
									onResend={async (captchaToken) => {
										await resendConfirmation(me.email!, locale, captchaToken);
										toast.success(t('email_sent'));
									}}
								/>
							</div>
						</div>
					</div>
				)}
				<table className="mt-4 w-full border-collapse">
					<thead>
						<tr>
							<td />
							{CHANNELS.map(([channel, label]) => (
								<th
									key={channel}
									scope="col"
									className="w-16 pb-1.5 text-center align-bottom text-[13px] leading-4 font-bold text-muted-foreground md:w-[120px] md:text-sm md:leading-5"
								>
									{t(label)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{GROUPS.map((group) => (
							<tr key={group.key}>
								<th scope="row" className="py-1 text-left text-[17px] leading-6 font-bold">
									{t(group.label)}
								</th>
								{CHANNELS.map(([channel, label]) => {
									const locked = group.locked && channel === 'in_app';
									return (
										<td key={channel} className="text-center">
											<span className="relative inline-flex h-12 items-center">
												<Switch
													aria-label={t('channel_switch_a11y', {
														type: t(group.label),
														channel: t(label),
													})}
													aria-describedby={locked ? 'locked-note' : undefined}
													checked={locked || isOn(group.types, channel)}
													disabled={locked}
													onCheckedChange={(on) => void toggle(group.types, channel, on)}
												/>
												{locked && (
													<LockSimpleIcon
														weight="fill"
														aria-hidden="true"
														className="absolute -top-px -right-1.5 size-3.5 rounded-full bg-background"
													/>
												)}
											</span>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
				<p id="locked-note" className="mt-4 flex gap-2 text-sm text-muted-foreground">
					<LockSimpleIcon weight="fill" aria-hidden="true" className="size-[18px] shrink-0" />
					<span>{t('locked_note')}</span>
				</p>
			</section>
			<QuietHours from={prefs.quiet_from} to={prefs.quiet_to} />
		</>
	);
}

const clock = (value: string | null) => (value ?? '').slice(0, 5);

/** Quiet hours (P13 §3): native time fields, saved once both are set and a field is left; "No quiet hours" clears. */
function QuietHours({ from, to }: { from: string | null; to: string | null }) {
	const t = useTranslations('alerts');
	const tProfile = useTranslations('profile');
	const errorText = useErrorText();
	const [values, setValues] = React.useState({ from: clock(from), to: clock(to) });
	const [setQuietHours] = useSetQuietHoursMutation();
	const saved = { from: clock(from), to: clock(to) };

	const save = async (next: { from: string; to: string }) => {
		try {
			await setQuietHours({ quiet_from: next.from || null, quiet_to: next.to || null }).unwrap();
			toast.success(tProfile('saved'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	const commit = () => {
		if (values.from && values.to && (values.from !== saved.from || values.to !== saved.to)) void save(values);
	};
	const field = (key: 'from' | 'to') => ({
		value: values[key],
		onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: event.target.value }),
		onBlur: commit,
	});

	return (
		<section aria-labelledby="quiet-title" className="mt-10">
			<h2 id="quiet-title" className={sectionTitle}>
				{t('quiet_title')}
			</h2>
			<div className="mt-3 max-w-[440px]">
				<div className="grid grid-cols-2 gap-5">
					<FormField label={t('quiet_from')}>
						<Input type="time" name="quiet_from" {...field('from')} />
					</FormField>
					<FormField label={t('quiet_to')}>
						<Input type="time" name="quiet_to" {...field('to')} />
					</FormField>
				</div>
				<p className="mt-3 text-sm text-muted-foreground">{t('quiet_help')}</p>
				{(saved.from || saved.to) && (
					<Button
						variant="text"
						className="mt-1 -ml-3"
						onClick={() => {
							setValues({ from: '', to: '' });
							void save({ from: '', to: '' });
						}}
					>
						{t('quiet_off')}
					</Button>
				)}
			</div>
		</section>
	);
}
