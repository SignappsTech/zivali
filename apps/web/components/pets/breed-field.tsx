'use client';

import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useState } from 'react';

import { type BreedCode, CAT_BREEDS, DOG_BREEDS, type Species } from '@zivali/types';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Case- and diacritics-blind search text ("sarp" finds "Šarplaninec"). */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type BreedFieldProps = {
	species: Species | undefined;
	value: BreedCode | undefined;
	onChange: (code: BreedCode | undefined) => void;
	onBlur?: () => void;
	inputRef?: React.Ref<HTMLInputElement>;
	name?: string;
	/** The field label; `pets.breed_label` by default (P7 says "Pasma (neobvezno)"). */
	label?: React.ReactNode;
	/** The AI "Predlog" mark after the label, and the field's AI description (TASK-41.2). */
	mark?: React.ReactNode;
	note?: React.ReactNode;
};

/**
 * Breed as a searchable select (ARIA 1.2 combobox with a listbox): localised names in alphabetical order, with
 * "Mixed breed" and "Not sure" always listed last. One breed: PetFields (P6, P8) binds it to `breed_codes[0]`, the
 * P7 found flow shows it only to correct a suggested breed. Clearing the text clears the breed.
 */
export function BreedField({ species, value, onChange, onBlur, inputRef, name, label, mark, note }: BreedFieldProps) {
	const t = useTranslations('pets');
	const tb = useTranslations('breeds');
	const locale = useLocale();
	const id = useId();
	const [text, setText] = useState<string | null>(null); // null while not typing: the field shows the chosen name
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);

	const breeds = useMemo(() => {
		const codes: readonly BreedCode[] = species === 'dog' ? DOG_BREEDS : species === 'cat' ? CAT_BREEDS : [];
		const all = codes.map((code) => ({ code, label: tb(code) }));
		const last = (code: string) => code.endsWith('.mixed') || code.endsWith('.unknown');
		const named = all.filter((b) => !last(b.code)).sort((a, b) => a.label.localeCompare(b.label, locale));
		return { named, last: all.filter((b) => last(b.code)) };
	}, [species, tb, locale]);

	const query = fold(text?.trim() ?? '');
	const matches = query ? breeds.named.filter((b) => fold(b.label).includes(query)) : breeds.named;
	const options = [...matches, ...breeds.last];
	const expanded = open && options.length > 0;
	const noMatch = Boolean(query) && matches.length === 0;

	useEffect(() => {
		if (expanded) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' });
	}, [expanded, active, id]);

	// Escape closes only the open list: a surrounding Radix dialog listens on the document in the capture phase, so
	// the key is stopped on window, before it. With the list closed Escape goes on as usual.
	useEffect(() => {
		if (!expanded) return;
		const onEscape = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.stopPropagation();
			setOpen(false);
		};
		window.addEventListener('keydown', onEscape, true);
		return () => window.removeEventListener('keydown', onEscape, true);
	}, [expanded]);

	const choose = (code: BreedCode) => {
		onChange(code);
		setText(null);
		setOpen(false);
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			setActive(expanded ? (active + step + options.length) % options.length : 0);
			setOpen(true);
		} else if (event.key === 'Enter' && expanded) {
			event.preventDefault();
			choose(options[active]!.code);
		}
	};

	return (
		<FormField
			id={`${id}-input`}
			label={
				<>
					{label ?? t('breed_label')}
					{mark}
				</>
			}
			disabled={!species}
			hint={species ? note : t('species_first')}
		>
			<div className="relative">
				<MagnifyingGlassIcon
					weight="bold"
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-0.5 size-[22px] -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					ref={inputRef}
					name={name}
					type="text"
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={expanded}
					aria-controls={`${id}-listbox`}
					aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
					aria-describedby={noMatch ? `${id}-none` : !species || note ? `${id}-input-hint` : undefined}
					autoComplete="off"
					placeholder={t('breed_search')}
					value={text ?? (value ? tb(value) : '')}
					onChange={(event) => {
						setText(event.target.value);
						setActive(0);
						setOpen(true);
					}}
					onClick={() => setOpen(true)}
					onKeyDown={onKeyDown}
					onBlur={() => {
						setOpen(false);
						if (text?.trim() === '') onChange(undefined);
						setText(null);
						onBlur?.();
					}}
					className="pl-[34px]"
				/>
				<ul
					id={`${id}-listbox`}
					role="listbox"
					aria-label={t('breed_label')}
					hidden={!expanded}
					className="absolute inset-x-0 top-[calc(100%+8px)] z-10 grid max-h-80 gap-1 overflow-y-auto rounded-xl bg-popover p-2 text-popover-foreground shadow-pop"
				>
					{options.map((breed, index) => (
						<li
							key={breed.code}
							id={`${id}-option-${index}`}
							role="option"
							aria-selected={index === active}
							// mousedown, not click: the input keeps focus, so its blur does not close the list first.
							onMouseDown={(event) => {
								event.preventDefault();
								choose(breed.code);
							}}
							onMouseMove={() => setActive(index)}
							className={cn(
								'flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 aria-selected:bg-foreground/10',
								breed.code === value && 'font-bold'
							)}
						>
							{breed.label}
							{breed.code === value && <CheckIcon weight="bold" aria-hidden="true" className="size-5" />}
						</li>
					))}
				</ul>
			</div>
			<div role="status">
				{noMatch && (
					<p id={`${id}-none`} className="flex gap-2 text-sm text-muted-foreground">
						<InfoIcon weight="bold" aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
						{t('breed_none')}
					</p>
				)}
			</div>
		</FormField>
	);
}
