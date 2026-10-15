'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';

import { useRequireAuth } from '@zivali/api/auth';
import { InlineError, PageSkeleton } from '@/components/shell/page';

import { useConfigureAuth } from './session-sync';

// The gate bodies (gate-dialog.tsx) load only when a gate shows, so a page that holds one ships no supabase-js, zod or
// captcha up front.
const GateDialog = dynamic(() => import('./gate-dialog').then((m) => m.GateDialog), { ssr: false });
const VerifyEmailPrompt = dynamic(() => import('./gate-dialog').then((m) => m.VerifyEmailPrompt), {
	loading: () => <PageSkeleton />,
});

export type AuthGateReason = 'report' | 'contact' | 'alerts' | 'tip' | 'pets';

/**
 * Page content that needs a confirmed address (alerts, chat, FR-001): an unconfirmed account gets the P16 G2
 * VerifyEmailPrompt instead. Signed-in pages only (the server guard sends visitors to sign-in first).
 */
export function VerifiedOnly({ children }: { children: React.ReactNode }) {
	const { gate, me } = useRequireAuth({ verified: true });
	if (gate === 'ok') return children;
	if (gate === 'verify') return <VerifyEmailPrompt email={me?.email ?? ''} />;
	if (gate === 'error') return <InlineError />;
	return <PageSkeleton />;
}

type AuthGateProps = {
	/** Picks the title (P16 §5); report lost may pass its own title and body (P6). */
	reason: AuthGateReason;
	title?: string;
	body?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Runs once the user has a verified account: at once when they already had one. */
	onReady?: () => void;
};

/**
 * P16 W3 contextual gate, a dialog over the step that needs an account. Signed out: sign in, create an account
 * (both return here through `next`) and the providers; signed in but unconfirmed: the "Potrdite svoj e-naslov"
 * variant. Focus is trapped; Escape and "Prekliči" close it and focus returns to the opener. What the user entered
 * is kept by the step itself (C4 drafts), since sign-in leaves the page.
 *
 * Usage: `<AuthGate reason="contact" open={open} onOpenChange={setOpen} onReady={send} />`, opened on the action.
 */
export function AuthGate({ reason, title, body, open, onOpenChange, onReady }: AuthGateProps) {
	useConfigureAuth(open);
	const { gate, me } = useRequireAuth({ verified: true });
	// The dialog loads on the first open and then stays mounted, so it can animate out and return focus.
	const [loaded, setLoaded] = React.useState(open);
	if (open && !loaded) setLoaded(true);

	React.useEffect(() => {
		if (!open || gate !== 'ok') return;
		onOpenChange(false);
		onReady?.();
	}, [gate, open, onOpenChange, onReady]);

	if (!loaded) return null;
	const unverified = gate === 'verify';
	return (
		<GateDialog
			reason={reason}
			title={title}
			body={body}
			open={open && (gate === 'signin' || unverified)}
			onOpenChange={onOpenChange}
			unverifiedEmail={unverified ? (me?.email ?? '') : undefined}
		/>
	);
}
