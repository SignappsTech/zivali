import * as React from 'react';
import { AppState } from 'react-native';
import { useTranslations } from 'use-intl';

import { usePendingPrompt } from '@/components/outbox/queue';
import { toast } from '@/components/ui/sonner';
import { pendingCount } from '@/lib/offline/outbox';
import { takeSessionEnded } from '@/lib/offline/wipe';

/**
 * After a session ended outside the app (C17 §Wipe): on the next open or foreground, a calm notice once; unsent
 * reports (kept by the wipe) get the existing "Send now / Delete / Cancel" prompt.
 */
export function SessionEndedNotice() {
	const t = useTranslations();
	const { resolvePending, prompt } = usePendingPrompt();
	React.useEffect(() => {
		const check = async () => {
			if (!takeSessionEnded()) return;
			toast(t('auth.session_ended'));
			const count = await pendingCount();
			if (count > 0) await resolvePending(count);
		};
		const run = () => void check().catch(() => {});
		run();
		const app = AppState.addEventListener('change', (now) => now === 'active' && run());
		return () => app.remove();
	}, [t, resolvePending]);
	return prompt;
}
