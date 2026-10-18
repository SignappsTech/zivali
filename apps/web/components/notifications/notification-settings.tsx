'use client';

import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
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
import { InlineError, PageSkeleton, ringClass } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { resendConfirmation } from '@/lib/auth';
import { cn } from '@/lib/utils';

type Channel = 'push' | 'email' | 'in_app';

/**
 * The four rows of P13 "How to tell me", each switching the C10 types it stands for. Every switch can be turned off,
 * in app for matches and messages too (TASK-114.14): all off for a row means none of its notifications.
 */
const GROUPS: {
	label: 'type_matches' | 'type_messages' | 'type_nearby' | 'type_reminders';
	types: NotificationType[];
}[] = [
	{ label: 'type_matches', types: ['match_chip', 'match_suggested', 'match_confirmed'] },
	{ label: 'type_messages', types: ['chat_message'] },
	{ label: 'type_nearby', types: ['nearby_lost'] },
	{ label: 'type_reminders', types: ['report_reminder', 'report_expiring', 'report_closed'] },
];
const CHANNELS = [
	['push', 'channel_push'],
	['email', 'channel_email'],
	['in_app', 'channel_inapp'],
] as const;

const clock = (value: string | null) => (value ?? '').slice(0, 5);

/** A row's switch is on when every type it stands for is; a type without a stored row is on. */
const isOn = (prefs: NotificationPrefs, types: NotificationType[], channel: Channel) =>
	types.every((type) => prefs.items.find((item) => item.type === type)?.[channel] ?? true);

/** The section's anchor, also in the redirect of /racun/obvestila (app/[locale]/(app)/account/notifications/page.tsx). */
const ANCHOR = 'kako-vas-obvestimo';
const subscribeHash = (onChange: () => void) => {
	window.addEventListener('hashchange', onChange);
	return () => window.removeEventListener('hashchange', onChange);
};
const targeted = () => window.location.hash === `#${ANCHOR}`;

/**
 * The closed section's grey line (TASK-114.15): the channels with a switch on, and the quiet hours when set. In the app
 * goes without saying beside the phone or email, so it is named only when it is the only one.
 */
function useSummary(prefs: NotificationPrefs | undefined) {
	const t = useTranslations('alerts');
	const format = useFormatter();
	const locale = useLocale();
	if (!prefs) return null;
	const used = CHANNELS.filter(([channel]) => GROUPS.some(({ types }) => isOn(prefs, types, channel)));
	const named = used.length > 1 ? used.filter(([channel]) => channel !== 'in_app') : used;
	// "Na telefonu in po e-pošti": the labels after the first go on in lower case.
	const labels = named.map(([, label], index) =>
		index ? t(label).charAt(0).toLocaleLowerCase(locale) + t(label).slice(1) : t(label)
	);
	const channels = labels.length ? format.list(labels, { type: 'conjunction' }) : t('channels_summary_none');
	return prefs.quiet_from && prefs.quiet_to
		? t('channels_summary_quiet', { channels, from: clock(prefs.quiet_from), to: clock(prefs.quiet_to) })
		: channels;
}

/**
 * P13 "Kako vas obvestimo" on web (FR-010, sections 2 to 4), a disclosure at the end of the alerts page (TASK-114.15):
 * closed with the summary line under its title, open when the address targets it (#kako-vas-obvestimo). Inside, a
 * switch per row and channel, quiet hours, and the unverified-email note. Each change saves at once with the alerts
 * page's "Saved." toast; push is the phone's permission, so web has no permission note for it.
 */
export function NotificationSettings() {
	const t = useTranslations('alerts');
	const { me, gate } = useRequireAuth();
	const prefs = useGetPrefsQuery();
	const summary = useSummary(prefs.data);
	// Closed on the server; the address can open it on the client, then the visitor's own toggle decides.
	const linked = React.useSyncExternalStore(subscribeHash, targeted, () => false);
	const [toggled, setToggled] = React.useState<boolean>();
	const open = toggled ?? linked;

	let content: React.ReactNode = <PageSkeleton />;
	if (me && prefs.data) content = <Settings me={me} prefs={prefs.data} />;
	else if (prefs.isError || gate === 'error')
		content = <InlineError onRetry={() => void prefs.refetch()} retrying={prefs.isFetching} />;

	return (
		<div id={ANCHOR} className="mt-8 border-t border-border">
			<h2>
				<button
					type="button"
					aria-expanded={open}
					aria-controls={`${ANCHOR}-panel`}
					aria-labelledby={`${ANCHOR}-title`}
					aria-describedby={summary && !open ? `${ANCHOR}-summary` : undefined}
					onClick={() => setToggled(!open)}
					className={cn(
						'flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-row py-2 text-left',
						ringClass
					)}
				>
					<span className="min-w-0 flex-1">
						<span id={`${ANCHOR}-title`} className="block text-[17px] leading-6 font-bold">
							{t('channels_title')}
						</span>
						{summary && !open && (
							<span id={`${ANCHOR}-summary`} className="block text-sm text-muted-foreground">
								{summary}
							</span>
						)}
					</span>
					<span className="grid size-11 shrink-0 place-items-center">
						<CaretDownIcon
							weight="bold"
							aria-hidden="true"
							className={cn('size-[22px] motion-safe:transition-transform', open && 'rotate-180')}
						/>
					</span>
				</button>
			</h2>
			<div
				id={`${ANCHOR}-panel`}
				role="region"
				aria-labelledby={`${ANCHOR}-title`}
				hidden={!open}
				className="pt-2 pb-1"
			>
				{content}
			</div>
		</div>
	);
}

function Settings({ me, prefs }: { me: Me; prefs: NotificationPrefs }) {
	const t = useTranslations('alerts');
	const tProfile = useTranslations('profile');
	const locale = useLocale();
	const errorText = useErrorText();
	const store = useStore() as ApiStore;
	const [setPref] = useSetPrefMutation();

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
			{!me.email_verified && me.email && (
				<div role="note" className="mb-4 flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] leading-[22px]">
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
			<table className="w-full border-collapse">
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
						<tr key={group.label}>
							<th scope="row" className="py-1 text-left text-[17px] leading-6 font-bold">
								{t(group.label)}
							</th>
							{CHANNELS.map(([channel, label]) => (
								<td key={channel} className="text-center">
									<span className="inline-flex h-12 items-center">
										<Switch
											aria-label={t('channel_switch_a11y', {
												type: t(group.label),
												channel: t(label),
											})}
											checked={isOn(prefs, group.types, channel)}
											onCheckedChange={(on) => void toggle(group.types, channel, on)}
										/>
									</span>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			<QuietHours from={prefs.quiet_from} to={prefs.quiet_to} />
		</>
	);
}

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
		<section aria-labelledby="quiet-title" className="mt-8">
			<h3 id="quiet-title" className="font-display text-[22px] leading-7 font-bold tracking-[-0.01em]">
				{t('quiet_title')}
			</h3>
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
