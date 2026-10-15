import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { AuthMain } from '@/components/auth/parts';
import { SignUpForm } from '@/components/auth/sign-up';
import { getPathname } from '@/i18n/navigation';
import { getVerifiedViewer, safeNext } from '@/lib/viewer';

const one = (value: string | string[] | undefined) => (typeof value === 'string' ? value : undefined);

export async function generateMetadata({ params }: PageProps<'/[locale]/sign-up'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'auth' });
	return { title: t('signup_title'), robots: { index: false } };
}

/** P16 create account (`/registracija`, `/en/sign-up`), flow variant, noindex; `?next=` as on sign-in. */
export default async function SignUpPage({ params, searchParams }: PageProps<'/[locale]/sign-up'>) {
	const locale = (await params).locale as Locale;
	const query = await searchParams;
	const next = safeNext(one(query.next));
	if (await getVerifiedViewer()) redirect(next ?? getPathname({ locale, href: '/' }));

	return (
		<AuthMain>
			<SignUpForm next={next} email={one(query.email)} />
		</AuthMain>
	);
}
