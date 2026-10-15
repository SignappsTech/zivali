import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { AuthMain } from '@/components/auth/parts';
import { ForgotForm, NewPasswordForm } from '@/components/auth/reset';
import { recoveryEmail } from '@/lib/viewer';

const one = (value: string | string[] | undefined) => (typeof value === 'string' ? value : undefined);

export async function generateMetadata({ params }: PageProps<'/[locale]/reset-password'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'auth' });
	return { title: t('reset_doc_title'), robots: { index: false } };
}

/**
 * P16 forgot password (`/pozabljeno-geslo`, `/en/reset-password`), flow variant, noindex. The reset link's callback
 * brings the user back here with a recovery session: only then, checked on the server, the new-password form shows.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<'/[locale]/reset-password'>) {
	const query = await searchParams;
	const email = await recoveryEmail();

	return (
		<AuthMain>
			{email === null ? (
				<ForgotForm email={one(query.email)} expired={one(query.link) === 'expired'} />
			) : (
				<NewPasswordForm email={email} />
			)}
		</AuthMain>
	);
}
