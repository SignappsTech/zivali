import type { AiNotice, BreedCode, Colour, Pattern, PhotoAttributes, Size, Species } from '@zivali/types';
import { isBreedOf } from '@zivali/validation/breeds';
import { PATTERNS, SIZES } from '@/components/pets/species-options';

// C19 §Client rules (TASK-41.2): what a ready photo suggestion fills, marks and hints in a form. Pure, so the rules
// are tested without the screens; the forms (PetFields in P6 and P8, the P7 found flow) apply the plan.

/** A `ready` answer of GET /v1/photos/:id/attributes. */
export type AiResult = Extract<PhotoAttributes, { status: 'ready' }>;
/** The fields a suggestion can fill or hint. `collar` only ever gets a hint: the collar text is never filled. */
export type AiField = 'species' | 'breed_codes' | 'colours' | 'pattern' | 'size' | 'collar';
/** Every AiField, in PetFields' order ("Preveri predloge" goes to the first mark): what P6 and P8 fill or hint. */
export const PET_AI_FIELDS: readonly AiField[] = ['species', 'breed_codes', 'pattern', 'colours', 'size', 'collar'];
export type AiValues = {
	species?: Species | null;
	breed_codes?: BreedCode[] | null;
	colours?: Colour[] | null;
	pattern?: Pattern | null;
	size?: Size | null;
	collar?: string | null;
};
export type AiFill = Partial<{
	species: Species;
	breed_codes: BreedCode[];
	colours: Colour[];
	pattern: Pattern;
	size: Size;
}>;
export type AiPlan = {
	fill: AiFill;
	/** Filled fields: marked "Predlog" until the person changes them or saves. */
	marks: AiField[];
	/** Fields whose value came back below `ai.min_confidence`: they stay empty with the low-confidence hint. */
	hints: AiField[];
	/** The suggested species when the person chose the other one: a hint, never switched. */
	differs?: Species;
};
/** What the polite live region says once a result is in. */
export type AiAnnouncement =
	{ kind: 'arrived'; count: number } | { kind: 'none' } | { kind: 'notice'; notice: AiNotice };

export const isEmpty = (value: unknown) =>
	value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

/**
 * Fills only empty fields the person has not touched (a field still marked from an earlier first photo counts as
 * untouched), and only with values valid for the form's species. `late`: the person already changed something, so
 * no hint lines are added (nothing moves under their finger). A `no_animal` or `other_animal` notice fills nothing.
 */
export function planPrefill(
	result: AiResult,
	values: AiValues,
	{
		fields,
		touched,
		marked = new Set(),
		late = false,
	}: {
		fields: readonly AiField[];
		touched: ReadonlySet<AiField>;
		marked?: ReadonlySet<AiField>;
		late?: boolean;
	}
): AiPlan {
	const plan: AiPlan = { fill: {}, marks: [], hints: [] };
	if (result.notice === 'no_animal' || result.notice === 'other_animal') return plan;
	const untouched = (field: AiField) => fields.includes(field) && !touched.has(field);
	const free = (field: AiField) => untouched(field) && (marked.has(field) || isEmpty(values[field]));
	const hint = (field: AiField) => {
		if (!late && untouched(field) && isEmpty(values[field])) plan.hints.push(field);
	};
	const fill = <F extends keyof AiFill>(field: F, value: NonNullable<AiFill[F]>) => {
		if (!free(field)) return;
		plan.fill[field] = value;
		plan.marks.push(field);
	};

	let species = values.species ?? undefined;
	const { species: suggested, breed_codes: breeds, colours, pattern, size, collar } = result;
	if (suggested && fields.includes('species')) {
		if (suggested.value === null) hint('species');
		else if (free('species')) {
			fill('species', suggested.value);
			species = suggested.value;
		} else if (species && species !== suggested.value) plan.differs = suggested.value;
	}
	if (breeds) {
		// One breed in the form; codes of another species never fill (C19 drops them only against the model's own).
		const code = species && breeds.value?.find((candidate) => isBreedOf(candidate, species));
		if (code) fill('breed_codes', [code]);
		else if (breeds.value === null && !plan.differs) hint('breed_codes');
	}
	if (colours) {
		if (colours.value === null) hint('colours');
		else if (colours.value.length > 0) fill('colours', colours.value);
	}
	if (pattern) {
		if (pattern.value === null) hint('pattern');
		else if (species && PATTERNS[species].includes(pattern.value)) fill('pattern', pattern.value);
	}
	if (size) {
		if (size.value === null) hint('size');
		else if (species && SIZES[species].includes(size.value)) fill('size', size.value);
	}
	if (collar?.value === true) hint('collar');
	return plan;
}

/** `arrived_live` with the number filled, `none_live` when only hints came, or the notice title; else nothing. */
export function announcementFor(result: AiResult, plan: AiPlan): AiAnnouncement | undefined {
	if (result.notice) return { kind: 'notice', notice: result.notice };
	if (plan.marks.length > 0) return { kind: 'arrived', count: plan.marks.length };
	if (plan.hints.some((field) => field !== 'collar')) return { kind: 'none' };
}
