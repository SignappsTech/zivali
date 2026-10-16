import { type Href, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArchiveIcon } from 'phosphor-react-native/src/icons/Archive';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import { useRequireAuth } from '@zivali/api/auth';
import { useArchivePetMutation, useDeletePetMutation, useGetPetQuery } from '@zivali/api/pets';
import type { Pet } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { InlineError, Loading } from '@/components/notifications/notifications-view';
import { formatChip } from '@/components/pets/pet-fields';
import { ArchivedLabel, PetPhoto, usePetMeta } from '@/components/pets/pet-parts';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';

/** P8 pet detail (owner only; the API answers FORBIDDEN to anyone else). */
export default function PetScreen() {
	const { gate } = useRequireAuth();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { data, isLoading, isFetching, refetch } = useGetPetQuery(
		{ id },
		{ skip: gate === 'loading' || gate === 'signin' }
	);
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-11 pt-1">
			{data ? (
				<PetDetail pet={data} />
			) : gate === 'loading' || isLoading ? (
				<Loading />
			) : (
				<InlineError className="mt-5" retrying={isFetching} onRetry={() => void refetch()} />
			)}
		</ScrollView>
	);
}

/**
 * Chip row: the number only for its owner, hidden until "Pokaži številko" (the masked line keeps the grouping and has
 * an accessible name); no chip or an invalid one is a plain word.
 */
function ChipRow({ pet }: { pet: Pet }) {
	const t = useTranslations('pets');
	const [shown, setShown] = React.useState(false);
	const chip = pet.chip_status === 'valid' && pet.chip_number ? formatChip(pet.chip_number) : null;
	return (
		<View className="mt-8">
			<Text role="heading" className="mb-2 font-display-semibold text-xl tracking-[-0.2px]">
				{t('chip_row')}
			</Text>
			{chip ? (
				<>
					{shown ? (
						<Text className="font-sans-bold text-xl tabular-nums tracking-[0.4px]">{chip}</Text>
					) : (
						<Text aria-label={t('chip_hidden')} className="font-sans-bold text-xl tracking-[0.4px]">
							{chip.replace(/\d/g, '•')}
						</Text>
					)}
					<Button variant="text" className="-ml-3 mt-1 self-start" onPress={() => setShown(!shown)}>
						<Icon as={shown ? EyeSlashIcon : EyeIcon} />
						{t(shown ? 'chip_hide' : 'chip_show')}
					</Button>
					<View className="flex-row items-center gap-2">
						<Icon as={LockSimpleIcon} size={18} className="text-muted-foreground" />
						<Text className="shrink text-sm text-muted-foreground">{t('chip_only_you')}</Text>
					</View>
				</>
			) : (
				<Text className="text-muted-foreground">
					{t(pet.chip_status === 'invalid' ? 'chip_unknown' : 'chip_none')}
				</Text>
			)}
		</View>
	);
}

/** A text action with its confirmation dialog (archive, delete). */
function ConfirmAction({
	icon,
	label,
	title,
	body,
	confirm,
	destructive,
	onConfirm,
}: {
	icon: typeof TrashIcon;
	label: string;
	title: string;
	body: string;
	confirm: string;
	destructive?: boolean;
	onConfirm: () => void;
}) {
	const tc = useTranslations('common');
	const tone = destructive ? 'text-destructive' : undefined;
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="text">
					<Icon as={icon} className={tone} />
					<Text className={tone}>{label}</Text>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription>{body}</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogAction size="lg" variant={destructive ? 'destructive' : 'default'} onPress={onConfirm}>
						{confirm}
					</AlertDialogAction>
					<AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/**
 * Cover photo (radius 32), name h1, the one primary "Prijavi izgubljeno žival" (opens the lost flow with this pet),
 * facts as a plain two-column list, notes, the chip row, then Uredi, Arhiviraj and Izbriši (each confirmed). An archived
 * pet says so instead of offering a report or another archive.
 */
function PetDetail({ pet }: { pet: Pet }) {
	const t = useTranslations('pets');
	const ta = useTranslations('attributes');
	const tb = useTranslations('breeds');
	const locale = useLocale();
	const router = useRouter();
	const meta = usePetMeta();
	const errorText = useErrorText();
	const [deletePet] = useDeletePetMutation();
	const [archivePet] = useArchivePetMutation();

	const colours = pet.colours
		.map((colour, index) => (index ? ta(`colours.${colour}`).toLocaleLowerCase(locale) : ta(`colours.${colour}`)))
		.join(', ');
	const facts = (
		[
			[t('fact_species'), ta(`species.${pet.species}`)],
			[t('fact_sex'), pet.sex && ta(`sex.${pet.sex}`)],
			[t('fact_breed'), pet.breed_codes.map((code) => tb(code)).join(', ')],
			[t('fact_born'), pet.birth_year && String(pet.birth_year)],
			[t('fact_colour'), colours],
			[t('fact_pattern'), pet.pattern && ta(`patterns.${pet.pattern}`)],
			[t('fact_size'), pet.size && ta(`size.${pet.size}`)],
			[t('fact_collar'), pet.collar],
		] as const
	).filter((fact): fact is readonly [string, string] => Boolean(fact[1]));

	const remove = async () => {
		try {
			await deletePet({ id: pet.id }).unwrap();
			toast.success(t('deleted'));
			if (router.canGoBack()) router.back();
			else router.replace('/pets');
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	const archive = () =>
		archivePet({ id: pet.id })
			.unwrap()
			.then(() => toast.success(t('archived')))
			.catch((failure) => toast.error(errorText(failure)));

	return (
		<>
			<PetPhoto
				pet={pet}
				alt={t('photo_alt', { name: pet.name, n: 1 })}
				className="aspect-[4/3] w-full rounded-[32px]"
			/>
			<Text role="heading" className="mt-6 font-display text-3xl tracking-[-0.6px]">
				{pet.name}
			</Text>
			<Text className="mt-1 text-muted-foreground">{meta(pet)}</Text>
			{pet.archived_at ? (
				<ArchivedLabel className="mt-3" />
			) : (
				<Button
					size="lg"
					className="mt-5"
					onPress={() => router.push({ pathname: '/report/lost', params: { pet_id: pet.id } } as Href)}
				>
					{t('report_lost')}
				</Button>
			)}

			<View className="mt-8 flex-row flex-wrap gap-y-4">
				{facts.map(([label, value]) => (
					<View key={label} accessible className="w-1/2 pr-3">
						<Text className="font-sans-bold text-sm text-muted-foreground">{label}</Text>
						<Text className="mt-0.5">{value}</Text>
					</View>
				))}
			</View>
			{pet.notes ? (
				<View accessible className="mt-4">
					<Text className="font-sans-bold text-sm text-muted-foreground">{t('notes_label')}</Text>
					<Text className="mt-0.5">{pet.notes}</Text>
				</View>
			) : null}

			<ChipRow pet={pet} />

			<View className="-ml-3 mt-8 flex-row flex-wrap gap-2">
				<Button variant="text" onPress={() => router.push(`/pets/${pet.id}/edit`)}>
					<Icon as={PencilSimpleIcon} />
					{t('edit')}
				</Button>
				{pet.archived_at ? null : (
					<ConfirmAction
						icon={ArchiveIcon}
						label={t('archive')}
						title={t('archive_title')}
						body={t('archive_body')}
						confirm={t('archive_confirm')}
						onConfirm={archive}
					/>
				)}
				<ConfirmAction
					destructive
					icon={TrashIcon}
					label={t('delete')}
					title={t('delete_title')}
					body={t('delete_body')}
					confirm={t('delete_confirm')}
					onConfirm={remove}
				/>
			</View>
		</>
	);
}
