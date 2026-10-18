'use client';

import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { useSession } from '@zivali/api/auth';
import { useCreateConversationMutation } from '@zivali/api/chat';
import { AuthGate } from '@/components/auth/gate';
import { errorCode, useErrorText } from '@/components/auth/parts';
import { noteClass } from '@/components/shelters/classes';
import { StoreProvider } from '@/components/store-provider';
import { useRouter } from '@/i18n/client-navigation';
import { cn } from '@/lib/utils';

const GateDialog = dynamic(() => import('@/components/auth/gate-dialog').then((m) => m.GateDialog), { ssr: false });

type Props = {
	code: string;
	/** The P16 gate is open: set by slot A's contact buttons. */
	gate: boolean;
	onGateChange: (open: boolean) => void;
	onBusyChange: (busy: boolean) => void;
};

/**
 * Contact from P9 slot A (C9), loaded with the first press: the P16 gate (signed out or anonymous: an account; not
 * confirmed: "Potrdite svoj e-naslov"), then POST /v1/conversations { about_report_code } and the conversation. The API
 * answers the same conversation again for the same report and caller. UNVERIFIED_EMAIL opens the verify dialog;
 * RATE_LIMITED (contact, 10 a day, "report.contact_limited") and other refusals are a note under the buttons. chat_started fires in the
 * conversation, with the first message (C9).
 */
export function StartConversation(props: Props) {
	return (
		<StoreProvider>
			<Start {...props} />
		</StoreProvider>
	);
}

function Start({ code, gate, onGateChange, onBusyChange }: Props) {
	const t = useTranslations('report');
	const errorText = useErrorText();
	const router = useRouter();
	const { me } = useSession();
	const [create] = useCreateConversationMutation();
	// Undefined until the first refusal: then mounted, so it can animate out and return focus.
	const [verify, setVerify] = React.useState<boolean>();
	const [note, setNote] = React.useState<{ limited: boolean; text: string }>();

	// A ref, not the mutation state: a second press in the same tick (or the gate's onReady) sees stale state.
	const starting = React.useRef(false);
	const start = async () => {
		if (starting.current) return;
		starting.current = true;
		setNote(undefined);
		onBusyChange(true);
		try {
			const { id } = await create({ about_report_code: code }).unwrap();
			router.push({ pathname: '/inbox/[id]', params: { id } });
		} catch (failure) {
			const refusal = errorCode(failure);
			if (refusal === 'UNVERIFIED_EMAIL') setVerify(true);
			else if (refusal === 'RATE_LIMITED') setNote({ limited: true, text: t('contact_limited') });
			else setNote({ limited: false, text: errorText(failure) });
		} finally {
			starting.current = false;
			onBusyChange(false);
		}
	};

	const Icon = note?.limited ? InfoIcon : WarningCircleIcon;
	return (
		<>
			<AuthGate
				reason="contact"
				body={t('gate_body')}
				open={gate}
				onOpenChange={onGateChange}
				onReady={() => void start()}
			/>
			{verify !== undefined && (
				<GateDialog reason="contact" open={verify} onOpenChange={setVerify} unverifiedEmail={me?.email ?? ''} />
			)}
			{note && (
				// Last in the row, on its own line; calm for the daily limit, an error otherwise.
				<div role={note.limited ? 'status' : 'alert'} className={cn(noteClass, 'order-last mt-3 basis-full')}>
					<Icon
						weight="fill"
						aria-hidden="true"
						className={cn('mt-px size-[22px] shrink-0', note.limited ? 'text-primary' : 'text-destructive')}
					/>
					<p>{note.text}</p>
				</div>
			)}
		</>
	);
}
