import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { InboxViews } from '@/components/notifications/inbox-views';
import { ContentPage } from '@/components/shell/page';

/** The view the URL names; none lets the inbox open where the unread items are (InboxViews). */
const viewOf = async ({ searchParams }: PageProps<'/[locale]/inbox'>) => {
	const { view } = await searchParams;
	return view === 'notifications' || view === 'conversations' ? view : undefined;
};

export async function generateMetadata(props: PageProps<'/[locale]/inbox'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await props.params).locale as Locale });
	const title = (await viewOf(props)) === 'notifications' ? t('notifications.title') : t('nav.inbox');
	return { title, robots: { index: false } };
}

/**
 * Inbox (`/nabiralnik`, `/en/inbox`, C15): conversations (TASK-21.3) and notifications (P13), `?view=` names one, else
 * the view with unread items opens. No ads (C15).
 */
export default async function InboxPage(props: PageProps<'/[locale]/inbox'>) {
	return (
		<ContentPage>
			<InboxViews view={await viewOf(props)} />
		</ContentPage>
	);
}
