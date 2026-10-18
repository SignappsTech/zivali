import { type Href, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PrinterIcon } from 'phosphor-react-native/src/icons/Printer';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { useCreateConversationMutation } from '@zivali/api/chat';
import type { QueryError } from '@zivali/api/rtk';
import { AuthGate } from '@/components/auth/gate';
import { useErrorText } from '@/components/auth/parts';
import { HomeAgain, useReopen } from '@/components/report/lifecycle';
import { Note } from '@/components/report/parts';
import type { DetailReport, ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

type Action = { label: string; icon: PhosphorIcon; onPress?: () => void };

/**
 * P9 action slot A, in the sticky action bar: a primary `lg` action with `children` (the slot C overflow) beside it
 * and the text button(s) under it.
 * - Lost: "Sporoči opažanje", text "Pošlji sporočilo". Found: "To je moja žival", text "Sporoči opažanje".
 *   Sighted: "Pošlji sporočilo", text "To je moja žival".
 * - Owner (signed-in owner or manage-link holder, `is_mine`): "Žival je spet doma" (the P14 confirm, then
 *   `r/[code]/reunited`), text "Uredi" (`r/[code]/edit`). Closed or reunited within the
 *   reopen window: "Ponovno odpri" only ("Nadaljuj iskanje" after the 90-day expiry).
 * A sighting opens the sighted flow linked to this report (C15 `report/found?type=sighted`, TASK-30.3). Contact
 * needs an account: the P16 gate first (signed out or anonymous), then `startContact` (C9, TASK-21.6). "Plakat" opens
 * the P18 poster and sharing screen (`r/[code]/poster`).
 */
export function SlotA({ report, offline, children }: ReportSlotProps) {
	const t = useTranslations('report');
	const router = useRouter();
	const [gate, setGate] = React.useState(false);
	const [home, setHome] = React.useState(false);
	const [pressed, setPressed] = React.useState<string>();
	const startContact = useStartContact(report.short_code);

	// The layout shows the bar for an ended report only while the owner can still reopen it.
	if (report.status === 'closed' || report.status === 'reunited') return <Reopen report={report} offline={offline} />;

	const sighting: Action = {
		label: t('action_sighting'),
		icon: EyeIcon,
		onPress: () =>
			router.push({
				pathname: '/report/found',
				// The API links sightings to lost listings only (VALIDATION otherwise): there the code shows the pet on
				// every step and the species is the listing's; on a found listing it is a plain sighting.
				params:
					report.type === 'lost'
						? {
								type: 'sighted',
								linked_report_id: report.id,
								code: report.short_code,
								species: report.species,
							}
						: { type: 'sighted' },
			} as unknown as Href),
	};
	const contact = (label: string, icon: PhosphorIcon): Action => ({
		label,
		icon,
		onPress: () => {
			setPressed(label);
			setGate(true);
		},
	});
	const message = contact(t('action_message'), ChatCircleIcon);
	const mine = contact(t('action_mine'), HeartIcon);
	const loading = (action: Action) => startContact.busy && pressed === action.label;

	// Every action needs the network (the sighting flow does not queue through the outbox yet), so the saved copy
	// disables them all and says why.
	const [primary, ...secondary]: Action[] = report.is_mine
		? [
				{ label: t('owner_home'), icon: HeartIcon, onPress: () => setHome(true) },
				{
					label: t('owner_edit'),
					icon: PencilSimpleIcon,
					onPress: () => router.push(`/r/${report.short_code}/edit` as Href),
				},
				{
					label: t('owner_poster'),
					icon: PrinterIcon,
					onPress: () => router.push(`/r/${report.short_code}/poster` as Href),
				},
			]
		: { lost: [sighting, message], found: [mine, sighting], sighted: [message, mine] }[report.type];

	return (
		<View>
			<View className="flex-row items-center gap-2">
				<Button
					size="lg"
					className="flex-1 px-5"
					disabled={offline}
					loading={loading(primary)}
					onPress={primary.onPress}
				>
					<Icon as={primary.icon} />
					{primary.label}
				</Button>
				{children}
			</View>
			<View className="mt-1 flex-row">
				{secondary.map((action) => (
					<Button
						key={action.label}
						variant="text"
						className="flex-1"
						disabled={offline}
						loading={loading(action)}
						onPress={action.onPress}
					>
						<Icon as={action.icon} />
						{action.label}
					</Button>
				))}
			</View>
			{offline && (
				<Text role="status" className="mt-2 text-center text-sm text-muted-foreground">
					{t('action_offline')}
				</Text>
			)}
			{startContact.note && (
				// Calm for the daily contact limit, an error otherwise.
				<Note
					role={startContact.note.limited ? 'status' : 'alert'}
					icon={startContact.note.limited ? InfoIcon : WarningCircleIcon}
					iconClassName={startContact.note.limited ? 'text-primary' : 'text-destructive'}
					className="mt-2"
				>
					{startContact.note.text}
				</Note>
			)}
			{report.is_mine ? (
				<HomeAgain report={report} open={home} onOpenChange={setHome} />
			) : (
				<AuthGate
					reason="contact"
					body={t('gate_body')}
					open={gate}
					onOpenChange={setGate}
					onReady={startContact.start}
				/>
			)}
		</View>
	);
}

/**
 * Contact after the P16 gate (C9): POST /v1/conversations { about_report_code }, then the conversation
 * (`inbox/[id]`); the API answers the same one again for the same report and caller. UNVERIFIED_EMAIL opens the
 * "Potrdite svoj e-naslov" screen; RATE_LIMITED (contact, 10 a day) and other refusals are a note in the bar.
 * chat_started fires in the conversation, with the first message.
 */
function useStartContact(code: string) {
	const t = useTranslations('report');
	const router = useRouter();
	const errorText = useErrorText();
	const { me } = useSession();
	const [create, { isLoading: busy }] = useCreateConversationMutation();
	const [note, setNote] = React.useState<{ limited: boolean; text: string }>();
	// A ref, not `busy`: a second press in the same tick (or the gate's onReady) sees stale state.
	const starting = React.useRef(false);

	const start = async () => {
		if (starting.current) return;
		starting.current = true;
		setNote(undefined);
		try {
			const { id } = await create({ about_report_code: code }).unwrap();
			router.push(`/inbox/${id}` as Href);
		} catch (failure) {
			const refusal = (failure as Partial<QueryError> | null)?.data?.code;
			if (refusal === 'UNVERIFIED_EMAIL')
				router.push({ pathname: '/auth/check-email', params: { email: me?.email ?? '' } });
			else if (refusal === 'RATE_LIMITED') setNote({ limited: true, text: t('contact_limited') });
			else setNote({ limited: false, text: errorText(failure) });
		} finally {
			starting.current = false;
		}
	};
	return { start: () => void start(), busy, note };
}

/** P14 S6/S7: the primary "Ponovno odpri" ("Nadaljuj iskanje" after the expiry); a quiet text button when reunited. */
function Reopen({ report, offline }: { report: DetailReport; offline: boolean }) {
	const tl = useTranslations('lifecycle');
	const { reopen, busy } = useReopen(report);
	const t = useTranslations('report');
	const expired = report.type === 'lost' && report.close_reason === 'expired';
	return (
		<View>
			<Button
				size="lg"
				variant={report.status === 'reunited' ? 'text' : 'default'}
				loading={busy}
				disabled={offline}
				onPress={() => void reopen()}
			>
				<Icon as={ArrowCounterClockwiseIcon} />
				{expired ? tl('expired_lost_action') : tl('reopen')}
			</Button>
			{offline && (
				<Text role="status" className="mt-2 text-center text-sm text-muted-foreground">
					{t('action_offline')}
				</Text>
			)}
		</View>
	);
}
