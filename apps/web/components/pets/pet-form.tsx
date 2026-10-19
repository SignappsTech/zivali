'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { useCreatePetMutation, useSetPetPhotosMutation, useUpdatePetMutation } from '@zivali/api/pets';
import type { QueryError } from '@zivali/api/rtk';
import type { Pet } from '@zivali/types';
import { PetInput } from '@zivali/validation/pets.schema';
import { PetLoader } from '@/components/pets/pet-detail';
import { emptyPetFields, groupChip, PetFields, type PetFieldValues } from '@/components/pets/pet-fields';
import { backLinkClass, FREE_PET_LIMIT, LimitNote, useErrorText, usePetMeta } from '@/components/pets/pet-list';
import { PhotoPicker } from '@/components/photos/photo-picker';
import { clearPhotoDraft, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { h1Class } from '@/components/shell/page';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { useRouter } from '@/i18n/client-navigation';
import { Link } from '@/i18n/navigation';
import { photoCrop } from '@/lib/photo';
import { cn } from '@/lib/utils';

type Saved = z.output<typeof PetInput>;

/** A stored pet as form values; the chip shows grouped, as it was typed. */
const toValues = (pet: Pet): PetFieldValues => ({
	species: pet.species,
	name: pet.name,
	breed_codes: pet.breed_codes,
	colours: pet.colours,
	pattern: pet.pattern,
	size: pet.size,
	sex: pet.sex,
	birth_year: pet.birth_year,
	chip: pet.chip_number ? groupChip(pet.chip_number) : '',
	chip_registered_crhz: pet.chip_registered_crhz,
	ear_tip: pet.ear_tip,
	lifestyle: pet.lifestyle,
	collar: pet.collar,
	notes: pet.notes,
});

const sectionHeadingClass = 'font-display text-xl font-semibold tracking-[-0.01em]';

/**
 * P8 add and edit (W2): photos (PhotoPicker), then PetFields, Save at the end of the page and, from lg, in a sticky
 * summary. Create posts the pet and then its photo order; a retry after a failed photo step updates that pet instead
 * of creating another. PET_LIMIT shows the free-limit note under the heading and keeps everything typed. Leaving
 * through the back link with changes asks first; closing the tab gets the browser's prompt.
 */
export function PetForm({ pet }: { pet?: Pet }) {
	const t = useTranslations('pets');
	const tCommon = useTranslations('common');
	const tPhotos = useTranslations('photos');
	const errorText = useErrorText();
	const meta = usePetMeta();
	const router = useRouter();
	const form = useForm<PetFieldValues, unknown, Saved>({
		resolver: zodResolver(PetInput),
		defaultValues: pet ? toValues(pet) : emptyPetFields,
	});
	const { isDirty, dirtyFields, isSubmitting } = form.formState;
	const [name, species, breeds] = useWatch({ control: form.control, name: ['name', 'species', 'breed_codes'] });
	const draft = `pet:${pet?.id ?? 'new'}`;
	const [photos, setPhotos] = useState<PickedPhoto[]>([]);
	const [id, setId] = useState(pet?.id);
	const [limit, setLimit] = useState<number>();
	const [leaving, setLeaving] = useState(false);
	const limitNote = useRef<HTMLDivElement>(null);
	const [createPet] = useCreatePetMutation();
	const [updatePet] = useUpdatePetMutation();
	const [setPetPhotos] = useSetPetPhotosMutation();

	const savedIds = (pet?.photos ?? []).map((photo) => photo.id).join();
	const photoIds = photos.flatMap((photo) => (photo.status === 'uploaded' && photo.photoId ? [photo.photoId] : []));
	const uploading = photos.some((photo) => photo.status === 'uploading');
	const dirty = isDirty || photos.map((photo) => photo.key).join() !== savedIds;

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [dirty]);
	useEffect(() => {
		if (limit) limitNote.current?.focus();
	}, [limit]);

	const submit = form.handleSubmit(async (values) => {
		if (uploading) return;
		setLimit(undefined);
		try {
			// PATCH only what changed, so an untouched "unknown chip" is not saved over as "no chip".
			const changes = Object.fromEntries(
				Object.entries(values).filter(([field]) => dirtyFields[field as keyof PetFieldValues])
			);
			// A photos-only edit has nothing to PATCH.
			const saved =
				id && Object.keys(changes).length === 0
					? { id }
					: id
						? await updatePet({ id, body: changes }).unwrap()
						: await createPet(values).unwrap();
			setId(saved.id);
			if (photoIds.join() !== savedIds)
				await setPetPhotos({ id: saved.id, body: { photo_ids: photoIds } }).unwrap();
			await clearPhotoDraft(draft);
			toast.success(t('saved'));
			router.push({ pathname: '/my-pets/[id]', params: { id: saved.id } });
		} catch (failure) {
			const data = (failure as Partial<QueryError>).data;
			const details = data?.details;
			if (details?.code === 'PET_LIMIT') setLimit(Number(details.limit) || FREE_PET_LIMIT);
			// The API refused a photo (TASK-114.5): say which part failed, not "check the marked fields".
			else if (data?.code === 'VALIDATION' && data.issues?.some((issue) => issue.path.startsWith('photo_ids')))
				toast.error(tPhotos('rejected'));
			else toast.error(errorText(failure));
		}
	});

	const save = (className?: string) => (
		<Button type="submit" form="pet-form" size="lg" loading={isSubmitting || uploading} className={className}>
			{t('save')}
		</Button>
	);
	const cover = photos[0];

	return (
		<div className="lg:grid lg:grid-cols-[minmax(0,640px)_320px] lg:items-start lg:gap-16">
			<FormProvider {...form}>
				<form id="pet-form" noValidate onSubmit={submit} className="min-w-0">
					<Link
						href="/my-pets"
						className={backLinkClass}
						onClick={(event) => {
							if (!dirty) return;
							event.preventDefault();
							setLeaving(true);
						}}
					>
						<CaretLeftIcon weight="bold" aria-hidden="true" className="size-5" />
						{t('title')}
					</Link>
					<h1 className={cn(h1Class, 'mt-2')}>{t(pet ? 'edit_title' : 'new_title')}</h1>
					{limit && <LimitNote ref={limitNote} tabIndex={-1} limit={limit} className="mt-6 outline-none" />}
					<div className="mt-10 grid gap-10">
						<section aria-labelledby="pet-photos" className="grid gap-6">
							<div className="grid gap-2">
								<h2 id="pet-photos" className={sectionHeadingClass}>
									{t('section_photos')}
								</h2>
								<p className="text-sm text-muted-foreground">{t('photos_help')}</p>
							</div>
							<PhotoPicker draft={draft} saved={pet?.photos} onChange={setPhotos} />
						</section>
						<PetFields />
					</div>
					{save('mt-10 lg:hidden')}
				</form>
			</FormProvider>

			{/* Sticky summary from lg: the cover, the name as typed, and the one Save. */}
			<div className="sticky top-6 hidden gap-4 lg:grid">
				{cover && (
					// eslint-disable-next-line @next/next/no-img-element -- a local object URL or a presigned thumb
					<img
						src={cover.preview}
						alt=""
						width={320}
						height={240}
						className={cn('aspect-[4/3] w-full rounded-card bg-muted', photoCrop)}
					/>
				)}
				{name && (
					<div>
						<p className="font-display text-2xl font-bold tracking-[-0.01em] break-words">{name}</p>
						{species && (
							<p className="text-[15px] leading-[22px] text-muted-foreground">
								{meta({ species, breed_codes: breeds ?? [] })}
							</p>
						)}
					</div>
				)}
				{save('w-full')}
			</div>

			<AlertDialog open={leaving} onOpenChange={setLeaving}>
				<AlertDialogContent>
					<AlertDialogTitle>{tCommon('discard_title')}</AlertDialogTitle>
					<AlertDialogDescription>{tCommon('discard_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel className={buttonVariants({ size: 'lg' })}>
							{tCommon('keep_editing')}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="text"
							onClick={async () => {
								await clearPhotoDraft(draft);
								router.push('/my-pets');
							}}
						>
							{tCommon('discard_confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

/** The edit page's client part: the pet by id, then its form. */
export function PetEditById({ id }: { id: string }) {
	return <PetLoader id={id}>{(pet) => <PetForm key={pet.id} pet={pet} />}</PetLoader>;
}
