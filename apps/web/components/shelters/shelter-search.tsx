'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslations } from 'next-intl';
import { type ComponentType, useEffect, useId, useMemo, useRef, useState } from 'react';

import type { MunicipalityRef } from '@zivali/api/directory';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

/** Case- and diacritics-blind ("skof" finds "Škofja Loka"); one character in, one out, so offsets carry over. */
const fold = (text: string) => [...text].map((c) => c.normalize('NFD')[0]!.toLowerCase()).join('');
const MAX_OPTIONS = 8;

export const answerClass = 'mt-6 lg:mt-8';

/** The answer while it loads (shelter-answer.tsx, and its own code before that). */
export function AnswerSkeleton() {
	const tc = useTranslations('common');
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
}

// The answer calls the API through RTK Query, so it and the store load with the first chosen municipality, not with
// the page (TASK-90.5).
// A failed chunk load shows the inline error with a retry instead of reaching error.tsx; focusing the field warms it.
const loadAnswer = () => import('./shelter-answer');

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
	const [Answer, setAnswer] = useState<ComponentType<{ municipality: MunicipalityRef }> | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const tc = useTranslations('common');

	useEffect(() => {
		if (!chosen || Answer || loadFailed) return;
		let live = true;
		loadAnswer().then(
			(m) => live && setAnswer(() => m.ShelterAnswer),
			() => live && setLoadFailed(true)
		);
		return () => {
			live = false;
		};
	}, [chosen, Answer, loadFailed]);

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
						onFocus={() => void loadAnswer().catch(() => {})}
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
					Answer ? (
						<Answer municipality={chosen} />
					) : loadFailed ? (
						<div className={`${noteClass} ${answerClass}`} role="alert">
							<WarningCircleIcon
								weight="fill"
								aria-hidden="true"
								className="mt-px size-[22px] shrink-0 text-destructive"
							/>
							<div>
								<p>{t('error')}</p>
								<Button variant="text" className="mt-1 -ml-3" onClick={() => setLoadFailed(false)}>
									<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
									{tc('try_again')}
								</Button>
							</div>
						</div>
					) : (
						<AnswerSkeleton />
					)
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
