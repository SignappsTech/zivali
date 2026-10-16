'use client';

import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';
import { useTranslations } from 'next-intl';

import { useResponsibleShelter } from '@zivali/api/directory';
import type { LatLng } from '@/components/map/map-view';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** The find goes to `found`, a sighting is the softer `sighted`; `lost` is the owner's own report. */
export type Kind = 'lost' | 'found' | 'sighted';

/** Muted note with the directory link (P7 C4): no municipality, or no confirmed shelter and none near. */
function DirectoryNote({ text, className }: { text: string; className?: string }) {
	const t = useTranslations('shelter_row');
	return (
		<div className={cn(noteClass, className)}>
			<PhoneIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
			<div className="min-w-0 flex-1">
				<p>{text}</p>
				<Button asChild variant="text" className="mt-1 -ml-3">
					<Link href="/shelters">{t('directory_link')}</Link>
				</Button>
			</div>
		</div>
	);
}

/** One shelter: bold name, "Ni potrjeno" when it is a guess, the number, Pokliči (`tel:`) and its page. */
function ShelterLines({
	name,
	slug,
	phone,
	display,
	unconfirmed = false,
}: {
	name: string;
	slug: string;
	phone?: string;
	display?: string;
	unconfirmed?: boolean;
}) {
	const t = useTranslations('shelter_row');
	return (
		<div>
			<p className="font-bold">{name}</p>
			{unconfirmed && (
				<>
					<p className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
						<QuestionIcon weight="bold" aria-hidden="true" className="size-4 shrink-0" />
						{t('unconfirmed_note')}
					</p>
					{phone && <p className="text-sm text-muted-foreground">{t('unconfirmed_note_hint')}</p>}
				</>
			)}
			{phone && <p className={cn('tabular-nums', unconfirmed && 'mt-1')}>{display ?? phone}</p>}
			{phone && (
				<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
					<Button asChild variant="secondary" size="sm">
						<a href={`tel:${phone.replace(/[^+\d]/g, '')}`} aria-label={t('call_a11y', { shelter: name })}>
							<PhoneIcon weight="bold" aria-hidden="true" />
							{t('call')}
						</a>
					</Button>
					<Button asChild variant="text" className="-ml-3">
						<Link href={{ pathname: '/shelters/[slug]', params: { slug } }}>{t('details_link')}</Link>
					</Button>
				</div>
			)}
		</div>
	);
}

/**
 * The responsible-shelter row (P6/P7 `shelter_row`, FR-044, C18), the web twin of the mobile ShelterRow: a phone icon
 * row, no card. `found` (the finder has the animal) and `lost` add "Prijava na Najdimo tega ne nadomesti.", `found`
 * also the chip line; `sighted` is the softer sentence. Confirmed shelters get Pokliči; a likely one says "Ni
 * potrjeno"; otherwise the nearest names or the directory note, never a guessed number. No statutory deadline: that
 * text waits for `content.legal_timings` and the lawyer's wording (P6 content slice). Needs a StoreProvider above it.
 */
export function ShelterRow({
	point,
	municipality,
	kind,
	className,
}: {
	/** The report's point; null (not known yet) shows the skeleton. */
	point: LatLng | null;
	/** The municipality slug the API derived for the report; wins over the point (no rounding across a border). */
	municipality?: string;
	kind: Kind;
	className?: string;
}) {
	const t = useTranslations('shelter_row');
	const tc = useTranslations('common');
	const result = useResponsibleShelter(municipality ? { municipality } : point);

	if (result.status === 'loading')
		return (
			<div aria-busy="true" className={cn('flex gap-3.5', className)}>
				<p className="sr-only">{tc('loading')}</p>
				<Skeleton aria-hidden="true" className="size-6 rounded-full" />
				<div aria-hidden="true" className="grid flex-1 gap-2">
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-5 w-2/3" />
				</div>
			</div>
		);
	const name = result.municipality?.name;
	if (result.status === 'error' || result.status === 'outside_slovenia' || !name)
		return <DirectoryNote text={t('unknown_municipality')} className={className} />;
	if (result.status === 'unconfirmed' && result.nearest.length === 0)
		return <DirectoryNote text={t('unconfirmed', { municipality: name })} className={className} />;

	const body = t(`${kind}_body`, { municipality: name });
	return (
		<div className={cn('grid grid-cols-[24px_minmax(0,1fr)] gap-3.5', className)}>
			<PhoneIcon weight="bold" aria-hidden="true" className="mt-0.5 size-6 text-primary" />
			<div>
				<p>{kind === 'sighted' ? body : `${body} ${t('not_replace')}`}</p>
				<div className="mt-3">
					{result.status === 'confirmed' && (
						<ShelterLines
							name={result.shelter.name}
							slug={result.shelter.slug}
							phone={result.shelter.phone}
							display={result.shelter.phone_display}
						/>
					)}
					{result.status === 'likely' && (
						<>
							<p className="text-sm font-bold text-muted-foreground">{t('suggested_label')}</p>
							<ShelterLines
								name={result.likely_shelter.name}
								slug={result.likely_shelter.slug}
								phone={result.likely_shelter.phone}
								unconfirmed
							/>
						</>
					)}
					{result.status === 'unconfirmed' && (
						<>
							<p className="text-sm font-bold text-muted-foreground">{t('nearest_label')}</p>
							<ul className="mt-2 grid gap-4">
								{result.nearest.map((shelter) => (
									<li key={shelter.slug}>
										<ShelterLines name={shelter.name} slug={shelter.slug} unconfirmed />
									</li>
								))}
							</ul>
							<Button asChild variant="text" className="mt-1 -ml-3">
								<Link href="/shelters">{t('directory_link')}</Link>
							</Button>
						</>
					)}
				</div>
				{kind === 'found' && <p className="mt-3 text-sm text-muted-foreground">{t('chip_line')}</p>}
			</div>
		</div>
	);
}
