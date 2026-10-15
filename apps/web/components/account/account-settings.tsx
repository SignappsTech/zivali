'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useRequireAuth } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { usePlaceSearch, useReversePlaceQuery } from '@zivali/api/geocode';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { Me, Place } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';
import { ResendButton, useErrorText } from '@/components/auth/parts';
import { InlineError, PageSkeleton } from '@/components/shell/page';
import { LanguageSwitch, SignOutButton } from '@/components/shell/parts';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { resendConfirmation } from '@/lib/auth';

/** Alert radius choices within the API's 1–25 km (C3), as on mobile. */
const RADII = [1, 2, 3, 5, 10, 15, 20, 25];
const sectionTitle = 'font-display text-xl leading-7 font-semibold tracking-[-0.005em]';

/**
 * The account page (FR-001 AC#3): name and optional phone, language, home area with the default alert radius, the
 * address and its confirmation, sign out. The phone is private: only the owner sees it here, and the API never
 * returns it to anyone else (C3). The server guard has let only a real account in; this waits for GET /v1/me.
 */
export function AccountSettings() {
	const t = useTranslations('common');
	const { me, gate } = useRequireAuth();

	return (
		<>
			{me ? <AccountForm me={me} /> : gate === 'error' ? <InlineError /> : <PageSkeleton />}
			<Toaster closeLabel={t('close')} label={t('toasts_label')} />
		</>
	);
}

function AccountForm({ me }: { me: Me }) {
	const t = useTranslations();
	const locale = useLocale();
	const errorText = useErrorText();
	const [name, setName] = React.useState(me.display_name ?? '');
	const [phone, setPhone] = React.useState(me.phone ?? '');
	const [errors, setErrors] = React.useState<{ name?: string; phone?: string }>({});
	const [updateMe, { isLoading }] = useUpdateMeMutation();

	const save = async (event: React.FormEvent) => {
		event.preventDefault();
		const nameError = name.trim() ? undefined : t('auth.error_name_required');
		setErrors({ name: nameError });
		if (nameError) return;
		try {
			await updateMe({ display_name: name.trim(), phone: phone.trim() || null }).unwrap();
			toast.success(t('profile.saved'));
		} catch (failure) {
			// The API checks the number (C3 UpdateMeInput); its issue points at the field.
			if (failure instanceof ApiError && failure.issues?.some((issue) => issue.path === 'phone'))
				setErrors({ phone: t('profile.phone_invalid') });
			else toast.error(errorText(failure));
		}
	};

	return (
		<div className="mt-8 grid max-w-[560px] gap-12 lg:mt-10">
			<section aria-labelledby="account-email">
				<h2 id="account-email" className={sectionTitle}>
					{t('auth.email_label')}
				</h2>
				<p className="mt-2 text-lg break-words">{me.email}</p>
				<p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
					{me.email_verified ? (
						<CheckCircleIcon weight="fill" aria-hidden="true" className="size-4 text-primary" />
					) : (
						<WarningCircleIcon weight="fill" aria-hidden="true" className="size-4 text-muted-foreground" />
					)}
					{t(me.email_verified ? 'profile.email_verified' : 'profile.email_unverified')}
				</p>
				{!me.email_verified && me.email && (
					<div className="mt-3 grid justify-items-start">
						<ResendButton
							label={t('profile.email_send_link')}
							onResend={(captchaToken) => resendConfirmation(me.email!, locale, captchaToken)}
						/>
					</div>
				)}
			</section>

			<form noValidate onSubmit={save} className="grid gap-6">
				<FormField label={t('profile.name_label')} hint={t('profile.name_help')} error={errors.name}>
					<Input
						name="name"
						autoComplete="nickname"
						maxLength={60}
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setErrors((current) => ({ ...current, name: undefined }));
						}}
					/>
				</FormField>
				<FormField label={t('profile.row_phone')} hint={t('profile.phone_help')} error={errors.phone}>
					<Input
						type="tel"
						name="phone"
						autoComplete="tel"
						inputMode="tel"
						value={phone}
						onChange={(event) => {
							setPhone(event.target.value);
							setErrors((current) => ({ ...current, phone: undefined }));
						}}
					/>
				</FormField>
				<Button type="submit" size="lg" className="justify-self-start" loading={isLoading}>
					{t('common.save')}
				</Button>
			</form>

			<section aria-labelledby="account-language">
				<h2 id="account-language" className={sectionTitle}>
					{t('profile.row_language')}
				</h2>
				<LanguageSwitch full className="mt-2 -ml-1.5" />
			</section>

			<HomeArea me={me} />

			<SignOutButton className={buttonVariants({ variant: 'secondary', className: 'justify-self-start' })}>
				{t('profile.sign_out')}
			</SignOutButton>
		</div>
	);
}

/** Home area and the default alert radius (P5 copy). Place search until the web LocationPicker; C6: coarsened once. */
function HomeArea({ me }: { me: Me }) {
	const t = useTranslations();
	const errorText = useErrorText();
	const [query, setQuery] = React.useState('');
	const [place, setPlace] = React.useState<Place>();
	const [radius, setRadius] = React.useState(String(me.home_radius_km));
	const search = usePlaceSearch(query, me.home ?? undefined);
	const { data: current } = useReversePlaceQuery(me.home ?? { lat: 0, lng: 0 }, { skip: !me.home });
	const [updateMe, { isLoading }] = useUpdateMeMutation();
	const key = (p: Place) => `${p.lat},${p.lng}`;

	const save = async (event: React.FormEvent) => {
		event.preventDefault();
		try {
			// C6: the chosen point is coarsened once, here; only that is sent and stored.
			const home = place ? coarsenPoint(place) : undefined;
			await updateMe({ home_radius_km: Number(radius), ...(home && { home }) }).unwrap();
			setPlace(undefined);
			setQuery('');
			toast.success(t('profile.saved'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};

	return (
		<section aria-labelledby="account-home">
			<h2 id="account-home" className={sectionTitle}>
				{t('profile.row_home_area')}
			</h2>
			<p className="mt-2">
				{me.home
					? `${t('alerts.area_value', {
							place: current?.label ?? t('location.address_unknown'),
							radius: me.home_radius_km,
						})} (${t('location.approximate_label')})`
					: t('alerts.area_none')}
			</p>
			<form noValidate onSubmit={save} className="mt-6 grid gap-6">
				<FormField label={t('location.search_label')}>
					<Input
						type="search"
						autoComplete="off"
						placeholder={t('location.search_placeholder')}
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</FormField>
				<p aria-live="polite" className="text-muted-foreground empty:hidden">
					{search.isFetching
						? t('location.searching')
						: query.trim().length >= 3 && search.places.length === 0
							? t('location.no_results')
							: null}
				</p>
				{search.places.length > 0 && (
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
				)}
				<FormField label={t('location.alert_radius_label')} hint={t('location.alert_radius_help')}>
					<Select value={radius} onValueChange={setRadius}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{RADII.map((km) => (
								<SelectItem key={km} value={String(km)}>
									{t('location.alert_radius_value', { km })}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
				<p className="text-sm text-muted-foreground">{t('location.privacy_alert')}</p>
				<Button
					type="submit"
					size="lg"
					className="justify-self-start"
					loading={isLoading}
					disabled={!place && !me.home}
				>
					{t('location.save_area')}
				</Button>
			</form>
		</section>
	);
}
