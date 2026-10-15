'use client';

import type { User } from '@supabase/supabase-js';
import * as React from 'react';
import { useStore } from 'react-redux';

import { configureAuth, useSession } from '@zivali/api/auth';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { ApiStore } from '@zivali/api/rtk';
import { StoreProvider } from '@/components/store-provider';
import { useProfileLocale } from '@/i18n/use-profile-locale';

/**
 * Connects @zivali/api/auth to the Supabase session (useSession, useRequireAuth, the API cache reset on user change).
 * supabase-js loads lazily, after the page, so it stays out of the first load; signed-out pages run this only where
 * an auth view or gate needs it.
 */
export function useConfigureAuth(enabled = true) {
	const store = useStore() as ApiStore;
	React.useEffect(() => {
		if (!enabled) return;
		let stop: (() => void) | undefined;
		let cancelled = false;
		void import('@/lib/supabase/client').then(({ createClient }) => {
			if (!cancelled) stop = configureAuth(createClient(), store);
		});
		return () => {
			cancelled = true;
			stop?.();
		};
	}, [enabled, store]);
}

/** A name for a new profile: what the user typed at sign-up (lib/auth.ts signUp), else the one Google sent. */
export function metadataName(user: User | undefined): string | undefined {
	const meta = user?.user_metadata ?? {};
	const name = [meta.display_name, meta.full_name, meta.name].find(
		(value) => typeof value === 'string' && value.trim()
	) as string | undefined;
	return name?.trim().slice(0, 60);
}

/**
 * For signed-in pages (app/providers.tsx): configures auth for the whole page, connects the language switch to the
 * profile locale, and gives a new profile the name that waits in user_metadata (the API creates the profile without
 * one, C3).
 */
export function SessionSync() {
	useConfigureAuth();
	useProfileLocale();
	const { me, session } = useSession();
	const [updateMe] = useUpdateMeMutation();
	const pendingName = me && !me.is_anonymous && !me.display_name ? metadataName(session?.user) : undefined;

	React.useEffect(() => {
		if (pendingName) void updateMe({ display_name: pendingName });
	}, [pendingName, updateMe]);

	return null;
}

/** SessionSync with the shared store, for app/providers.tsx, which loads it on signed-in pages only (TASK-90.5). */
export function SessionSyncIsland() {
	return (
		<StoreProvider>
			<SessionSync />
		</StoreProvider>
	);
}
