import { useAccessibilityFocus } from '@rn-primitives/hooks';
import { useNavigation, useRouter } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { FormProvider } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, type Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useCreatePetMutation, useSetPetPhotosMutation, useUpdatePetMutation } from '@zivali/api/pets';
import { useDeletePhotoMutation } from '@zivali/api/photos';
import type { QueryError } from '@zivali/api/rtk';
import type { Pet } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import {
	formatChip,
	PetBasicsFields,
	PetChipFields,
	type PetFormValues,
	PetLooksFields,
	PetNotesFields,
	usePetForm,
} from '@/components/pets/pet-fields';
import { LimitNote } from '@/components/pets/pet-parts';
import { PhotoPicker } from '@/components/photos/photo-picker';
import { clearPhotoDraft, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { PermissionPrimer } from '@/components/shell/permission-primer';
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
import { FieldError, useAnnounceError } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const STEPS = ['section_photos', 'section_basics', 'section_looks', 'section_chip', 'section_notes'] as const;
const LAST = STEPS.length - 1;
const BASICS = 1;

/** The form values of a stored pet, the chip number grouped as typed. */
export function petToForm(pet: Pet): PetFormValues {
	return {
		species: pet.species,
		name: pet.name,
		breed_codes: pet.breed_codes,
		colours: pet.colours,
		pattern: pet.pattern,
		size: pet.size,
		sex: pet.sex,
		birth_year: pet.birth_year,
		chip: pet.chip_number && formatChip(pet.chip_number),
		chip_registered_crhz: pet.chip_registered_crhz,
		ear_tip: pet.ear_tip,
		lifestyle: pet.lifestyle,
		collar: pet.collar,
		notes: pet.notes,
	};
}

/**
 * The PATCH body: only fields that differ from the stored pet, so an untouched chip keeps its stored status; a species
 * switch carries the fields it cleared.
 */
function changedFields<T extends object>(values: T, before: PetFormValues): Partial<T> {
	const stored = before as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(values).filter(
			([key, value]) => JSON.stringify(value ?? null) !== JSON.stringify(stored[key] ?? null)
		)
	) as Partial<T>;
}

const isPetLimit = (error: unknown) => (error as Partial<QueryError> | null)?.data?.details?.code === 'PET_LIMIT';

/** PhotoPicker's `cameraPrimer`: the P2 camera primer sheet, resolving true on "Allow" (the picker then asks the OS). */
function useCameraPrimer() {
	const [pending, setPending] = React.useState<(granted: boolean) => void>();
	const ask = () => new Promise<boolean>((resolve) => setPending(() => resolve));
	const sheet = (
		<PermissionPrimer
			kind="camera"
			open={pending !== undefined}
			request={async () => true}
			onResult={(granted) => {
				pending?.(granted);
				setPending(undefined);
			}}
		/>
	);
	return [ask, sheet] as const;
}

/** The section's h1 (34/40); screen reader focus lands on it each time a section opens. */
function StepHeading({ children }: { children: string }) {
	const ref = useAccessibilityFocus<RNText>();
	return (
		<Text ref={ref} role="heading" className="font-display text-[34px] leading-[40px] tracking-[-0.68px]">
			{children}
		</Text>
	);
}

/**
 * P8 add and edit on mobile: five sections, one per screen (photos, basics, looks, chip, collar and notes), under a top
 * bar with back, five step bars and close, and a sticky bar with "Naprej", then "Shrani". Leaving with changes (close,
 * back on the first section, Android back) asks to discard; Android back on a later section goes one section back.
 * The photos stay mounted across sections, so their uploads keep going. Saving creates the pet (or patches what
 * changed), then sets the photo order; photos taken off an existing pet are deleted. PET_LIMIT keeps everything typed
 * and shows the limit note with Premium. No form data is written to the device (only the photo draft, C17).
 */
export function PetFlow({ pet }: { pet?: Pet }) {
	const t = useTranslations();
	const router = useRouter();
	const navigation = useNavigation();
	const errorText = useErrorText();
	const [initial] = React.useState(() => ({
		values: pet && petToForm(pet),
		photoIds: pet?.photos.map((photo) => photo.id) ?? [],
	}));
	const form = usePetForm(initial.values);
	const draft = pet ? `pet-${pet.id}` : 'pet-new';
	const [createPet] = useCreatePetMutation();
	const [updatePet] = useUpdatePetMutation();
	const [setPetPhotos] = useSetPetPhotosMutation();
	const [deletePhoto] = useDeletePhotoMutation();
	const [cameraPrimer, primerSheet] = useCameraPrimer();

	const [step, setStep] = React.useState(0);
	const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
	const [photoCheck, setPhotoCheck] = React.useState(false);
	const [saveError, setSaveError] = React.useState<string>();
	const [limitHit, setLimitHit] = React.useState(false);
	const [discard, setDiscard] = React.useState<(() => void) | null>(null);
	const leaving = React.useRef(false);
	// A pet created by an earlier attempt whose photo step failed: the retry patches it instead of creating another.
	const created = React.useRef<string>(undefined);
	const scroll = React.useRef<ScrollView>(null);

	const photoIds = photos.flatMap((photo) => (photo.photoId ? [photo.photoId] : []));
	const dirty = form.formState.isDirty || photos.map((photo) => photo.key).join() !== initial.photoIds.join();
	const photoProblem = !photos.length
		? 'photos_required'
		: photos.some((photo) => photo.status !== 'uploaded')
			? 'photos_pending'
			: undefined;
	const photoMessage = photoCheck && photoProblem ? t(`pets.${photoProblem}`) : undefined;
	useAnnounceError(photoMessage);
	useAnnounceError(saveError);

	React.useEffect(() => scroll.current?.scrollTo({ y: 0, animated: false }), [step]);

	const exit = () => (router.canGoBack() ? router.back() : router.replace('/pets'));
	const leave = (go: () => void) => {
		if (!dirty) {
			leaving.current = true;
			return go();
		}
		setDiscard(() => go);
	};
	const confirmDiscard = () => {
		void clearPhotoDraft(draft).catch(() => {});
		leaving.current = true;
		discard?.();
	};
	const back = () => (step > 0 ? setStep(step - 1) : leave(exit));

	// Android back and any other removal of this screen: one section back, or the discard question on the first.
	const beforeRemove = React.useEffectEvent((event: { preventDefault: () => void }, resume: () => void) => {
		if (leaving.current) return;
		event.preventDefault();
		if (step > 0) setStep(step - 1);
		else leave(resume);
	});
	React.useEffect(
		() =>
			navigation.addListener('beforeRemove', (event) =>
				beforeRemove(event, () => navigation.dispatch(event.data.action))
			),
		[navigation]
	);

	const save = () =>
		form.handleSubmit(
			async (values) => {
				if (photoProblem) {
					setPhotoCheck(true);
					return setStep(0);
				}
				setSaveError(undefined);
				setLimitHit(false);
				try {
					let id = pet?.id ?? created.current;
					if (id) {
						const body = initial.values ? changedFields(values, initial.values) : values;
						if (Object.keys(body).length) await updatePet({ id, body }).unwrap();
					} else {
						id = (await createPet(values).unwrap()).id;
						created.current = id;
					}
					if (photoIds.join() !== initial.photoIds.join())
						await setPetPhotos({ id, body: { photo_ids: photoIds } }).unwrap();
					// Detached photos would go with retention.purge anyway; deleting them now keeps the promise of the dialog.
					for (const gone of initial.photoIds.filter((photoId) => !photoIds.includes(photoId)))
						deletePhoto({ id: gone })
							.unwrap()
							.catch(() => {});
					await clearPhotoDraft(draft).catch(() => {});
					leaving.current = true;
					toast.success(t('pets.saved'));
					if (pet) exit();
					else router.replace(`/pets/${id}`);
				} catch (failure) {
					if (isPetLimit(failure)) setLimitHit(true);
					else setSaveError(errorText(failure));
				}
			},
			() => setStep(BASICS)
		)();

	const next = async () => {
		if (step === 0 && !photos.length) return setPhotoCheck(true);
		if (step === BASICS && !(await form.trigger(['species', 'name'], { shouldFocus: true }))) return;
		if (step < LAST) setStep(step + 1);
		else await save();
	};

	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			<View className="h-14 flex-row items-center gap-2 px-3">
				<Button variant="ghost" size="icon" aria-label={t('common.back')} onPress={back}>
					<Icon as={CaretLeftIcon} size={24} />
				</Button>
				<View
					accessible
					role="progressbar"
					aria-label={t('pets.step_a11y', { n: step + 1, total: STEPS.length })}
					aria-valuemin={1}
					aria-valuemax={STEPS.length}
					aria-valuenow={step + 1}
					className="flex-1 flex-row gap-1.5"
				>
					{STEPS.map((key, index) => (
						<View
							key={key}
							className={cn('h-1 flex-1 rounded-[2px]', index <= step ? 'bg-primary' : 'bg-muted')}
						/>
					))}
				</View>
				<Button variant="ghost" size="icon" aria-label={t('common.close')} onPress={() => leave(exit)}>
					<Icon as={XIcon} size={24} />
				</Button>
			</View>
			<FormProvider {...form}>
				<KeyboardAvoidingView behavior="padding" className="flex-1">
					<ScrollView
						ref={scroll}
						keyboardShouldPersistTaps="handled"
						contentContainerClassName="px-5 pb-8 pt-2"
					>
						<StepHeading key={step}>{t(`pets.${STEPS[step]}`)}</StepHeading>
						<View className={cn(step !== 0 && 'hidden')}>
							<Text className="mt-3">{t('pets.photos_help')}</Text>
							<PhotoPicker
								draft={draft}
								kind="pet"
								cameraPrimer={cameraPrimer}
								onChange={setPhotos}
								saved={pet?.photos}
								confirmRemove={{
									title: t('pets.photo_delete_title'),
									body: t('pets.photo_delete_body'),
									confirm: t('pets.photo_delete_confirm'),
								}}
								className="mt-6"
							/>
							{photoMessage ? <FieldError className="mt-4">{photoMessage}</FieldError> : null}
						</View>
						{step > 0 ? (
							<View className="mt-8">
								{step === 1 ? (
									<PetBasicsFields />
								) : step === 2 ? (
									<PetLooksFields />
								) : step === 3 ? (
									<PetChipFields />
								) : (
									<PetNotesFields />
								)}
							</View>
						) : null}
					</ScrollView>
					<View className="gap-3 px-5 pb-11 pt-3">
						{limitHit ? <LimitNote actions /> : null}
						{saveError ? <FieldError>{saveError}</FieldError> : null}
						<Button size="lg" loading={form.formState.isSubmitting} onPress={next}>
							{step < LAST ? t('common.next') : t('pets.save')}
						</Button>
					</View>
				</KeyboardAvoidingView>
			</FormProvider>
			<AlertDialog open={discard !== null} onOpenChange={(open) => !open && setDiscard(null)}>
				<AlertDialogContent>
					<AlertDialogTitle>{t('common.discard_title')}</AlertDialogTitle>
					<AlertDialogDescription>{t('common.discard_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel variant="default" size="lg">
							{t('common.keep_editing')}
						</AlertDialogCancel>
						<AlertDialogAction variant="text" onPress={confirmDiscard}>
							{t('common.discard_confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{primerSheet}
		</SafeAreaView>
	);
}
