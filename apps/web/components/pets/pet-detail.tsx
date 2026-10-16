'use client';

import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useArchivePetMutation, useDeletePetMutation, useGetPetQuery } from '@zivali/api/pets';
import type { QueryError } from '@zivali/api/rtk';
import type { Pet } from '@zivali/types';
import { groupChip } from '@/components/pets/pet-fields';
import { ArchivedLabel, backLinkClass, ChipStatus, useErrorText, usePetMeta } from '@/components/pets/pet-list';
import { ErrorPage, h1Class, InlineError, PageSkeleton } from '@/components/shell/page';
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
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Codes that mean "not your pet, or no such pet": the 404 page, never a hint which one. */
const MISSING = new Set(['NOT_FOUND', 'FORBIDDEN', 'VALIDATION']);

/**
 * Loads one own pet (C4 GET /v1/pets/:id) for the detail and edit pages. Data first: a refetch that fails after a
 * delete keeps the last pet on screen until the list page takes over.
 */
export function PetLoader({ id, children }: { id: string; children: (pet: Pet) => React.ReactNode }) {
	const query = useGetPetQuery({ id });
	if (query.currentData) return children(query.currentData);
	if (query.isError)
		return MISSING.has((query.error as QueryError).data?.code) ? (
			<ErrorPage status={404} />
		) : (
			<InlineError onRetry={query.refetch} retrying={query.isFetching} />
		);
	return <PageSkeleton />;
}

/** The detail page's client part: the pet by id. */
export function PetDetailById({ id }: { id: string }) {
	return <PetLoader id={id}>{(pet) => <PetDetail pet={pet} />}</PetLoader>;
}

const factsLabel = 'text-sm font-bold text-muted-foreground';
const headingClass = 'font-display text-xl font-semibold tracking-[-0.01em]';

/**
 * P8 pet detail (W3, owner only): photos left from lg (cover radius 32, 96 px thumbs), then name, the one primary
 * "Report as lost" (P6 with this pet), the facts, the chip row and Edit / Archive / Delete. The chip number shows
 * only here, behind a reveal toggle; archived pets cannot be reported lost from their profile.
 */
export function PetDetail({ pet }: { pet: Pet }) {
	const t = useTranslations('pets');
	const tCommon = useTranslations('common');
	const ta = useTranslations('attributes');
	const tb = useTranslations('breeds');
	const meta = usePetMeta();
	const errorText = useErrorText();
	const router = useRouter();
	const [shown, setShown] = useState(false);
	const heading = useRef<HTMLHeadingElement>(null);
	const archiving = useRef(false);
	const [deletePet] = useDeletePetMutation();
	const [archivePet] = useArchivePetMutation();
	const [cover, ...more] = pet.photos;

	const facts = [
		[t('fact_species'), ta(`species.${pet.species}`)],
		[t('fact_sex'), pet.sex && ta(`sex.${pet.sex}`)],
		[t('fact_breed'), pet.breed_codes.map((code) => tb(code)).join(', ')],
		[t('fact_born'), pet.birth_year],
		[t('fact_colour'), pet.colours.map((colour) => ta(`colours.${colour}`)).join(', ')],
		[t('fact_pattern'), pet.pattern && ta(`patterns.${pet.pattern}`)],
		[t('fact_size'), pet.size && ta(`size.${pet.size}`)],
		[t('fact_collar'), pet.collar],
		[t('notes_label'), pet.notes],
	].filter(([, value]) => value);

	// The Archive trigger unmounts once the pet is archived; focus would drop to the body, so it goes to the name.
	useEffect(() => {
		if (pet.archived_at && archiving.current) heading.current?.focus();
	}, [pet.archived_at]);

	const remove = async () => {
		try {
			await deletePet({ id: pet.id }).unwrap();
			toast.success(t('deleted'));
			router.push('/my-pets');
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	const archive = async () => {
		try {
			archiving.current = true;
			await archivePet({ id: pet.id }).unwrap();
			toast.success(t('archived'));
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};

	return (
		<>
			<Link href="/my-pets" className={backLinkClass}>
				<CaretLeftIcon weight="bold" aria-hidden="true" className="size-5" />
				{t('title')}
			</Link>
			<div className={cn('mt-4 grid items-start gap-8 lg:gap-12', cover && 'lg:grid-cols-2')}>
				{cover && (
					<div>
						{/* 10-minute presigned thumbs (C5): nothing for next/image to cache. */}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={cover.thumb_url}
							alt={t('photo_alt', { name: pet.name, n: 1 })}
							width={480}
							height={360}
							className="aspect-[4/3] w-full rounded-[32px] bg-muted object-cover"
						/>
						{more.length > 0 && (
							<ul aria-label={t('section_photos')} className="mt-4 flex flex-wrap gap-3">
								{more.map((photo, index) => (
									<li key={photo.id}>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={photo.thumb_url}
											alt={t('photo_alt', { name: pet.name, n: index + 2 })}
											width={96}
											height={96}
											className="size-24 rounded-row bg-muted object-cover"
										/>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
				<div className="min-w-0">
					<h1 ref={heading} tabIndex={-1} className={cn(h1Class, 'break-words outline-none')}>
						{pet.name}
					</h1>
					<p className="mt-1 text-muted-foreground lg:mt-2 lg:text-xl lg:leading-8">{meta(pet)}</p>
					{pet.archived_at ? (
						<p className="mt-4">
							<ArchivedLabel />
						</p>
					) : (
						<Button asChild size="lg" className="mt-5 max-sm:w-full lg:mt-6">
							<Link href={{ pathname: '/report/lost', query: { pet: pet.id } }}>{t('report_lost')}</Link>
						</Button>
					)}
					<dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 lg:mt-10">
						{facts.map(([label, value]) => (
							<div key={String(label)} className={cn(label === t('notes_label') && 'col-span-2')}>
								<dt className={factsLabel}>{label}</dt>
								<dd className="mt-0.5 break-words whitespace-pre-line">{value}</dd>
							</div>
						))}
					</dl>

					<section aria-labelledby="pet-chip" className="mt-8 lg:mt-10">
						<h2 id="pet-chip" className={cn(headingClass, 'mb-2')}>
							{t('chip_row')}
						</h2>
						{pet.chip_number ? (
							<>
								<p className="text-xl leading-7 font-bold tracking-[0.02em] tabular-nums">
									{shown ? (
										groupChip(pet.chip_number)
									) : (
										// The digits' length, not the digits: the number stays out of the page until asked for.
										<>
											<span aria-hidden="true">
												{groupChip(pet.chip_number).replace(/\d/g, '•')}
											</span>
											<span className="sr-only">{t('chip_hidden')}</span>
										</>
									)}
								</p>
								<Button variant="text" className="mt-1 -ml-3" onClick={() => setShown(!shown)}>
									{shown ? (
										<EyeSlashIcon weight="bold" aria-hidden="true" />
									) : (
										<EyeIcon weight="bold" aria-hidden="true" />
									)}
									{t(shown ? 'chip_hide' : 'chip_show')}
								</Button>
								<p className="flex items-center gap-2 text-sm text-muted-foreground">
									<LockSimpleIcon weight="bold" aria-hidden="true" className="size-4.5 shrink-0" />
									{t('chip_only_you')}
								</p>
							</>
						) : (
							<ChipStatus status={pet.chip_status} />
						)}
					</section>

					<div className="mt-8 -ml-3 flex flex-wrap gap-2 lg:mt-10">
						<Button asChild variant="text">
							<Link href={{ pathname: '/my-pets/[id]/edit', params: { id: pet.id } }}>
								<PencilSimpleIcon weight="bold" aria-hidden="true" />
								{t('edit')}
							</Link>
						</Button>
						{!pet.archived_at && (
							<Confirm
								trigger={
									<>
										<ArchiveIcon weight="bold" aria-hidden="true" />
										{t('archive')}
									</>
								}
								title={t('archive_title')}
								body={t('archive_body')}
								confirm={t('archive_confirm')}
								cancel={tCommon('cancel')}
								onConfirm={archive}
							/>
						)}
						<Confirm
							destructive
							trigger={
								<>
									<TrashIcon weight="bold" aria-hidden="true" />
									{t('delete')}
								</>
							}
							title={t('delete_title')}
							body={t('delete_body')}
							confirm={t('delete_confirm')}
							cancel={tCommon('cancel')}
							onConfirm={remove}
						/>
					</div>
				</div>
			</div>
		</>
	);
}

type ConfirmProps = {
	trigger: React.ReactNode;
	title: string;
	body: string;
	confirm: string;
	cancel: string;
	onConfirm: () => void;
	destructive?: boolean;
};

/** A text button that asks first (alert dialog: focus starts on Cancel, the main action on top). */
function Confirm({ trigger, title, body, confirm, cancel, onConfirm, destructive = false }: ConfirmProps) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="text" className={cn(destructive && 'text-destructive')}>
					{trigger}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription>{body}</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
						{confirm}
					</AlertDialogAction>
					<AlertDialogCancel>{cancel}</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
