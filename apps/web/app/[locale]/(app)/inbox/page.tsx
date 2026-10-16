import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { InboxViews } from '@/components/notifications/inbox-views';
import { ContentPage } from '@/components/shell/page';

const viewOf = async ({ searchParams }: PageProps<'/[locale]/inbox'>) =>
	(await searchParams).view === 'notifications' ? 'notifications' : 'conversations';

export async function generateMetadata(props: PageProps<'/[locale]/inbox'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await props.params).locale as Locale });
	const title = (await viewOf(props)) === 'notifications' ? t('notifications.title') : t('nav.inbox');
	return { title, robots: { index: false } };
}

/** Inbox (`/nabiralnik`, `/en/inbox`, C15): conversations (TASK-21.3) and, with `?view=notifications`, notifications (P13). No ads (C15). */
export default async function InboxPage(props: PageProps<'/[locale]/inbox'>) {
	return (
		<ContentPage>
			<InboxViews view={await viewOf(props)} />
		</ContentPage>
	);
}
