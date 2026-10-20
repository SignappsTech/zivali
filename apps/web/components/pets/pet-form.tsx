'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { del, get, set } from 'idb-keyval';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { uuid } from '@zivali/api/client';
import { useCreatePetMutation, useSetPetPhotosMutation, useUpdatePetMutation } from '@zivali/api/pets';
import type { QueryError } from '@zivali/api/rtk';
import type { Pet } from '@zivali/types';
import { PetInput } from '@zivali/validation/pets.schema';
import { AiNotice, AiSlot } from '@/components/ai/ai-parts';
import { type AiField, PET_AI_FIELDS } from '@/components/ai/prefill';
import { useFormPrefill } from '@/components/ai/use-prefill';
import { PetLoader } from '@/components/pets/pet-detail';
import { emptyPetFields, groupChip, PetFields, type PetFieldValues } from '@/components/pets/pet-fields';
import { backLinkClass, FREE_PET_LIMIT, LimitNote, useErrorText, usePetMeta } from '@/components/pets/pet-list';
import { PhotoPicker, type PhotoPickerHandle } from '@/components/photos/photo-picker';
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
import { photoWhole } from '@/lib/photo';
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
 * of creating another. One Idempotency-Key per create chain (C1): a retry of the same values reuses it, so a lost
 * response never makes a second pet; changed values or PET_LIMIT (a replayed answer) start a new chain. PET_LIMIT shows
 * the free-limit note under the heading and keeps everything typed. Leaving through the back link with changes asks
 * first; closing the tab gets the browser's prompt. What the person typed or chose stays in a draft until Save or
 * Discard, so leaving any other way and coming back (or a reload) restores it (GH#6).
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
	const values = useWatch({ control: form.control });
	const { name, species, breed_codes: breeds } = values;
	const draft = `pet:${pet?.id ?? 'new'}`;
	// C4 §Drafts: the changed fields beside the photos' own draft (`photos:pet:…`); EXIF never goes in, and sign-out
	// deletes both (CH-401).
	const fieldsDraft = `draft:${draft}`;
	const [restored, setRestored] = useState(false);
	// Saved or discarded: the draft is not written again.
	const [settled, setSettled] = useState(false);
	const [photos, setPhotos] = useState<PickedPhoto[]>([]);
	const [id, setId] = useState(pet?.id);
	const [limit, setLimit] = useState<number>();
	const [leaving, setLeaving] = useState(false);
	const limitNote = useRef<HTMLDivElement>(null);
	const picker = useRef<PhotoPickerHandle>(null);
	// C19: suggestions from the first photo fill empty fields with marks; the person's Save confirms them.
	const ai = useFormPrefill(() => form, photos, { fields: PET_AI_FIELDS, analytics: 'pet' });
	const [chain, setChain] = useState<{ body: string; key: string }>();
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
	// The idb-keyval calls run inside async functions: without IndexedDB they throw at once, and the form stays usable.
	useEffect(() => {
		let live = true;
		const restore = async () => {
			const stored = await get<Partial<PetFieldValues>>(fieldsDraft);
			if (!live) return;
			// Dirty, as typed: the edit form PATCHes them with the person's Save.
			for (const [field, value] of Object.entries(stored ?? {}))
				form.setValue(field as keyof PetFieldValues, value, { shouldDirty: true });
		};
		void restore()
			.catch(() => {})
			.finally(() => live && setRestored(true));
		return () => {
			live = false;
		};
	}, [form, fieldsDraft]);
	// Only what differs from the start values; a field with an AI mark stays out, so the pre-fill marks it again.
	useEffect(() => {
		if (!restored || settled) return;
		const changed = Object.entries(values).filter(
			([field]) => form.getFieldState(field as keyof PetFieldValues).isDirty && !ai.marks.has(field as AiField)
		);
		const write = async () => (changed.length ? set(fieldsDraft, Object.fromEntries(changed)) : del(fieldsDraft));
		void write().catch(() => {});
	}, [restored, settled, values, ai.marks, form, fieldsDraft]);
	const dropDraft = () => {
		setSettled(true);
		return Promise.all([clearPhotoDraft(draft), del(fieldsDraft).catch(() => {})]);
	};

	const create = (body: Saved) => {
		const pinned = JSON.stringify(body);
		const key = chain?.body === pinned ? chain.key : uuid();
		setChain({ body: pinned, key });
		return createPet({ body, idempotencyKey: key }).unwrap();
	};

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
						: await create(values);
			setId(saved.id);
			if (photoIds.join() !== savedIds)
				await setPetPhotos({ id: saved.id, body: { photo_ids: photoIds } }).unwrap();
			await dropDraft();
			toast.success(t('saved'));
			router.push({ pathname: '/my-pets/[id]', params: { id: saved.id } });
		} catch (failure) {
			const data = (failure as Partial<QueryError>).data;
			const details = data?.details;
			if (details?.code === 'PET_LIMIT') {
				setChain(undefined);
				setLimit(Number(details.limit) || FREE_PET_LIMIT);
			}
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
	// The check before saving (wireframe F7): the note by Save, never blocking, and "Preveri predloge".
	const slot = (
		<AiSlot
			ai={ai}
			note="save"
			onReview={() => {
				const first = PET_AI_FIELDS.find((field) => ai.marks.has(field));
				if (first && first !== 'collar') form.setFocus(first);
			}}
			onChangePhoto={() => picker.current?.replaceFirst()}
			onCrop={() => picker.current?.cropFirst()}
		/>
	);

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
							<PhotoPicker
								ref={picker}
								draft={draft}
								saved={pet?.photos}
								analytics={{ flow: 'pet', step: 'form' }}
								onChange={setPhotos}
								onCropped={(index) => index === 0 && ai.recheck()}
								firstNote={
									ai.notice && (
										<AiNotice
											notice={ai.notice}
											onChangePhoto={() => picker.current?.replaceFirst()}
											onCrop={() => picker.current?.cropFirst()}
											onKeep={ai.dismissNotice}
										/>
									)
								}
							/>
						</section>
						<PetFields ai={ai} />
					</div>
					<div className="mt-10 grid gap-4 lg:hidden">
						{slot}
						{save('justify-self-start')}
					</div>
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
						className={cn('aspect-[4/3] w-full rounded-card bg-muted', photoWhole)}
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
				{slot}
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
								await dropDraft();
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
