import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import en from '@zivali/i18n/dist/en.json';
import { formatDate, type Locale } from '@zivali/i18n/format';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/sonner';
import { Text, TextClassContext } from '@/components/ui/text';
import { manageTokenKey, type OutboxItem, removePending, sendPending, useOutbox } from '@/lib/offline/outbox';
import { cn } from '@/lib/utils';

// Outbox queue UI (P7 §Waiting to send, mockup C6; FR-042): rows with status words, the sign-out prompt (C17 §Wipe).

/** Rows sent before this app start leave the Map tab group (P7 C6: "sent rows leave after the next app open"). */
const launchedAt = Date.now();

type Shown = 'waiting' | 'sending' | 'sent' | 'failed';
/** Status word: icon + word + colour (system §10.5); a needs-action item is stuck like a failed one. */
const looks: Record<Shown, { icon?: PhosphorIcon; className: string }> = {
	waiting: { icon: ClockIcon, className: 'text-foreground' },
	sending: { className: 'text-muted-foreground' },
	sent: { icon: CheckCircleIcon, className: 'text-primary' },
	failed: { icon: WarningCircleIcon, className: 'text-destructive' },
};
const shown = ({ status }: OutboxItem): Shown =>
	status === 'queued' ? 'waiting' : status === 'needs_action' ? 'failed' : status;

type Actions = Pick<ReturnType<typeof useOutbox>, 'retry' | 'remove'>;

/** Pet-row shape (system §10): photo 64, title, status word and time; stuck: reason, Retry, Delete; sent: manage link. */
function OutboxRow({ item, retry, remove }: { item: OutboxItem } & Actions) {
	const t = useTranslations('report_found');
	const locale = useLocale() as Locale;
	const router = useRouter();
	const tErrors = useTranslations('errors');
	const [token, setToken] = React.useState<string | null>(null);
	const reportId = item.status === 'sent' ? item.result.report_id : null;
	React.useEffect(() => {
		if (!reportId) return;
		let live = true;
		SecureStore.getItemAsync(manageTokenKey(reportId))
			.then((value) => live && setToken(value))
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [reportId]);
	const state = shown(item);
	const look = looks[state];
	// The C1 code's message (errors.<code>); the cancelled Turnstile sheet reads as the failed check.
	const code = item.last_error_code === 'CAPTCHA_REQUIRED' ? 'CAPTCHA_FAILED' : (item.last_error_code ?? '');
	return (
		<View role="listitem" className={cn('flex-row gap-4', state === 'failed' ? 'items-start' : 'items-center')}>
			{item.photo ? (
				<Image aria-hidden source={{ uri: item.photo }} className="size-16 rounded-row bg-muted" />
			) : (
				<View aria-hidden className="size-16 items-center justify-center rounded-row bg-muted">
					<Icon as={PawPrintIcon} size={24} className="text-muted-foreground" />
				</View>
			)}
			<View className="min-w-0 flex-1">
				{/* One stop for the screen reader; a new status word is announced (AC #3). */}
				<View accessible role="status" aria-live="polite">
					<Text className="font-display-semibold text-xl tracking-[-0.2px]">
						{t(`species_${item.payload.species}`)}
					</Text>
					<View className="mt-1 flex-row flex-wrap items-center gap-x-2">
						<TextClassContext.Provider value={cn('font-sans-bold text-sm', look.className)}>
							<View className="flex-row items-center gap-[5px]">
								{look.icon ? (
									<Icon as={look.icon} size={16} weight={state === 'waiting' ? 'bold' : 'fill'} />
								) : (
									<ActivityIndicator size="small" aria-hidden className="text-muted-foreground" />
								)}
								<Text>{t(`outbox_${state}`)}</Text>
							</View>
						</TextClassContext.Provider>
						<Text className="text-sm text-muted-foreground" style={{ fontVariant: ['tabular-nums'] }}>
							{formatDate(item.created_at, locale, 'time')}
						</Text>
					</View>
					{state === 'failed' ? (
						<Text className="mt-1 text-sm text-muted-foreground">
							{tErrors(code in en.errors ? (code as keyof typeof en.errors) : 'INTERNAL')}
						</Text>
					) : null}
				</View>
				{state === 'failed' ? (
					<View className="-ml-3 mt-1 flex-row items-center gap-1">
						<Button variant="text" onPress={() => void retry(item.id)}>
							<Icon as={ArrowClockwiseIcon} />
							{t('outbox_retry')}
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label={t('outbox_delete')}
							onPress={() => void remove(item.id)}
						>
							<Icon as={TrashIcon} />
						</Button>
					</View>
				) : null}
				{token ? (
					<Button variant="text" className="-ml-3 mt-1 self-start" onPress={() => router.push(`/m#${token}`)}>
						{t('open_report')}
					</Button>
				) : null}
			</View>
		</View>
	);
}

/**
 * The outbox, newest first; renders nothing while it is empty. `recent` (Map tab) leaves out rows sent before this
 * app start; `heading` (Profile → My reports) shows a section title.
 */
export function OutboxList({
	recent = false,
	heading,
	className,
}: {
	recent?: boolean;
	heading?: string;
	className?: string;
}) {
	const t = useTranslations('report_found');
	const { items, retry, remove } = useOutbox();
	const rows = recent ? items.filter((item) => item.status !== 'sent' || item.updated_at >= launchedAt) : items;
	if (rows.length === 0) return null;
	return (
		<View className={className}>
			{heading ? (
				<Text role="heading" className="mb-5 font-display-semibold text-xl tracking-[-0.2px]">
					{heading}
				</Text>
			) : null}
			<View role="list" aria-label={heading ?? t('outbox_title')} className="gap-5">
				{rows.map((item) => (
					<OutboxRow key={item.id} item={item} retry={retry} remove={remove} />
				))}
			</View>
		</View>
	);
}

/**
 * `resolvePending` for signOutAndWipe (and account deletion, C17 §Wipe) with its dialog, which the caller renders:
 * "Send now" goes on only once every item is sent, "Delete" removes the unsent ones, "Cancel" or back stops.
 */
export function usePendingPrompt(): { resolvePending: (count: number) => Promise<boolean>; prompt: React.ReactNode } {
	const t = useTranslations();
	const [count, setCount] = React.useState(0);
	const [busy, setBusy] = React.useState<'send' | 'delete' | null>(null);
	const answer = React.useRef<((go: boolean) => void) | null>(null);
	const resolvePending = React.useCallback(
		(pending: number) =>
			new Promise<boolean>((resolve) => {
				answer.current = resolve;
				setCount(pending);
			}),
		[]
	);
	const finish = (go: boolean) => {
		answer.current?.(go);
		answer.current = null;
		setCount(0);
		setBusy(null);
	};
	const act = async (kind: 'send' | 'delete') => {
		const asked = answer.current;
		setBusy(kind);
		let go = false;
		try {
			if (kind === 'send') {
				go = (await sendPending()) === 0;
				if (!go) toast.error(t('report_found.outbox_send_failed'));
			} else {
				await removePending();
				go = true;
			}
		} catch {
			toast.error(t('errors.INTERNAL'));
		}
		// Cancelled while it ran: that answer stands.
		if (answer.current === asked) finish(go);
	};
	const prompt = (
		<AlertDialog open={count > 0} onOpenChange={(open) => !open && finish(false)}>
			<AlertDialogContent>
				<AlertDialogTitle>{t('report_found.outbox_pending_title', { count })}</AlertDialogTitle>
				<AlertDialogDescription>{t('report_found.outbox_pending_body')}</AlertDialogDescription>
				<AlertDialogFooter>
					<Button loading={busy === 'send'} disabled={busy === 'delete'} onPress={() => void act('send')}>
						{t('report_found.outbox_send_now')}
					</Button>
					<Button
						variant="secondary"
						loading={busy === 'delete'}
						disabled={busy === 'send'}
						onPress={() => void act('delete')}
					>
						{t('report_found.outbox_delete')}
					</Button>
					<AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
	return { resolvePending, prompt };
}
