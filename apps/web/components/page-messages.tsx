import { type AbstractIntlMessages, NextIntlClientProvider, useLocale, useMessages } from 'next-intl';

// What the shell's namespaces were on every page before TASK-90.7; client components under PageMessages keep them.
const SHELL_NAMESPACES = ['common', 'consent', 'errors', 'nav'] as const;

/**
 * The intl provider for a public page whose client components translate (sign-in, sign-up, reset-password and /m:
 * auth; /m: report_found, lifecycle; /zavetisca: shelters): the shell's namespaces and the page's own. It goes above
 * every such component, AuthMain included. A server component, since the root layout has no provider (TASK-90.7):
 * only these pages load use-intl, and the rest of the catalogue (emails, notifications, page copy, admin, ...) stays
 * on the server (TASK-90.5, TASK-90.6). Time zone and formats come from the request config, as next-intl's server
 * provider adds them.
 */
export function PageMessages({ messages, children }: { messages: AbstractIntlMessages; children: React.ReactNode }) {
	const all = useMessages();
	const shell = Object.fromEntries(SHELL_NAMESPACES.map((ns) => [ns, all[ns]]));
	return (
		<NextIntlClientProvider locale={useLocale()} messages={{ ...shell, ...messages }}>
			{children}
		</NextIntlClientProvider>
	);
}
