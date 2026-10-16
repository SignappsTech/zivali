import { skipToken } from '@reduxjs/toolkit/query';
import { Redirect, Stack, useRouter } from 'expo-router';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslations } from 'use-intl';

import {
	alertsApi,
	useDeleteAlertSubscriptionMutation,
	useGetAlertSubscriptionQuery,
	useSaveAlertSubscriptionMutation,
} from '@zivali/api/alerts';
import { useRequireAuth } from '@zivali/api/auth';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { ApiStore } from '@zivali/api/rtk';
import { type AlertSubscription, type AlertSubscriptionInput, type Me, SPECIES } from '@zivali/types';
import { AuthGate } from '@/components/auth/gate';
import { useErrorText } from '@/components/auth/parts';
import { nearest, RADII } from '@/components/location/location-picker';
import { RadiusSlider } from '@/components/location/radius-slider';
import { InlineError, Loading } from '@/components/notifications/notifications-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Pill } from '@/components/ui/pill';
import { toast } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { alertInput, newAlerts, trackOptIn } from '@/lib/alerts';

const STOPS_M = RADII.alert.stops; // the picker's alert stops, 1 to 25 km

type SwitchRowProps = { label: string; help: string; checked: boolean; onCheckedChange(on: boolean): void };

/** A switch row with its help line under it (read as the hint). */
function SwitchRow({ help, ...props }: SwitchRowProps) {
	return (
		<View>
			<Switch {...props} aria-label={props.label} accessibilityHint={help} />
			<Text className="text-sm text-muted-foreground">{help}</Text>
		</View>
	);
}

/** The P13 radius slider: shows each stop while dragged, saves the one let go at. */
function Radius({ km, onSave }: { km: number; onSave(km: number): void }) {
	const t = useTranslations('alerts');
	const [index, setIndex] = React.useState(() => nearest(STOPS_M, km * 1000));
	const value = t('radius_value', { km: STOPS_M[index]! / 1000 });
	return (
		<View>
			<View className="flex-row items-baseline justify-between gap-3">
				<Label>{t('radius_label')}</Label>
				<Text aria-hidden className="font-sans-bold text-control">
					{value}
				</Text>
			</View>
			<RadiusSlider
				label={t('radius_label')}
				valueText={value}
				count={STOPS_M.length}
				index={index}
				onChange={setIndex}
				onChangeEnd={(end) => STOPS_M[end]! / 1000 !== km && onSave(STOPS_M[end]! / 1000)}
			/>
		</View>
	);
}

function AlertsForm({ me, sub }: { me: Me; sub: AlertSubscription | null }) {
	const t = useTranslations();
	const router = useRouter();
	const errorText = useErrorText();
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const [save, saving] = useSaveAlertSubscriptionMutation();
	const [remove, removing] = useDeleteAlertSubscriptionMutation();
	const [updateMe] = useUpdateMeMutation();
	const [verify, setVerify] = React.useState(false);
	// A change on its way shows at once; its reply then replaces the cached subscription, so nothing flashes back.
	const current: AlertSubscriptionInput | null = removing.isLoading
		? null
		: saving.isLoading && saving.originalArgs
			? saving.originalArgs
			: sub;
	const { data: place } = useReversePlaceQuery(current?.center ?? skipToken);

	/** Saves (or with null deletes) the subscription. */
	const write = async (next: AlertSubscriptionInput | null, { optIn = false, radius = false } = {}) => {
		try {
			const saved = next ? await save(next).unwrap() : null;
			if (!next) await remove().unwrap();
			dispatch(alertsApi.util.upsertQueryData('getAlertSubscription', undefined, saved));
			if (next && optIn) trackOptIn(next.species);
			// One home area: the profile keeps the same radius.
			if (next && radius) await updateMe({ home_radius_km: next.radius_km }).unwrap();
			toast.success(t('profile.saved'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	// Runs once the account is confirmed (the P16 gate); without a home area the picker comes first and turns them on.
	const turnOn = () => {
		if (me.home) void write(newAlerts(me.home, me.home_radius_km), { optIn: true });
		else router.push({ pathname: '/settings/home-area', params: { subscribe: '1' } });
	};

	return (
		<>
			<SwitchRow
				label={t('alerts.master_label')}
				help={t('alerts.master_help')}
				checked={current !== null}
				onCheckedChange={(on) => (on ? setVerify(true) : void write(null))}
			/>
			{current ? (
				<>
					<View className="flex-row items-center gap-3">
						<View className="min-w-0 flex-1">
							<Label>{t('alerts.area_label')}</Label>
							<Text>
								{t('alerts.area_value', {
									place: place?.label ?? t('location.address_unknown'),
									radius: current.radius_km,
								})}
							</Text>
						</View>
						<Button variant="text" className="-mr-3" onPress={() => router.push('/settings/home-area')}>
							{t('alerts.area_change')}
							<Icon as={CaretRightIcon} />
						</Button>
					</View>
					<Radius
						// A saved or refused change re-reads the stored radius.
						key={current.radius_km}
						km={current.radius_km}
						onSave={(radius_km) => void write(alertInput(current, { radius_km }), { radius: true })}
					/>
					<View role="group" aria-label={t('alerts.species_label')}>
						<Label className="mb-2">{t('alerts.species_label')}</Label>
						<View className="flex-row flex-wrap gap-2">
							{SPECIES.map((species) => {
								const on = current.species.includes(species);
								return (
									<Pill
										key={species}
										selected={on}
										// At least one: the only chosen animal stays chosen.
										disabled={on && current.species.length === 1}
										onPress={() =>
											void write(
												alertInput(current, {
													species: SPECIES.filter((s) =>
														s === species ? !on : current.species.includes(s)
													),
												})
											)
										}
									>
										{t(species === 'dog' ? 'alerts.species_dogs' : 'alerts.species_cats')}
									</Pill>
								);
							})}
						</View>
					</View>
					<SwitchRow
						label={t('alerts.pause_label')}
						help={t('alerts.pause_help')}
						checked={current.paused}
						onCheckedChange={(paused) => void write(alertInput(current, { paused }))}
					/>
				</>
			) : null}
			{/* Unconfirmed email: "Potrdite svoj e-naslov" first (the API takes verified accounts only). */}
			<AuthGate reason="alerts" open={verify} onOpenChange={setVerify} onReady={turnOn} />
		</>
	);
}

/**
 * P13 "Opozorila v bližini" (settings stack, FR-010): the master switch; when on, the home area (P5 picker), the radius,
 * the animals and pause. Every change saves at once with the "Shranjeno." toast. Channels and quiet hours live in
 * "Kako vas obvestimo" (settings/notifications); the area is the profile's home area (settings/home-area).
 */
export default function AlertSettings() {
	const t = useTranslations('alerts');
	const { me, gate } = useRequireAuth();
	const { data, isLoading, isFetching, refetch } = useGetAlertSubscriptionQuery(
		gate === 'signin' ? skipToken : undefined
	);
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<>
			<Stack.Screen options={{ title: t('title') }} />
			<ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-6">
				{me && data !== undefined ? (
					<AlertsForm me={me} sub={data} />
				) : isLoading || gate === 'loading' ? (
					<Loading />
				) : (
					<InlineError retrying={isFetching} onRetry={() => void refetch()} />
				)}
			</ScrollView>
		</>
	);
}
