'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useRequireAuth } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { Me } from '@zivali/types';
import { ResendButton, useErrorText } from '@/components/auth/parts';
import { InlineError, PageSkeleton, useLanguageLabels } from '@/components/shell/page';
import { LanguageSwitch, SignOutButton } from '@/components/shell/parts';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { resendConfirmation } from '@/lib/auth';

const sectionTitle = 'font-display text-xl leading-7 font-semibold tracking-[-0.005em]';

/**
 * The account page (FR-001 AC#3): name and optional phone, language, home area (changed on the alerts page), the
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
	const languages = useLanguageLabels();
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
				<LanguageSwitch labels={languages} full className="mt-2 -ml-1.5" />
			</section>

			<HomeArea me={me} />

			<SignOutButton className={buttonVariants({ variant: 'secondary', className: 'justify-self-start' })}>
				{t('profile.sign_out')}
			</SignOutButton>
		</div>
	);
}

/** The home area is one thing with the alerts: shown here, changed only on the alerts page. */
function HomeArea({ me }: { me: Me }) {
	const t = useTranslations();
	const { data: current } = useReversePlaceQuery(me.home ?? { lat: 0, lng: 0 }, { skip: !me.home });

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
			<Button asChild variant="text" className="-ml-3 mt-2">
				<Link href="/account/alerts">{t('alerts.area_change')}</Link>
			</Button>
		</section>
	);
}
