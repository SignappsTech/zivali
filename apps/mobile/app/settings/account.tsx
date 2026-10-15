import { Redirect, Stack, useRouter } from 'expo-router';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { skipToken } from '@reduxjs/toolkit/query';

import { useRequireAuth } from '@zivali/api/auth';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { Me } from '@zivali/types';
import { UpdateMeInput } from '@zivali/validation/me.schema';
import { useErrorText } from '@/components/auth/parts';
import { LanguageRow } from '@/components/shell/language';
import { MenuRow } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

/** Account (P13 profile, AC: name, language, home area with the alert radius, optional phone). */
export default function AccountSettings() {
	const t = useTranslations('profile');
	const { me, gate } = useRequireAuth();
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<>
			<Stack.Screen options={{ title: t('nav_account') }} />
			{me ? <AccountForm me={me} /> : <View className="flex-1 bg-background" />}
		</>
	);
}

const validPhone = (phone: string) => UpdateMeInput.shape.phone.safeParse(phone).success;

function AccountForm({ me }: { me: Me }) {
	const t = useTranslations();
	const router = useRouter();
	const errorText = useErrorText();
	const [name, setName] = React.useState(me.display_name ?? '');
	const [phone, setPhone] = React.useState(me.phone ?? '');
	const [errors, setErrors] = React.useState<{ name?: string; phone?: string }>({});
	const [updateMe, { isLoading }] = useUpdateMeMutation();
	const { data: place } = useReversePlaceQuery(me.home ?? skipToken);

	const save = async () => {
		const next = {
			name: name.trim() ? undefined : t('auth.error_name_required'),
			phone: !phone.trim() || validPhone(phone) ? undefined : t('profile.phone_invalid'),
		};
		setErrors(next);
		if (next.name || next.phone) return;
		try {
			await updateMe({ display_name: name.trim(), phone: phone.trim() || null }).unwrap();
			toast.success(t('profile.saved'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};

	return (
		<ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 pb-8 pt-6">
			<FormField
				label={t('profile.name_label')}
				hint={errors.name ? undefined : t('profile.name_help')}
				error={errors.name}
			>
				<Input
					value={name}
					onChangeText={(value) => {
						setName(value);
						setErrors((current) => ({ ...current, name: undefined }));
					}}
					maxLength={60}
					autoComplete="name"
					textContentType="name"
					autoCapitalize="words"
				/>
			</FormField>
			<FormField
				label={t('profile.row_phone')}
				hint={errors.phone ? undefined : t('profile.phone_help')}
				error={errors.phone}
			>
				<Input
					value={phone}
					onChangeText={(value) => {
						setPhone(value);
						setErrors((current) => ({ ...current, phone: undefined }));
					}}
					keyboardType="phone-pad"
					autoComplete="tel"
					textContentType="telephoneNumber"
				/>
			</FormField>
			<Button size="lg" loading={isLoading} onPress={save}>
				{t('common.save')}
			</Button>
			<View className="mt-4 gap-3">
				<LanguageRow />
				<MenuRow
					icon={<Icon as={MapPinIcon} size={24} />}
					title={t('profile.row_home_area')}
					description={
						me.home
							? t('alerts.area_value', {
									place: place?.label ?? t('location.address_unknown'),
									radius: me.home_radius_km,
								})
							: t('alerts.area_none')
					}
					onPress={() => router.push('/settings/home-area')}
				/>
			</View>
		</ScrollView>
	);
}
