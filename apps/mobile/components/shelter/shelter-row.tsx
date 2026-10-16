import { CloudSlashIcon } from 'phosphor-react-native/src/icons/CloudSlash';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import * as React from 'react';
import { Linking, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import { type ResponsibleShelterResponse, toResult, useResponsibleShelter } from '@zivali/api/directory';
import { formatDate, type Locale } from '@zivali/i18n/format';
import type { LatLng } from '@/components/map/features';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { isOnline, useNetworkState } from '@/lib/net';
import { getCachedShelter, lastSyncAt } from '@/lib/offline/sync';
import { cn } from '@/lib/utils';

/** The web directory (C15 `shelters`): the index, or one shelter's page with its hours and address. */
const directoryUrl = (locale: Locale, slug?: string) =>
	`${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? '/en/shelters' : '/zavetisca'}${slug ? `/${slug}` : ''}`;

/** The shelter row (no card) under a sent report: the find goes to `found`, a sighting is the softer `sighted`; `lost` is the owner's own report. */
export type Kind = 'lost' | 'found' | 'sighted';
type Saved = { data: ResponsibleShelterResponse | null; at: number | null };

/** The directory answer: live for the point while online, else the one cached with the last area sync (C17). */
function useShelter(point: LatLng, online: boolean) {
	const live = useResponsibleShelter(online ? point : null);
	const [saved, setSaved] = React.useState<Saved>();
	React.useEffect(() => {
		if (online) return;
		let alive = true;
		(async () => ({
			data: (await getCachedShelter('current')) ?? (await getCachedShelter('home')),
			at: await lastSyncAt(),
		}))().then(
			(next) => alive && setSaved(next),
			() => alive && setSaved({ data: null, at: null })
		);
		return () => {
			alive = false;
		};
	}, [online]);
	if (online) return { result: live, at: null, missing: false };
	return { result: toResult(saved?.data ?? undefined, false), at: saved?.at ?? null, missing: saved?.data === null };
}

/** Muted note with the directory link under the sentence (P7 C4): no municipality or no confirmed shelter. */
function DirectoryNote({ text, online, className }: { text: string; online: boolean; className?: string }) {
	const t = useTranslations('shelter_row');
	const locale = useLocale() as Locale;
	return (
		<View className={cn('flex-row gap-3 rounded-row bg-muted px-[18px] py-4', className)}>
			<Icon as={PhoneIcon} size={22} className="mt-0.5 text-primary" />
			<View className="min-w-0 flex-1">
				<Text className="text-control leading-[22px]">{text}</Text>
				{online ? (
					<Button
						variant="text"
						className="-ml-3 self-start"
						onPress={() => void Linking.openURL(directoryUrl(locale))}
					>
						{t('directory_link')}
					</Button>
				) : null}
			</View>
		</View>
	);
}

/** One shelter: bold name, "Ni potrjeno" when it is a guess, the number, Pokliči (`tel:`) and its page link. */
function ShelterLines({
	name,
	slug,
	phone,
	display,
	unconfirmed,
	online,
}: {
	name: string;
	slug: string;
	phone?: string;
	display?: string;
	unconfirmed?: boolean;
	online: boolean;
}) {
	const t = useTranslations('shelter_row');
	const locale = useLocale() as Locale;
	return (
		<View>
			<Text className="font-sans-bold">{name}</Text>
			{unconfirmed ? (
				<>
					<View className="flex-row items-center gap-1.5">
						<Icon as={QuestionIcon} size={16} className="text-muted-foreground" />
						<Text className="font-sans-bold text-sm text-muted-foreground">{t('unconfirmed_note')}</Text>
					</View>
					{phone ? <Text className="text-sm text-muted-foreground">{t('unconfirmed_note_hint')}</Text> : null}
				</>
			) : null}
			{phone ? (
				<Text className={unconfirmed ? 'mt-1' : undefined} style={{ fontVariant: ['tabular-nums'] }}>
					{display ?? phone}
				</Text>
			) : null}
			{phone || online ? (
				<View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
					{phone ? (
						<Button
							variant="secondary"
							size="sm"
							aria-label={t('call_a11y', { shelter: name })}
							onPress={() => void Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`)}
						>
							<Icon as={PhoneIcon} />
							{t('call')}
						</Button>
					) : null}
					{/* The page needs the network (P7 Q1 drops it offline). */}
					{online && phone ? (
						<Button
							variant="text"
							className="-ml-3"
							onPress={() => void Linking.openURL(directoryUrl(locale, slug))}
						>
							{t('details_link')}
						</Button>
					) : null}
				</View>
			) : null}
		</View>
	);
}

/**
 * The responsible-shelter row (P6/P7 `shelter_row`, FR-044, C18): a phone icon row, no card. `found` (the finder has
 * the animal) adds "Prijava na Najdimo tega ne nadomesti." and the chip line; `sighted` is the softer sentence.
 * Confirmed shelters get the call button; a likely one says "Ni potrjeno"; otherwise the nearest names or the
 * directory note, never a guessed number. Offline it uses the directory cached with the area sync and says from when.
 * No statutory deadline: that text waits for `content.legal_timings` and the lawyer's wording (P6 content slice).
 */
export function ShelterRow({ point, kind, className }: { point: LatLng; kind: Kind; className?: string }) {
	const t = useTranslations('shelter_row');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const online = isOnline(useNetworkState());
	const { result, at, missing } = useShelter(point, online);

	// Offline without a cached directory there is nothing true to say.
	if (missing) return null;
	if (result.status === 'loading')
		return (
			<View accessible aria-label={tc('loading')} aria-busy className={cn('flex-row gap-3.5', className)}>
				<Skeleton className="size-6 rounded-full" />
				<View className="flex-1 gap-2">
					<Skeleton className="h-5 w-full rounded-md" />
					<Skeleton className="h-5 w-2/3 rounded-md" />
				</View>
			</View>
		);
	const municipality = result.municipality?.name;
	if (result.status === 'error' || result.status === 'outside_slovenia' || !municipality)
		return <DirectoryNote text={t('unknown_municipality')} online={online} className={className} />;
	if (result.status === 'unconfirmed' && result.nearest.length === 0)
		return <DirectoryNote text={t('unconfirmed', { municipality })} online={online} className={className} />;

	const body = t(`${kind}_body`, { municipality });
	return (
		<View className={cn('flex-row gap-3.5', className)}>
			<Icon as={PhoneIcon} size={24} className="mt-0.5 text-primary" />
			<View className="min-w-0 flex-1">
				<Text>{kind === 'found' ? `${body} ${t('not_replace')}` : body}</Text>
				<View className="mt-3">
					{result.status === 'confirmed' ? (
						<ShelterLines
							name={result.shelter.name}
							slug={result.shelter.slug}
							phone={result.shelter.phone}
							display={result.shelter.phone_display}
							online={online}
						/>
					) : result.status === 'likely' ? (
						<>
							<Text className="font-sans-bold text-sm text-muted-foreground">{t('suggested_label')}</Text>
							<ShelterLines
								name={result.likely_shelter.name}
								slug={result.likely_shelter.slug}
								phone={result.likely_shelter.phone}
								unconfirmed
								online={online}
							/>
						</>
					) : result.status === 'unconfirmed' ? (
						<>
							<Text className="font-sans-bold text-sm text-muted-foreground">{t('nearest_label')}</Text>
							<View className="mt-2 gap-4">
								{result.nearest.map((shelter) => (
									<ShelterLines
										key={shelter.slug}
										name={shelter.name}
										slug={shelter.slug}
										unconfirmed
										online={online}
									/>
								))}
							</View>
							{online ? (
								<Button
									variant="text"
									className="-ml-3 mt-1 self-start"
									onPress={() => void Linking.openURL(directoryUrl(locale))}
								>
									{t('directory_link')}
								</Button>
							) : null}
						</>
					) : null}
				</View>
				{kind === 'found' ? <Text className="mt-3 text-sm text-muted-foreground">{t('chip_line')}</Text> : null}
				{!online && at !== null ? (
					<View className="mt-2 flex-row gap-2">
						<Icon as={CloudSlashIcon} size={16} className="mt-0.5 text-primary" />
						<Text className="min-w-0 flex-1 text-sm text-muted-foreground">
							{t('cached', { date: formatDate(at, locale) })}
						</Text>
					</View>
				) : null}
			</View>
		</View>
	);
}
