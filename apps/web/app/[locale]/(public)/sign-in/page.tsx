import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import NextLink from 'next/link';
import { redirect } from 'next/navigation';

import { AuthHeading, AuthMain, Spot } from '@/components/auth/parts';
import { SignInForm, type SignInNotice } from '@/components/auth/sign-in';
import { PageMessages } from '@/components/page-messages';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { getVerifiedViewer, safeNext } from '@/lib/viewer';

const NOTICES: readonly string[] = ['expired', 'cancelled', 'failed'] satisfies SignInNotice[];
const one = (value: string | string[] | undefined) => (typeof value === 'string' ? value : undefined);

export async function generateMetadata({ params }: PageProps<'/[locale]/sign-in'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'nav' });
	return { title: t('sign_in'), robots: { index: false } };
}

/**
 * P16 sign in (`/vpis`, `/en/sign-in`), flow variant, noindex. `?next=` is where to return (same-site paths only);
 * `?confirmed=1` is the "E-naslov je potrjen" view after a confirmation link (app/[locale]/auth/callback);
 * `?link=expired` and `?error=` are the callback's notices. A signed-in visitor goes straight on.
 */
export default async function SignInPage({ params, searchParams }: PageProps<'/[locale]/sign-in'>) {
	const locale = (await params).locale as Locale;
	const query = await searchParams;
	const next = safeNext(one(query.next));
	const viewer = await getVerifiedViewer();
	const confirmed = one(query.confirmed) === '1';
	if (viewer && !confirmed) redirect(next ?? getPathname({ locale, href: '/' }));

	if (confirmed) {
		const t = await getTranslations({ locale, namespace: 'auth' });
		return (
			<AuthMain>
				<Spot>
					<CheckIcon weight="bold" />
				</Spot>
				<AuthHeading>{t('verified_title')}</AuthHeading>
				<p className="mt-3 text-lg leading-7">{t('verified_body')}</p>
				{/* Back to the step that asked for the account, else the map; in another browser, sign in first. */}
				<Button asChild size="lg" className="mt-8 w-full">
					{viewer ? (
						<NextLink href={next ?? getPathname({ locale, href: '/map' })}>
							{t('verified_continue')}
						</NextLink>
					) : (
						<Link href={{ pathname: '/sign-in', query: next ? { next } : {} }}>
							{t('verified_continue')}
						</Link>
					)}
				</Button>
			</AuthMain>
		);
	}

	const notice = one(query.link) ?? one(query.error);
	const { auth } = await getMessages({ locale });
	return (
		<AuthMain>
			<PageMessages messages={{ auth }}>
				<SignInForm
					next={next}
					email={one(query.email)}
					notice={notice && NOTICES.includes(notice) ? (notice as SignInNotice) : undefined}
				/>
			</PageMessages>
		</AuthMain>
	);
}
