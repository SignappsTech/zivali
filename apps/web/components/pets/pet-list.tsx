'use client';

import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { ShieldSlashIcon } from '@phosphor-icons/react/dist/ssr/ShieldSlash';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { useTranslations } from 'next-intl';

import { useListPetsQuery } from '@zivali/api/pets';
import type { QueryError } from '@zivali/api/rtk';
import type { Pet } from '@zivali/types';
import { InlineError, ringClass, SpotIllustration, h1Class } from '@/components/shell/page';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Active pets a free account keeps (C4, app_config `pets.free_limit`); the API answers more with PET_LIMIT. */
export const FREE_PET_LIMIT = 2;

/** The text link back to the list (P8 W2, W3): caret-left, primary, underlined. */
export const backLinkClass = cn(
	'-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg font-bold text-primary underline decoration-2 underline-offset-4 hover:decoration-3',
	ringClass
);

/** A failed call's message (C1 code → `errors.<code>`, else the generic one); auth/parts' twin without supabase-js. */
export function useErrorText() {
	const t = useTranslations('errors');
	return (failure: unknown) => {
		const code = (failure as Partial<QueryError>).data?.code;
		if (code === 'RATE_LIMITED') return t('RATE_LIMITED_generic');
		return code && t.has(code) ? t(code) : t('INTERNAL');
	};
}

/** "Pes · Beagle": species and the first breed, localised. */
export function usePetMeta() {
	const ta = useTranslations('attributes');
	const tb = useTranslations('breeds');
	const t = useTranslations('pets');
	return (pet: Pick<Pet, 'species' | 'breed_codes'>) => {
		const species = ta(`species.${pet.species}`);
		const breed = pet.breed_codes[0];
		return breed ? t('row_meta', { species, breed: tb(breed) }) : species;
	};
}

const CHIP = {
	valid: { label: 'chip_on_file', Icon: ShieldCheckIcon, weight: 'fill', tone: '', icon: 'text-primary' },
	invalid: {
		label: 'chip_unknown',
		Icon: ShieldWarningIcon,
		weight: 'bold',
		tone: 'text-muted-foreground',
		icon: '',
	},
	none: { label: 'chip_none', Icon: ShieldSlashIcon, weight: 'regular', tone: 'text-muted-foreground', icon: '' },
} as const;

/** Whether a chip is on file, as icon + word (system §10.5); never the number. */
export function ChipStatus({ status, className }: { status: Pet['chip_status']; className?: string }) {
	const t = useTranslations('pets');
	const chip = CHIP[status];
	return (
		<span className={cn('inline-flex items-center gap-[5px] text-sm font-bold', chip.tone, className)}>
			<chip.Icon weight={chip.weight} aria-hidden="true" className={cn('size-4 shrink-0', chip.icon)} />
			{t(chip.label)}
		</span>
	);
}

/** The quiet free-limit note (P8): no modal, the add action stays; reporting a pet lost never needs a profile. */
export function LimitNote({ limit, className, ...props }: { limit: number } & React.ComponentProps<'div'>) {
	const t = useTranslations('pets');
	return (
		<div role="status" className={cn(noteClass, className)} {...props}>
			<InfoIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
			<p>{t('limit_note_premium', { limit })}</p>
		</div>
	);
}

/** The pet's cover photo (or a paw on muted) at row size, 64 px, radius 20. */
function RowPhoto({ pet }: { pet: Pet }) {
	const cover = pet.photos[0];
	if (!cover)
		return (
			<span className="grid size-16 place-items-center rounded-row bg-muted text-muted-foreground">
				<PawPrintIcon weight="bold" aria-hidden="true" className="size-7" />
			</span>
		);
	return (
		// eslint-disable-next-line @next/next/no-img-element -- a 10-minute presigned thumb (C5), nothing to cache
		<img
			src={cover.thumb_url}
			alt={pet.name}
			width={64}
			height={64}
			className="size-16 rounded-row bg-muted object-cover"
		/>
	);
}

/**
 * P8 list "Moje živali": heading, count and the one primary "Dodaj žival", the free-limit note at the limit, then a
 * row per pet (photo, name, species and breed, chip status), archived ones last. Loading keeps the row geometry.
 */
// A stable ref callback: focus on mount only, not on every render.
const focusOnMount = (node: HTMLElement | null) => node?.focus({ preventScroll: true });

export function PetList() {
	const t = useTranslations('pets');
	const tCommon = useTranslations('common');
	const meta = usePetMeta();
	const query = useListPetsQuery();
	// After a delete the router lands here: focus goes to the heading rather than the body.
	const heading = (
		<h1 ref={focusOnMount} tabIndex={-1} className={cn(h1Class, 'outline-none')}>
			{t('title')}
		</h1>
	);
	const pets = query.data?.items;
	const add = (
		<Button asChild size="lg" className="max-sm:w-full">
			<Link href="/my-pets/new">
				<PlusIcon weight="bold" aria-hidden="true" />
				{t('add')}
			</Link>
		</Button>
	);

	if (query.isError && !pets)
		return (
			<>
				{heading}
				<div className="mt-8">
					<InlineError onRetry={query.refetch} retrying={query.isFetching} />
				</div>
			</>
		);
	if (!pets)
		return (
			<div aria-busy="true">
				{heading}
				<p role="status" className="sr-only">
					{tCommon('loading')}
				</p>
				<div aria-hidden="true" className="mt-10 grid gap-6 lg:gap-8">
					{['w-28', 'w-20'].map((width) => (
						<div key={width} className="flex items-center gap-4">
							<Skeleton className="size-16 shrink-0 rounded-row" />
							<div className="grid flex-1 gap-2">
								<Skeleton className={cn('h-5', width)} />
								<Skeleton className="h-4 w-48 max-w-full" />
								<Skeleton className="h-4 w-24" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	if (pets.length === 0)
		return (
			<>
				{heading}
				<EmptyState
					className="mt-8"
					illustration={<SpotIllustration />}
					title={t('empty_title')}
					description={t('empty_body')}
					action={add}
				/>
			</>
		);

	const active = pets.filter((pet) => !pet.archived_at);
	const rows = [...active, ...pets.filter((pet) => pet.archived_at)];
	return (
		<>
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
				<div>
					{heading}
					<p className="mt-1 text-muted-foreground lg:mt-2 lg:text-lg">
						{t('count', { count: pets.length })}
					</p>
				</div>
				{add}
			</div>
			{active.length >= FREE_PET_LIMIT && <LimitNote limit={FREE_PET_LIMIT} className="mt-4 lg:mt-6" />}
			<ul aria-label={t('title')} className="mt-8 grid gap-6 lg:mt-10 lg:gap-8">
				{rows.map((pet) => (
					<li key={pet.id}>
						<Link
							href={{ pathname: '/my-pets/[id]', params: { id: pet.id } }}
							className={cn(
								'-m-2 grid grid-cols-[64px_minmax(0,1fr)_24px] items-center gap-4 rounded-row p-2 text-foreground hover:bg-foreground/10',
								ringClass
							)}
						>
							<RowPhoto pet={pet} />
							<span className="grid">
								<span className="text-lg leading-6 font-bold">{pet.name}</span>
								<span className="text-[15px] leading-[22px] text-muted-foreground">{meta(pet)}</span>
								<span className="mt-0.5 flex flex-wrap gap-x-4">
									<ChipStatus status={pet.chip_status} />
									{pet.archived_at && <ArchivedLabel />}
								</span>
							</span>
							<CaretRightIcon
								weight="bold"
								aria-hidden="true"
								className="size-[22px] text-muted-foreground"
							/>
						</Link>
					</li>
				))}
			</ul>
		</>
	);
}

/** Archived pets stay listed (they no longer count to the limit); the word says so. */
export function ArchivedLabel() {
	const t = useTranslations('pets');
	return (
		<span className="inline-flex items-center gap-[5px] text-sm font-bold text-muted-foreground">
			<ArchiveIcon weight="bold" aria-hidden="true" className="size-4 shrink-0" />
			{t('archived_label')}
		</span>
	);
}
