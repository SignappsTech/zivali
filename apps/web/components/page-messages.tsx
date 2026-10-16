'use client';

import { type AbstractIntlMessages, NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import { useMemo } from 'react';

/**
 * Adds a page's own message namespaces to the root layout's client messages (TASK-90.6), so only the pages whose
 * client components read them send them. A nested provider replaces the messages and inherits the rest (time zone,
 * formats, now), hence the merge.
 */
export function PageMessages({ messages, children }: { messages: AbstractIntlMessages; children: React.ReactNode }) {
	const layout = useMessages();
	const merged = useMemo(() => ({ ...layout, ...messages }), [layout, messages]);
	return (
		<NextIntlClientProvider locale={useLocale()} messages={merged}>
			{children}
		</NextIntlClientProvider>
	);
}
