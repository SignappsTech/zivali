import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { AuthMain } from '@/components/auth/parts';
import { ForgotForm, NewPasswordForm } from '@/components/auth/reset';
import { PageMessages } from '@/components/page-messages';
import { recoveryEmail, safeNext } from '@/lib/viewer';

const one = (value: string | string[] | undefined) => (typeof value === 'string' ? value : undefined);

export async function generateMetadata({ params }: PageProps<'/[locale]/reset-password'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'auth' });
	return { title: t('reset_doc_title'), robots: { index: false } };
}

/**
 * P16 forgot password (`/pozabljeno-geslo`, `/en/reset-password`), flow variant, noindex. The reset link's callback
 * brings the user back here with a recovery session: only then, checked on the server, the new-password form shows.
 * `?set=1` (C7 §6): a converted finder's link, whose session sets the password the conversion could not, then `next`.
 */
export default async function ResetPasswordPage({ params, searchParams }: PageProps<'/[locale]/reset-password'>) {
	const query = await searchParams;
	const set = one(query.set) === '1';
	const email = await recoveryEmail({ converted: set });
	const { auth } = await getMessages({ locale: (await params).locale as Locale });

	return (
		<PageMessages messages={{ auth }}>
			<AuthMain>
				{email === null ? (
					<ForgotForm email={one(query.email)} expired={one(query.link) === 'expired'} />
				) : (
					<NewPasswordForm email={email} set={set} next={set ? safeNext(one(query.next)) : undefined} />
				)}
			</AuthMain>
		</PageMessages>
	);
}
