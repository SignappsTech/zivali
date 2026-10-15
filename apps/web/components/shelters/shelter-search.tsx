'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { SealQuestionIcon } from '@phosphor-icons/react/dist/ssr/SealQuestion';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useMemo, useRef, useState } from 'react';

import { type MunicipalityRef, toResult, useGetResponsibleShelterQuery } from '@zivali/api/directory';
import { formatCount } from '@zivali/i18n/format';
import { noteClass, titleLinkClass } from '@/components/shelters/classes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Case- and diacritics-blind ("skof" finds "Škofja Loka"); one character in, one out, so offsets carry over. */
const fold = (text: string) => [...text].map((c) => c.normalize('NFD')[0]!.toLowerCase()).join('');
const MAX_OPTIONS = 8;

/** T5 municipality combobox (ARIA 1.2 list autocomplete) and the responsible-shelter answer under it. */
export function ShelterSearch({
	municipalities,
	className,
}: {
	municipalities: MunicipalityRef[];
	className?: string;
}) {
	const t = useTranslations('shelters');
	const id = useId();
	const input = useRef<HTMLInputElement>(null);
	const [text, setText] = useState('');
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [chosen, setChosen] = useState<MunicipalityRef | null>(null);

	const query = fold(text.trim());
	const matches = useMemo(() => {
		if (!query) return [];
		const hits = municipalities.filter((m) => fold(m.name).includes(query));
		// Names that start with the text first: "lo" lists Loški Potok before Škofja Loka.
		return hits.sort((a, b) => Number(!fold(a.name).startsWith(query)) - Number(!fold(b.name).startsWith(query)));
	}, [municipalities, query]);
	const options = matches.slice(0, MAX_OPTIONS);
	const expanded = open && options.length > 0;

	const choose = (municipality: MunicipalityRef) => {
		setText(municipality.name);
		setChosen(municipality);
		setOpen(false);
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!options.length) return;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			setActive(expanded ? (active + step + options.length) % options.length : 0);
			setOpen(true);
		} else if (event.key === 'Enter' && expanded) {
			event.preventDefault();
			choose(options[active]!);
		} else if (event.key === 'Escape') {
			setOpen(false);
		}
	};

	return (
		<div className={className}>
			<FormField label={t('search_label')} id={`${id}-input`}>
				<div className="relative">
					<MapPinAreaIcon
						weight="bold"
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 left-0.5 size-[22px] -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						ref={input}
						type="text"
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={expanded}
						aria-controls={`${id}-listbox`}
						aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
						autoComplete="off"
						placeholder={t('search_placeholder')}
						value={text}
						onChange={(event) => {
							setText(event.target.value);
							setChosen(null);
							setActive(0);
							setOpen(true);
						}}
						onKeyDown={onKeyDown}
						onBlur={() => setOpen(false)}
						className="pr-12 pl-[34px]"
					/>
					{text && (
						<Button
							variant="ghost"
							size="icon"
							aria-label={t('search_clear')}
							className="absolute top-1/2 right-0 -translate-y-1/2"
							onClick={() => {
								setText('');
								setChosen(null);
								// The button goes away with the text, so focus goes back to the field.
								input.current?.focus();
							}}
						>
							<XIcon weight="bold" aria-hidden="true" />
						</Button>
					)}
					<ul
						id={`${id}-listbox`}
						role="listbox"
						aria-label={t('search_label')}
						hidden={!expanded}
						className="absolute inset-x-0 top-[calc(100%+8px)] z-10 grid gap-1 rounded-xl bg-popover p-2 text-popover-foreground shadow-pop"
					>
						{options.map((municipality, index) => {
							const at = fold(municipality.name).indexOf(query);
							return (
								<li
									key={municipality.slug}
									id={`${id}-option-${index}`}
									role="option"
									aria-selected={index === active}
									// mousedown, not click: the input keeps focus, so its blur does not close the list first.
									onMouseDown={(event) => {
										event.preventDefault();
										choose(municipality);
									}}
									onMouseMove={() => setActive(index)}
									className="flex min-h-12 cursor-pointer items-center rounded-sm px-3 aria-selected:bg-foreground/10"
								>
									<span>
										{municipality.name.slice(0, at)}
										<b>{municipality.name.slice(at, at + query.length)}</b>
										{municipality.name.slice(at + query.length)}
									</span>
								</li>
							);
						})}
					</ul>
				</div>
			</FormField>
			{expanded && (
				<p role="status" className="sr-only">
					{t('suggestions_a11y', { count: matches.length })}
				</p>
			)}
			<div aria-live="polite">
				{chosen ? (
					<Answer municipality={chosen} />
				) : (
					query &&
					!matches.length && (
						<p className="mt-5 flex gap-3 lg:mt-6">
							<MagnifyingGlassIcon
								weight="bold"
								aria-hidden="true"
								className="size-[22px] shrink-0 text-muted-foreground"
							/>
							<span>{t('no_match', { text: text.trim() })}</span>
						</p>
					)
				)}
			</div>
		</div>
	);
}

const shelterHref = (slug: string) => ({ pathname: '/shelters/[slug]', params: { slug } }) as const;

function DetailsLink({ slug, className }: { slug: string; className?: string }) {
	const t = useTranslations('shelters');
	return (
		<Button asChild variant="text" className={className}>
			<Link href={shelterHref(slug)}>
				{t('details_link')}
				<ArrowRightIcon weight="bold" aria-hidden="true" />
			</Link>
		</Button>
	);
}

/**
 * The answer for one municipality (C18 client rule). Only a confirmed shelter gets the primary call button and its
 * number; a likely one is labelled "Ni potrjeno" with a secondary call; otherwise no phone at all, only the nearest.
 */
function Answer({ municipality }: { municipality: MunicipalityRef }) {
	const t = useTranslations('shelters');
	const tc = useTranslations('common');
	const locale = useLocale();
	const { currentData, isError, isFetching, refetch } = useGetResponsibleShelterQuery({
		municipality: municipality.slug,
	});
	const result = toResult(currentData, isError, isFetching);
	const name = result.municipality?.name ?? municipality.name;
	const answerClass = 'mt-6 lg:mt-8';
	const actionsClass = 'mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 max-lg:grid';

	switch (result.status) {
		case 'loading':
			return (
				<div className={answerClass}>
					<p className="sr-only">{tc('loading')}</p>
					<Card aria-hidden="true">
						<Skeleton className="h-4 w-[72%]" />
						<Skeleton className="mt-3 h-[30px] w-[58%]" />
						<Skeleton className="mt-4 h-6 w-[44%]" />
						<Skeleton className="mt-5 h-14 rounded-full lg:w-[168px]" />
					</Card>
				</div>
			);
		case 'error':
			return (
				<div className={cn(noteClass, answerClass)} role="alert">
					<WarningCircleIcon
						weight="fill"
						aria-hidden="true"
						className="mt-px size-[22px] shrink-0 text-destructive"
					/>
					<div>
						<p>{t('error')}</p>
						<Button variant="text" className="mt-1 -ml-3" onClick={() => refetch()}>
							<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
							{tc('try_again')}
						</Button>
					</div>
				</div>
			);
		case 'confirmed': {
			const { shelter } = result;
			return (
				<Card className={answerClass}>
					<p className="text-sm text-muted-foreground">{t('answer_meta', { municipality: name })}</p>
					<h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.015em] lg:text-3xl">
						<Link href={shelterHref(shelter.slug)} className={titleLinkClass}>
							{shelter.name}
						</Link>
					</h2>
					{shelter.phone && (
						<p className="mt-3 text-xl leading-7 font-bold whitespace-nowrap tabular-nums lg:mt-4 lg:text-2xl lg:leading-8">
							{shelter.phone_display}
						</p>
					)}
					<div className={actionsClass}>
						{shelter.phone && (
							<Button asChild size="lg">
								<a href={`tel:${shelter.phone}`} aria-label={t('call_a11y', { shelter: shelter.name })}>
									<PhoneIcon weight="bold" aria-hidden="true" />
									{t('call')}
								</a>
							</Button>
						)}
						<DetailsLink slug={shelter.slug} />
					</div>
				</Card>
			);
		}
		case 'likely': {
			const { likely_shelter: shelter } = result;
			return (
				<Card className={answerClass}>
					<Badge>
						<SealQuestionIcon weight="bold" aria-hidden="true" />
						{t('not_confirmed')}
					</Badge>
					<h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.015em] lg:text-3xl">
						{t('maybe_responsible')}
					</h2>
					<p className="mt-1 text-lg leading-7">
						<Link href={shelterHref(shelter.slug)} className={titleLinkClass}>
							{shelter.name}
						</Link>
					</p>
					<p className="mt-3 text-sm text-muted-foreground">
						{t('not_confirmed_help', { municipality: name })}
					</p>
					<div className={actionsClass}>
						<Button asChild variant="secondary">
							<a
								href={`tel:${shelter.phone}`}
								aria-label={t('call_unconfirmed_a11y', { shelter: shelter.name })}
							>
								<PhoneIcon weight="bold" aria-hidden="true" />
								{t('call_unconfirmed')}
							</a>
						</Button>
						<DetailsLink slug={shelter.slug} />
					</div>
				</Card>
			);
		}
		default: {
			const nearest = result.status === 'unconfirmed' ? result.nearest : [];
			return (
				<div className={cn(noteClass, answerClass)}>
					<InfoIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
					<div className="min-w-0 flex-1">
						<p>{t('unconfirmed', { municipality: name })}</p>
						{nearest.length > 0 && (
							<>
								<p className="mt-3 font-bold">{t('nearest_title')}</p>
								<ul className="mt-1">
									{nearest.map((shelter) => (
										<li
											key={shelter.slug}
											className="flex flex-wrap items-baseline justify-between gap-x-4"
										>
											<Link href={shelterHref(shelter.slug)} className={titleLinkClass}>
												{shelter.name}
											</Link>
											<span className="text-sm text-muted-foreground">
												{t('nearest_meta', {
													distance: formatCount(Math.round(shelter.distance_km), locale),
												})}
											</span>
										</li>
									))}
								</ul>
							</>
						)}
						<Button asChild variant="text" className="mt-1 -ml-3">
							<a href="#all">
								{t('unconfirmed_link')}
								<ArrowDownIcon weight="bold" aria-hidden="true" />
							</a>
						</Button>
					</div>
				</div>
			);
		}
	}
}
