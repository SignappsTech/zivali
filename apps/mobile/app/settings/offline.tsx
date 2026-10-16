import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useFormatter, useTranslations } from 'use-intl';

import { useUpdatedTime } from '@/components/browse/list-sheet';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { cacheBytes, cacheSettings, lastSyncAt, setMobilePhotos } from '@/lib/offline/sync';
import { wipeLocalData } from '@/lib/offline/wipe';

type Usage = { bytes: number; lastSyncAt: number | null };

const Value = ({ children }: { children: React.ReactNode }) => (
	<Text className="text-muted-foreground" style={{ fontVariant: ['tabular-nums'] }}>
		{children}
	</Text>
);

/** A label with its value under it, read as one (P13 rows). */
function ValueRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<View accessible className="gap-1">
			<Text className="font-sans-bold">{label}</Text>
			{children}
		</View>
	);
}

function Updated({ at }: { at: number }) {
	return <Value>{useUpdatedTime(at)}</Value>;
}

/**
 * Settings → Offline data (C17 §Sync, FR-041 R-041.3): what the report cache holds on this phone and when it was last
 * updated, the mobile-data switch for its photos (off by default) and "Clear offline data" (the user_request wipe:
 * the cache, its photos and the drafts; the outbox stays). Works offline: it reads only the device.
 */
export default function OfflineDataSettings() {
	const t = useTranslations('profile');
	const tc = useTranslations('common');
	const te = useTranslations('errors');
	const format = useFormatter();
	const [usage, setUsage] = React.useState<Usage>();
	const [mobilePhotos, setMobilePhotosState] = React.useState(() => cacheSettings().mobilePhotos);
	const [clearing, setClearing] = React.useState(false);

	const load = React.useCallback(
		() =>
			Promise.all([cacheBytes(), lastSyncAt()])
				.then(([bytes, at]) => setUsage({ bytes, lastSyncAt: at }))
				.catch(() => setUsage({ bytes: 0, lastSyncAt: null })),
		[]
	);
	React.useEffect(() => {
		void load();
	}, [load]);

	const toggle = (on: boolean) => {
		setMobilePhotos(on);
		setMobilePhotosState(on);
	};
	const clear = async () => {
		setClearing(true);
		try {
			await wipeLocalData({ reason: 'user_request' });
			toast.success(t('offline_cleared'));
		} catch {
			toast.error(te('INTERNAL'));
		} finally {
			setClearing(false);
			void load();
		}
	};

	const mb = (usage?.bytes ?? 0) / (1024 * 1024);
	return (
		<ScrollView contentContainerClassName="px-5 pb-8 pt-6">
			<Stack.Screen options={{ title: t('row_offline') }} />
			<Text>{t('offline_body')}</Text>
			<View className="mt-7 gap-5">
				<ValueRow label={t('offline_size')}>
					{usage ? (
						<Value>
							{t('offline_size_value', { size: format.number(mb, { maximumFractionDigits: 1 }) })}
						</Value>
					) : (
						<Skeleton className="h-5 w-20" />
					)}
				</ValueRow>
				<ValueRow label={t('offline_updated')}>
					{!usage ? (
						<Skeleton className="h-5 w-24" />
					) : usage.lastSyncAt === null ? (
						<Value>{t('offline_updated_never')}</Value>
					) : (
						<Updated at={usage.lastSyncAt} />
					)}
				</ValueRow>
			</View>
			<View className="mt-7">
				<Switch label={t('offline_mobile_photos')} checked={mobilePhotos} onCheckedChange={toggle} />
				<Text className="text-sm text-muted-foreground">{t('offline_mobile_photos_help')}</Text>
			</View>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant="secondary" className="mt-10 self-start" loading={clearing}>
						{t('offline_clear')}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogTitle>{t('offline_clear_title')}</AlertDialogTitle>
					<AlertDialogDescription>{t('offline_clear_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction onPress={clear}>{t('offline_clear_confirm')}</AlertDialogAction>
						<AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ScrollView>
	);
}
