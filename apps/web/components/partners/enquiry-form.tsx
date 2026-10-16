'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { ApiError, createApiClient } from '@zivali/api/client';
import type { LeadInput, LeadInterest } from '@zivali/types';
import { useCaptcha } from '@/components/auth/turnstile';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NativeSelect } from './native-select';

// No lib/env.ts (zod) in a public page's bundle: the server validated the URL already; the fallback is its local default.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
// Captcha off (no site key: local and e2e) still needs a token for C14; the API's mock adapter accepts it.
const CAPTCHA_OFF = 'captcha-off';
const MESSAGE_MAX = 2000;
// LeadInput limits (C14); the server checks the address properly, this only catches typos.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s()./-]{6,30}$/;

const FIELDS = ['company', 'name', 'email', 'phone', 'message', 'consent'] as const;
type Field = (typeof FIELDS)[number];
type Values = { company: string; name: string; email: string; phone: string; message: string };
type Note = 'limited' | 'captcha' | 'error';

const NOTES: Record<Note, { icon: PhosphorIcon; key: 'limited' | 'captcha_failed' | 'server_error' }> = {
	limited: { icon: ClockIcon, key: 'limited' },
	captcha: { icon: ShieldWarningIcon, key: 'captcha_failed' },
	error: { icon: WarningIcon, key: 'server_error' },
};

// article.tsx's h2Class, not imported: that module pulls lib/seo and lib/env (zod) into the client bundle.
const h2Class = 'font-display text-2xl font-bold tracking-[-0.015em] text-balance lg:text-3xl';
const inlineLink =
	'font-bold text-primary underline underline-offset-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * P22 enquiry form (C14 POST /v1/leads): checked on submit, then live, first error focused; explicit consent (never
 * pre-ticked); invisible captcha whose api.js loads only with the first submit. A rate limit, a failed check or a
 * server error shows a calm note and keeps every field; success replaces the form.
 */
export function EnquiryForm({ regions }: { regions: { slug: string; name: string }[] }) {
	const t = useTranslations('partners');
	const locale = useLocale();
	const captcha = useCaptcha({ lazy: true });
	const [values, setValues] = React.useState<Values>({ company: '', name: '', email: '', phone: '', message: '' });
	const [interest, setInterest] = React.useState<LeadInterest>('unsure');
	const [region, setRegion] = React.useState('');
	const [consent, setConsent] = React.useState(false);
	const [submitted, setSubmitted] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [note, setNote] = React.useState<Note>();
	const [sentTo, setSentTo] = React.useState<string>();
	const companyRef = React.useRef<HTMLInputElement>(null);
	const nameRef = React.useRef<HTMLInputElement>(null);
	const emailRef = React.useRef<HTMLInputElement>(null);
	const phoneRef = React.useRef<HTMLInputElement>(null);
	const messageRef = React.useRef<HTMLTextAreaElement>(null);
	const consentRef = React.useRef<HTMLButtonElement>(null);
	const successRef = React.useRef<HTMLHeadingElement>(null);

	React.useEffect(() => {
		if (sentTo) successRef.current?.focus();
	}, [sentTo]);

	const problems = (): Partial<Record<Field, string>> => {
		const phone = values.phone.trim();
		const message = values.message.trim();
		return {
			company: values.company.trim() ? undefined : t('err_company'),
			name: values.name.trim() ? undefined : t('err_name'),
			email: EMAIL.test(values.email.trim()) ? undefined : t('err_email'),
			phone: !phone || PHONE.test(phone) ? undefined : t('err_phone'),
			message: !message ? t('err_message') : message.length > MESSAGE_MAX ? t('err_message_long') : undefined,
			consent: consent ? undefined : t('err_consent'),
		};
	};
	const errors = submitted ? problems() : {};

	const set = (field: keyof Values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setValues((current) => ({ ...current, [field]: event.target.value }));

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		setSubmitted(true);
		setNote(undefined);
		const found = problems();
		const invalid = FIELDS.find((field) => found[field]);
		if (invalid) {
			const refs = {
				company: companyRef,
				name: nameRef,
				email: emailRef,
				phone: phoneRef,
				message: messageRef,
				consent: consentRef,
			};
			refs[invalid].current?.focus();
			return;
		}
		const email = values.email.trim();
		setBusy(true);
		try {
			const body: LeadInput = {
				company: values.company.trim(),
				contact_name: values.name.trim(),
				email,
				phone: values.phone.trim() || undefined,
				region_interest: region || undefined,
				interest,
				message: values.message.trim(),
				consent: true,
				captcha_token: (await captcha.getToken()) ?? CAPTCHA_OFF,
				locale,
			};
			await createApiClient({ baseUrl: API_URL, locale }).request('POST', '/v1/leads', { body });
			setSentTo(email);
		} catch (failure) {
			const code = failure instanceof ApiError ? failure.code : null;
			setNote(code === 'RATE_LIMITED' ? 'limited' : code === 'CAPTCHA_FAILED' ? 'captcha' : 'error');
		} finally {
			setBusy(false);
		}
	};

	if (sentTo)
		return (
			<div role="status" className="grid justify-items-start gap-4">
				<CheckCircleIcon weight="fill" aria-hidden="true" className="size-12 text-primary" />
				<h2 ref={successRef} tabIndex={-1} className={cn(h2Class, 'outline-none')}>
					{t('success_title')}
				</h2>
				<p className="break-words">{t('success_body', { email: sentTo })}</p>
				<Button asChild variant="text" className="-ml-3">
					<a href="#main">{t('success_back')}</a>
				</Button>
			</div>
		);

	const shown = note && NOTES[note];

	return (
		<>
			<h2 className={h2Class}>{t('form_title')}</h2>
			<form noValidate onSubmit={submit} className="grid gap-6">
				{shown && (
					<div role={note === 'limited' ? 'status' : 'alert'} className={noteClass}>
						<shown.icon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
						<p className="min-w-0 flex-1">{t(shown.key)}</p>
					</div>
				)}
				<fieldset disabled={busy} className="grid min-w-0 gap-6">
					<FormField label={t('form_company')} error={errors.company}>
						<Input
							ref={companyRef}
							name="organization"
							autoComplete="organization"
							maxLength={120}
							value={values.company}
							onChange={set('company')}
						/>
					</FormField>
					<FormField label={t('form_name')} error={errors.name}>
						<Input
							ref={nameRef}
							name="name"
							autoComplete="name"
							maxLength={120}
							value={values.name}
							onChange={set('name')}
						/>
					</FormField>
					<FormField label={t('form_email')} error={errors.email}>
						<Input
							ref={emailRef}
							type="email"
							name="email"
							autoComplete="email"
							inputMode="email"
							autoCapitalize="none"
							spellCheck={false}
							maxLength={254}
							value={values.email}
							onChange={set('email')}
						/>
					</FormField>
					<FormField label={t('form_phone')} error={errors.phone}>
						<Input
							ref={phoneRef}
							type="tel"
							name="tel"
							autoComplete="tel"
							maxLength={30}
							value={values.phone}
							onChange={set('phone')}
						/>
					</FormField>
					<FormField label={t('form_interest')}>
						<NativeSelect
							name="interest"
							value={interest}
							onChange={(event) => setInterest(event.target.value as LeadInterest)}
						>
							<option value="ad">{t('form_interest_ad')}</option>
							<option value="vet_partner">{t('form_interest_vet')}</option>
							<option value="unsure">{t('form_interest_unsure')}</option>
						</NativeSelect>
					</FormField>
					<FormField label={t('form_region')}>
						<NativeSelect name="region" value={region} onChange={(event) => setRegion(event.target.value)}>
							<option value="">{t('form_region_all')}</option>
							{regions.map(({ slug, name }) => (
								<option key={slug} value={slug}>
									{name}
								</option>
							))}
						</NativeSelect>
					</FormField>
					<FormField label={t('form_message')} error={errors.message}>
						<Textarea
							ref={messageRef}
							name="message"
							rows={4}
							placeholder={t('form_message_placeholder')}
							value={values.message}
							onChange={set('message')}
						/>
					</FormField>
					<div>
						<label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
							<Checkbox
								ref={consentRef}
								name="consent"
								checked={consent}
								onCheckedChange={(checked) => setConsent(checked === true)}
								aria-invalid={errors.consent ? true : undefined}
								aria-describedby={errors.consent ? 'enquiry-consent-error' : undefined}
							/>
							<span>{t('form_consent')}</span>
						</label>
						{errors.consent && <FieldError id="enquiry-consent-error">{errors.consent}</FieldError>}
					</div>
				</fieldset>
				{captcha.widget}
				<div className="grid justify-items-start gap-3">
					<Button type="submit" size="lg" loading={busy}>
						{busy ? t('form_sending') : t('form_submit')}
					</Button>
					<p className="text-sm text-muted-foreground">
						{t.rich('form_privacy', {
							privacy: (chunks) => (
								<Link href="/privacy" className={inlineLink}>
									{chunks}
								</Link>
							),
						})}
					</p>
				</div>
			</form>
		</>
	);
}
