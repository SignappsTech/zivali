'use client';

import type { User } from '@supabase/supabase-js';
import { type Locale, NextIntlClientProvider } from 'next-intl';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { useStore } from 'react-redux';

import { setUserRole, type UserRole } from '@zivali/analytics';
import { configureAuth, useSession } from '@zivali/api/auth';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { ApiStore } from '@zivali/api/rtk';
import { timeZone } from '@zivali/i18n/format';
import type { Me } from '@zivali/types';
import { isAdminPath } from '@/components/analytics/screen-views';
import { StoreProvider } from '@/components/store-provider';
import { useRoute } from '@/i18n/client-navigation';
import { useProfileLocale } from '@/i18n/use-profile-locale';

import { sendAuthMarker } from './marker';

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

/** C12 `user_role`: an anonymous finder session (C7) is a finder; staff and shelter members by profile role. */
export const analyticsRole = (me: Pick<Me, 'role' | 'is_anonymous'>): UserRole =>
	me.is_anonymous
		? 'finder'
		: me.role === 'ADMIN' || me.role === 'MODERATOR'
			? 'admin'
			: me.role === 'SHELTER_MEMBER'
				? 'shelter'
				: 'owner';

/**
 * For signed-in pages (app/providers.tsx): configures auth for the whole page, connects the language switch to the
 * profile locale, and gives a new profile the name that waits in user_metadata (the API creates the profile without
 * one, C3). It sets the analytics `user_role` once the profile is known and sends the auth callback's marker (a
 * provider return or a confirmation link that lands on a signed-in page, marker.ts). Not in the staff console: any
 * analytics call there would start GA (C12), so the role waits for a public page and a marker is only dropped.
 */
export function SessionSync() {
	useConfigureAuth();
	useProfileLocale();
	const admin = isAdminPath(useRoute().pathname);
	const { me, session } = useSession();
	const [updateMe] = useUpdateMeMutation();
	const pendingName = me && !me.is_anonymous && !me.display_name ? metadataName(session?.user) : undefined;
	const role = me ? analyticsRole(me) : undefined;

	React.useEffect(() => sendAuthMarker(!admin), [admin]);

	React.useEffect(() => {
		if (role && !admin) setUserRole(role);
	}, [role, admin]);

	React.useEffect(() => {
		if (pendingName) void updateMe({ display_name: pendingName });
	}, [pendingName, updateMe]);

	return null;
}

/**
 * SessionSync with the shared store, for app/providers.tsx, which loads it on signed-in pages only (TASK-90.5). The
 * root layout has no intl provider (TASK-90.7); the store reads the locale from one.
 */
export function SessionSyncIsland() {
	return (
		<NextIntlClientProvider locale={useParams<{ locale: Locale }>().locale} timeZone={timeZone}>
			<StoreProvider>
				<SessionSync />
			</StoreProvider>
		</NextIntlClientProvider>
	);
}
