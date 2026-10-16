import { type Href, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HandHeartIcon } from 'phosphor-react-native/src/icons/HandHeart';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { ScrollView, Share, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { type EventParams, track } from '@zivali/analytics';
import { useGetReportQuery } from '@zivali/api/reports';
import type { LatLng } from '@/components/map/features';
import { Heading, Line } from '@/components/report-found/parts';
import { reportLink } from '@/components/report/slots/slot-b';
import { ShelterRow } from '@/components/shelter/shelter-row';
import { Spot } from '@/components/shell/parts';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { manageTokenKey, type OutboxItem } from '@/lib/offline/outbox';

/** What the flow hands over once Publish has an answer; in memory only (the point is the coarsened one). */
export type Submitted = {
	outboxId: string;
	point: LatLng;
	/** `found`: the finder has the animal; `sighted`: only saw it (P7 C4 softer shelter row). */
	kind: 'found' | 'sighted';
	/** The short sighting flow from a listing: no shelter row, Zapri back to the listing (P7 C5). */
	linked: boolean;
	emailed: boolean;
};

/** Spot, h1, one sentence, the content and the bottom actions; the top bar only closes (P7 M6, Q1, C5). */
function DoneScreen({
	icon,
	title,
	body,
	footer,
	onLeave,
	children,
}: {
	icon: PhosphorIcon;
	title: string;
	body: string;
	footer: React.ReactNode;
	onLeave: () => void;
	children?: React.ReactNode;
}) {
	const tc = useTranslations('common');
	const insets = useSafeAreaInsets();
	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			<View className="h-14 flex-row items-center justify-end px-3">
				<Button variant="ghost" size="icon" aria-label={tc('close')} onPress={onLeave}>
					<Icon as={XIcon} size={24} />
				</Button>
			</View>
			<ScrollView contentContainerClassName="grow px-5 pb-8 pt-2">
				<Spot icon={icon} />
				<Heading key={title} className="mt-6">
					{title}
				</Heading>
				<Text className="mt-3 text-lg">{body}</Text>
				{children}
			</ScrollView>
			<View className="gap-1 px-5 pt-4" style={{ paddingBottom: Math.max(44, insets.bottom + 8) }}>
				{footer}
			</View>
		</SafeAreaView>
	);
}

/** The manage link as real, selectable text (C7 step 4); the token itself only ever comes from secure storage. */
function LinkBlock({ link, emailed }: { link: string; emailed: boolean }) {
	const t = useTranslations('report_found');
	return (
		<Card aria-label={t('link_label')} className="mt-8">
			<CardTitle className="text-lg">{t('link_label')}</CardTitle>
			<Text
				selectable
				className="mt-2 border-b-2 border-input px-0.5 py-2"
				style={{ fontVariant: ['tabular-nums'] }}
			>
				{link}
			</Text>
			<Text className="mt-2 text-sm text-muted-foreground">{t('link_help')}</Text>
			{emailed ? (
				<Line icon={EnvelopeSimpleIcon} weight="bold" className="mt-4">
					{t('link_emailed')}
				</Line>
			) : null}
		</Card>
	);
}

/** The anonymous manage token saved by the outbox (`manage_token.<id>`); null for a signed-in finder. */
function useManageToken(reportId: string) {
	const [token, setToken] = React.useState<string | null>(null);
	React.useEffect(() => {
		let alive = true;
		SecureStore.getItemAsync(manageTokenKey(reportId))
			.then((value) => alive && setToken(value))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [reportId]);
	return token;
}

/** M6 (found), C5 (sighting from a listing): the report is live, the private link, the shelter row. */
function Sent({
	submitted,
	sent,
	onLeave,
}: {
	submitted: Submitted;
	sent: { report_id: string; short_code: string };
	onLeave: () => void;
}) {
	const t = useTranslations('report_found');
	const tc = useTranslations('common');
	const locale = useLocale();
	const router = useRouter();
	const token = useManageToken(sent.report_id);
	const { data: report } = useGetReportQuery({ code: sent.short_code });
	const held = report !== undefined && 'moderation_state' in report && report.moderation_state === 'held';

	// C12: once per report, with the server's region and municipality; track() is a no-op without consent.
	const tracked = React.useRef(false);
	React.useEffect(() => {
		if (tracked.current || !report?.region_slug || !report.municipality_slug) return;
		tracked.current = true;
		track('report_found_submit', {
			report_type: report.type === 'found' ? 'found' : 'sighted',
			species: report.species,
			region: report.region_slug as EventParams['report_found_submit']['region'],
			municipality: report.municipality_slug,
		});
	}, [report]);

	const link = token ? `${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? '/en' : ''}/m#${token}` : null;
	return (
		<DoneScreen
			icon={submitted.linked ? EyeIcon : HandHeartIcon}
			title={t(submitted.linked ? 'sighting_done_title' : 'done_title')}
			body={submitted.linked ? t('sighting_done_body') : t(held ? 'held_note' : 'done_body')}
			onLeave={onLeave}
			footer={
				submitted.linked ? (
					<Button size="lg" onPress={onLeave}>
						{tc('close')}
					</Button>
				) : (
					<>
						{/* The anonymous session that sent it manages it, so the detail opens in the owner view. */}
						<Button size="lg" onPress={() => router.replace(`/r/${sent.short_code}` as Href)}>
							{t('open_report')}
						</Button>
						{held ? null : (
							<Button
								variant="text"
								onPress={() =>
									void Share.share({ message: reportLink(sent.short_code) }).catch(() => undefined)
								}
							>
								<Icon as={ShareNetworkIcon} />
								{t('share')}
							</Button>
						)}
					</>
				)
			}
		>
			{link ? <LinkBlock link={link} emailed={submitted.emailed} /> : null}
			{submitted.linked ? null : <ShelterRow point={submitted.point} kind={submitted.kind} className="mt-10" />}
		</DoneScreen>
	);
}

/** Q1: saved in the outbox, sent when online; the shelter row works from the cached directory. */
function Waiting({
	submitted,
	onCancel,
	onLeave,
}: {
	submitted: Submitted;
	onCancel: () => void;
	onLeave: () => void;
}) {
	const t = useTranslations('report_found');
	const tc = useTranslations('common');
	const [asking, setAsking] = React.useState(false);
	return (
		<DoneScreen
			icon={ClockIcon}
			title={t('outbox_title')}
			body={t('offline_queued')}
			onLeave={onLeave}
			footer={
				<>
					<Button size="lg" onPress={onLeave}>
						{tc('close')}
					</Button>
					<Button variant="text" onPress={() => setAsking(true)}>
						{tc('cancel')}
					</Button>
				</>
			}
		>
			{submitted.linked ? null : <ShelterRow point={submitted.point} kind={submitted.kind} className="mt-10" />}
			<AlertDialog open={asking} onOpenChange={setAsking}>
				<AlertDialogContent>
					<AlertDialogTitle>{t('cancel_queued_title')}</AlertDialogTitle>
					<AlertDialogDescription>{t('cancel_queued_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction onPress={onCancel}>{t('outbox_delete')}</AlertDialogAction>
						<AlertDialogCancel>{t('cancel_queued_keep')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</DoneScreen>
	);
}

/**
 * After Publish (P7): the outbox item decides the screen. Sent: M6 with the private link and the responsible-shelter
 * row (C5 for a sighting from a listing). Still queued: Q1 "Čaka na pošiljanje", which turns into M6 by itself once
 * the outbox sends it (AC #5: the shelter row then shows again, live). No ad, no tip.
 */
export function FoundDone({
	submitted,
	item,
	onCancel,
	onLeave,
}: {
	submitted: Submitted;
	item?: OutboxItem;
	onCancel: () => void;
	onLeave: () => void;
}) {
	if (item?.status === 'sent') return <Sent submitted={submitted} sent={item.result} onLeave={onLeave} />;
	return <Waiting submitted={submitted} onCancel={onCancel} onLeave={onLeave} />;
}
