import { skipToken } from '@reduxjs/toolkit/query';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useGetAlertSubscriptionQuery, useSaveAlertSubscriptionMutation } from '@zivali/api/alerts';
import { useRequireAuth } from '@zivali/api/auth';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { AlertSubscription, Me } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { LocationPicker, type LocationValue, RADII } from '@/components/location/location-picker';
import { InlineError, Loading } from '@/components/notifications/notifications-view';
import { toast } from '@/components/ui/sonner';
import { alertInput, newAlerts, samePoint, trackOptIn } from '@/lib/alerts';

/**
 * The home area and its radius: the P5 picker in alert mode, from the account row and the alert settings. One area for
 * the profile (account row, offline home cache, C17) and the nearby-alert subscription (C10): a save writes both, so
 * they never disagree. `?subscribe=1` (alerts turned on before there was an area) creates the subscription too.
 */
export default function HomeAreaSettings() {
	const { me, gate } = useRequireAuth();
	const { subscribe } = useLocalSearchParams<{ subscribe?: string }>();
	const { data, isFetching, refetch } = useGetAlertSubscriptionQuery(gate === 'signin' ? skipToken : undefined);
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<>
			{/* The picker brings its own question as the heading. */}
			<Stack.Screen options={{ title: '' }} />
			{me && data !== undefined ? (
				<HomeAreaPicker me={me} sub={data} subscribe={subscribe === '1'} />
			) : (
				<View className="flex-1 bg-background px-5 pt-6">
					{isFetching || gate === 'loading' ? (
						<Loading />
					) : (
						<InlineError retrying={isFetching} onRetry={() => void refetch()} />
					)}
				</View>
			)}
		</>
	);
}

function HomeAreaPicker({ me, sub, subscribe }: { me: Me; sub: AlertSubscription | null; subscribe: boolean }) {
	const t = useTranslations('profile');
	const router = useRouter();
	const errorText = useErrorText();
	const [updateMe] = useUpdateMeMutation();
	const [save] = useSaveAlertSubscriptionMutation();
	const stored = sub
		? { point: sub.center, radiusM: sub.radius_km * 1000 }
		: me.home
			? { point: me.home, radiusM: me.home_radius_km * 1000 }
			: undefined;

	// The picker hands back the stored point unchanged when it was not moved, else a new one coarsened once (C6); the
	// profile is only sent a point it does not hold already.
	const confirm = async ({ point, radiusM = RADII.alert.initial }: LocationValue) => {
		const radius_km = radiusM / 1000;
		const alerts = sub
			? alertInput(sub, { center: point, radius_km })
			: subscribe
				? newAlerts(point, radius_km)
				: null;
		try {
			await Promise.all([
				alerts && save(alerts).unwrap(),
				updateMe({ home_radius_km: radius_km, ...(!samePoint(point, me.home) && { home: point }) }).unwrap(),
			]);
			if (alerts && !sub) trackOptIn(alerts.species);
			toast.success(t('saved'));
			router.back();
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};

	return <LocationPicker mode="alert" value={stored} onChange={(value) => void confirm(value)} />;
}
