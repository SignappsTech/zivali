import { type Href, Redirect, useRouter } from 'expo-router';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { ShieldSlashIcon } from 'phosphor-react-native/src/icons/ShieldSlash';
import { ShieldWarningIcon } from 'phosphor-react-native/src/icons/ShieldWarning';
import * as React from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import { useRequireAuth } from '@zivali/api/auth';
import { useListPetsQuery } from '@zivali/api/pets';
import type { ChipStatus, Pet } from '@zivali/types';
import { InlineError } from '@/components/notifications/notifications-view';
import { ArchivedLabel, FREE_LIMIT, LimitNote, PetPhoto, usePetMeta } from '@/components/pets/pet-parts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusLabel } from '@/components/ui/status-label';
import { Text } from '@/components/ui/text';
import { useOpenLostReportsByPet } from '@/lib/data/reports';
import { cn } from '@/lib/utils';

/** P8 My pets (Profil → Moje živali, signed in only). */
export default function PetsScreen() {
	const { gate } = useRequireAuth();
	if (gate === 'signin') return <Redirect href="/profile" />;
	if (gate === 'loading') return <View className="flex-1 bg-background" />;
	return <PetList />;
}

// Chip status as icon plus word, never the number (it stays on the owner's pet detail).
const CHIP = {
	valid: [ShieldCheckIcon, 'chip_on_file'],
	none: [ShieldSlashIcon, 'chip_none'],
	invalid: [ShieldWarningIcon, 'chip_unknown'],
} as const;

function useChipWord() {
	const t = useTranslations('pets');
	return (status: ChipStatus) => t(CHIP[status][1]);
}

/**
 * Pet row: photo 64 (radius 20), name 18 bold, species and breed 15 muted, the chip status word (and "Arhiviran"); the
 * row opens the detail. An open lost search adds "Izgubljena" and "Odpri iskanje" under it, outside the row's target.
 */
function PetRow({ pet, search }: { pet: Pet; search?: string }) {
	const t = useTranslations('pets');
	const router = useRouter();
	const meta = usePetMeta();
	const chipWord = useChipWord();
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing();
	const [ChipIcon] = CHIP[pet.chip_status];
	const on = pet.chip_status === 'valid';
	return (
		<View role="listitem" className="gap-1">
			<Pressable
				role="link"
				aria-label={[pet.name, meta(pet), chipWord(pet.chip_status), pet.archived_at && t('archived_label')]
					.filter(Boolean)
					.join(', ')}
				onPress={() => router.push(`/pets/${pet.id}`)}
				onFocus={focus.onFocus}
				onBlur={focus.onBlur}
				style={focus.ringStyle}
				className={cn(
					'-m-2 flex-row items-center gap-4 rounded-row p-2 active:bg-accent',
					!reduceMotion && 'active:scale-[0.98]'
				)}
			>
				<PetPhoto pet={pet} alt={pet.name} className="size-16 rounded-row" />
				<View className="min-w-0 flex-1">
					<Text className="font-sans-bold text-lg leading-6">{pet.name}</Text>
					<Text className="text-control leading-[22px] text-muted-foreground">{meta(pet)}</Text>
					<View className="mt-0.5 flex-row flex-wrap items-center gap-x-3">
						<View className="flex-row items-center gap-[5px]">
							<Icon
								as={ChipIcon}
								weight={on ? 'fill' : 'regular'}
								size={16}
								className={on ? 'text-primary' : 'text-muted-foreground'}
							/>
							<Text className={cn('font-sans-bold text-sm', !on && 'text-muted-foreground')}>
								{chipWord(pet.chip_status)}
							</Text>
						</View>
						{pet.archived_at ? <ArchivedLabel /> : null}
					</View>
				</View>
				<Icon as={CaretRightIcon} size={22} className="text-muted-foreground" />
			</Pressable>
			{search ? (
				<View className="flex-row flex-wrap items-center gap-x-4 pl-20">
					<StatusLabel status="lost">{t('status_lost')}</StatusLabel>
					<Button variant="text" className="-ml-3" onPress={() => router.push(`/r/${search}` as Href)}>
						{t('open_search')}
					</Button>
				</View>
			) : null}
		</View>
	);
}

/** Row skeletons in the row geometry, announced once as "Nalaganje …". */
function RowsLoading() {
	const t = useTranslations('common');
	return (
		<View accessible aria-label={t('loading')} aria-busy className="mt-8 gap-6">
			{[0, 1].map((row) => (
				<View key={row} className="flex-row items-center gap-4">
					<Skeleton className="size-16 rounded-row" />
					<View className="flex-1 gap-2">
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-4 w-24" />
					</View>
				</View>
			))}
		</View>
	);
}

/**
 * Heading, count, the one primary "Dodaj žival", the rows, archived pets last. At the free limit the quiet note stays
 * under the button and "Dodaj žival" stays active: pressing it opens no form but adds Premium and "report without a
 * profile" to the note (no modal).
 */
function PetList() {
	const t = useTranslations('pets');
	const router = useRouter();
	const { data, isLoading, isError, isFetching, refetch } = useListPetsQuery();
	const searches = useOpenLostReportsByPet();
	const [limitHit, setLimitHit] = React.useState(false);
	const pets = data?.items ?? [];
	const active = pets.filter((pet) => !pet.archived_at);
	const atLimit = active.length >= FREE_LIMIT;

	const add = () => {
		if (!atLimit) return router.push('/pets/new');
		setLimitHit(true);
		AccessibilityInfo.announceForAccessibility(t('limit_note_premium', { limit: FREE_LIMIT }));
	};
	const addButton = (label: string, className?: string) => (
		<Button size="lg" className={className} onPress={add}>
			<Icon as={PlusIcon} />
			{label}
		</Button>
	);

	let content: React.ReactNode;
	if (isLoading) content = <RowsLoading />;
	else if (isError && !data)
		content = <InlineError className="mt-6" retrying={isFetching} onRetry={() => void refetch()} />;
	else if (!pets.length)
		content = (
			<EmptyState
				className="mt-8"
				title={t('empty_title')}
				description={t('empty_body')}
				action={addButton(t('empty_action'))}
			/>
		);
	else
		content = (
			<>
				<Text className="mt-1 text-muted-foreground">{t('count', { count: active.length })}</Text>
				{addButton(t('add'), 'mt-5')}
				{atLimit ? <LimitNote className="mt-4" actions={limitHit} /> : null}
				<View role="list" className="mt-8 gap-6">
					{[...active, ...pets.filter((pet) => pet.archived_at)].map((pet) => (
						<PetRow key={pet.id} pet={pet} search={searches.get(pet.id)} />
					))}
				</View>
			</>
		);

	return (
		<ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-11 pt-1">
			<Text role="heading" className="font-display text-3xl tracking-[-0.6px]">
				{t('title')}
			</Text>
			{content}
		</ScrollView>
	);
}
