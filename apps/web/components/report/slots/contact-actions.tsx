'use client';

import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

import type { ReportType } from '@zivali/types';
import { Button } from '@/components/ui/button';

// Starting the conversation (store, API client, the P16 gate) loads with the first press: a visitor's page ships none
// of it.
const StartConversation = dynamic(
	() => import('@/components/report/start-conversation').then((m) => m.StartConversation),
	{ ssr: false }
);

type Kind = 'action_message' | 'action_mine';
// P9 slot A contact, primary or text: lost "Pošlji sporočilo" (text, after the sighting), found "To je moja žival"
// (before the sighting), sighted both, the message first.
const ACTIONS: Record<ReportType, [Kind, boolean][]> = {
	lost: [['action_message', false]],
	found: [['action_mine', true]],
	sighted: [
		['action_message', true],
		['action_mine', false],
	],
};
const ICONS = { action_message: ChatCircleIcon, action_mine: HeartIcon };

/** The visitors' contact buttons of slot A; each opens the conversation about this report (C9). */
export function ContactActions({ code, type }: { code: string; type: ReportType }) {
	const t = useTranslations('report');
	const [pressed, setPressed] = React.useState<Kind>();
	const [gate, setGate] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	return (
		<>
			{ACTIONS[type].map(([kind, primary]) => {
				const Icon = ICONS[kind];
				return (
					<Button
						key={kind}
						size="lg"
						variant={primary ? 'default' : 'text'}
						loading={busy && pressed === kind}
						onClick={() => {
							setPressed(kind);
							setGate(true);
						}}
					>
						<Icon weight="bold" aria-hidden="true" />
						{t(kind)}
					</Button>
				);
			})}
			{pressed && <StartConversation code={code} gate={gate} onGateChange={setGate} onBusyChange={setBusy} />}
		</>
	);
}
