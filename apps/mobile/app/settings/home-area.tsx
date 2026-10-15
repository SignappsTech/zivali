import { Redirect, Stack, useRouter } from 'expo-router';
import { getRandomValues } from 'expo-crypto';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useRequireAuth } from '@zivali/api/auth';
import { usePlaceSearch } from '@zivali/api/geocode';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { Me, Place } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';
import { useErrorText } from '@/components/auth/parts';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';

/** Alert radius choices within the API's 1–25 km (C3). */
const RADII = [1, 2, 3, 5, 10, 15, 20, 25];
// coarsenPoint's default needs a global crypto, which Hermes lacks; expo-crypto supplies the same random source.
const random = () => getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

/** Home area and alert radius (P13 profile row; P5 copy). Place search until the mobile LocationPicker (TASK-15.5). */
export default function HomeAreaSettings() {
	const t = useTranslations('location');
	const { me, gate } = useRequireAuth();
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<>
			<Stack.Screen options={{ title: t('title_home') }} />
			{me ? <HomeAreaForm me={me} /> : <View className="flex-1 bg-background" />}
		</>
	);
}

function HomeAreaForm({ me }: { me: Me }) {
	const t = useTranslations();
	const router = useRouter();
	const errorText = useErrorText();
	const [query, setQuery] = React.useState('');
	const [place, setPlace] = React.useState<Place>();
	const [radius, setRadius] = React.useState(String(me.home_radius_km));
	const search = usePlaceSearch(query, me.home ?? undefined);
	const [updateMe, { isLoading }] = useUpdateMeMutation();

	const save = async () => {
		try {
			// C6: the chosen point is coarsened once, here; only that is sent and stored.
			const home = place ? coarsenPoint(place, random) : undefined;
			await updateMe({ home_radius_km: Number(radius), ...(home && { home }) }).unwrap();
			toast.success(t('profile.saved'));
			router.back();
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};

	const key = (p: Place) => `${p.lat},${p.lng}`;
	return (
		<ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 pb-8 pt-6">
			<FormField label={t('location.search_label')}>
				<Input
					value={query}
					onChangeText={setQuery}
					placeholder={t('location.search_placeholder')}
					autoCorrect={false}
					returnKeyType="search"
				/>
			</FormField>
			{search.isFetching ? (
				<Text aria-live="polite" className="text-muted-foreground">
					{t('location.searching')}
				</Text>
			) : query.trim().length >= 3 && search.places.length === 0 ? (
				<Text aria-live="polite" className="text-muted-foreground">
					{t('location.no_results')}
				</Text>
			) : null}
			{search.places.length > 0 ? (
				<RadioGroup
					aria-label={t('location.search_label')}
					value={place && key(place)}
					onValueChange={(value) => setPlace(search.places.find((p) => key(p) === value))}
					className="gap-3"
				>
					{search.places.map((p) => (
						<ChoiceRow key={key(p)} value={key(p)} title={p.label} />
					))}
				</RadioGroup>
			) : null}
			<FormField label={t('location.alert_radius_label')} hint={t('location.alert_radius_help')}>
				<Select value={radius} onValueChange={setRadius}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent closeLabel={t('common.close')}>
						{RADII.map((km) => (
							<SelectItem key={km} value={String(km)}>
								{t('location.alert_radius_value', { km })}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>
			<Text className="text-sm text-muted-foreground">{t('location.privacy_alert')}</Text>
			<Button size="lg" loading={isLoading} disabled={!place && !me.home} onPress={save}>
				{t('location.save_area')}
			</Button>
		</ScrollView>
	);
}
