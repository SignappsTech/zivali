'use client';

import { skipToken } from '@reduxjs/toolkit/query';
import * as React from 'react';
import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';

import { useGetPublicConfigQuery } from '@zivali/api/config';
import { useGetPhotoAttributesQuery } from '@zivali/api/photos';
import type { AiNotice, Species } from '@zivali/types';
import type { PickedPhoto } from '@/components/photos/use-photo-uploads';

import {
	type AiAnnouncement,
	type AiField,
	type AiFill,
	type AiResult,
	type AiValues,
	announcementFor,
	confidenceOf,
	planPrefill,
} from './prefill';

const POLL_MS = 750;
const POLL_FOR_MS = 10_000;

/** `ai.enabled` from the public config (C1); false while it loads or fails, so nothing is polled by accident. */
export function useAiOn(enabled = true): boolean {
	return useGetPublicConfigQuery(enabled ? undefined : skipToken).data?.['ai.enabled'] === true;
}

/**
 * C19: polls GET /v1/photos/:id/attributes every 750 ms for the form's first photo once it has uploaded in this
 * visit (a saved photo is not checked), for at most 10 s; stops on `ready`, `unavailable` or an error, which leave the
 * form manual with nothing shown. Nothing at all with `ai.enabled` false.
 */
export function usePhotoAttributes(photos: PickedPhoto[], enabled = true) {
	const on = useAiOn(enabled);
	const first = photos[0];
	const id = on && first?.status === 'uploaded' && !first.saved ? first.photoId : undefined;
	const [expired, setExpired] = React.useState<string>();
	React.useEffect(() => {
		if (!id) return;
		const timer = setTimeout(() => setExpired(id), POLL_FOR_MS);
		return () => clearTimeout(timer);
	}, [id]);
	const query = useGetPhotoAttributesQuery(id ? { id } : skipToken);
	const data = query.currentData;
	const timedOut = Boolean(id) && expired === id;
	const checking = Boolean(id) && !timedOut && !query.isError && (!data || data.status === 'pending');
	const { refetch } = query;
	React.useEffect(() => {
		if (!checking) return;
		// RTK Query skips a refetch while the previous request is still in flight.
		const timer = setInterval(() => void refetch(), POLL_MS);
		return () => clearInterval(timer);
	}, [checking, refetch]);
	return { checking, result: !timedOut && data?.status === 'ready' ? data : undefined, photoId: id };
}

export type Prefill = {
	/** The first photo is being checked: the `ai_prefill.checking` line. */
	checking: boolean;
	/** The latest ready result, for what a form shows beyond its fields (the P7 sentence's breed). */
	result?: AiResult;
	/** Fields filled by the suggestion and not changed since: the "Predlog" mark. */
	marks: ReadonlySet<AiField>;
	/** Each filled field's confidence (0…1), shown as a percentage after its mark. */
	confidence: ReadonlyMap<AiField, number>;
	/** Fields that stay empty with the low-confidence (or collar) hint. */
	hints: ReadonlySet<AiField>;
	/** The photo shows the other species than the one chosen. */
	differs?: Species;
	notice?: AiNotice;
	announcement?: AiAnnouncement;
	/** A change by the person: that field is theirs (its mark and hint go); with no field, another field of the form. */
	touch: (field?: AiField) => void;
	/** The form emptied a field by itself (a species change dropped the breed): its mark goes. */
	cleared: (field: AiField) => void;
	/** After the person chose the suggested species ("Izberi psa"): fill what fits it, with marks, no new hints. */
	refill: () => void;
	/** The person confirmed the suggestions (P7 "Da, nadaljuj"): they are their own answers now. */
	confirm: () => void;
	dismissNotice: () => void;
};

type State = Pick<Prefill, 'result' | 'marks' | 'confidence' | 'hints' | 'differs' | 'notice' | 'announcement'>;

const without = (state: State, field: AiField): State =>
	state.marks.has(field) || state.hints.has(field) || (field === 'species' && state.differs)
		? {
				...state,
				marks: new Set([...state.marks].filter((f) => f !== field)),
				hints: new Set([...state.hints].filter((f) => f !== field)),
				differs: field === 'species' ? undefined : state.differs,
			}
		: state;

/**
 * The AI pre-fill of one form (C19 §Client rules, TASK-41.2): polls for the first photo, fills only empty fields the
 * person has not touched (`write`), and keeps the marks, hints, notice and the one announcement. `read` gives the
 * form's current values; the form reports the person's own changes with `touch`. Nothing is saved here: the form's
 * own save or publish confirms the values.
 */
export function usePrefill({
	photos,
	enabled = true,
	fields,
	read,
	write,
}: {
	photos: PickedPhoto[];
	enabled?: boolean;
	fields: readonly AiField[];
	read: () => AiValues;
	write: (fill: AiFill) => void;
}): Prefill {
	const { checking, result, photoId } = usePhotoAttributes(photos, enabled);
	const [state, setState] = React.useState<State>({ marks: new Set(), confidence: new Map(), hints: new Set() });
	const [refills, setRefills] = React.useState(0);
	const touched = React.useRef(new Set<AiField>());
	const changed = React.useRef(false);
	const applied = React.useRef<string>(undefined);

	const apply = React.useEffectEvent((ready: AiResult, refill: boolean) => {
		const plan = planPrefill(ready, read(), {
			fields,
			touched: touched.current,
			marked: state.marks,
			late: refill || changed.current,
		});
		write(plan.fill);
		setState((prev) => ({
			result: ready,
			marks: new Set([...prev.marks, ...plan.marks]),
			confidence: new Map([
				...prev.confidence,
				...plan.marks.flatMap((field) => {
					const value = confidenceOf(ready, field);
					return value === undefined ? [] : [[field, value] as const];
				}),
			]),
			hints: refill ? prev.hints : new Set(plan.hints),
			differs: plan.differs,
			notice: refill ? prev.notice : (ready.notice ?? undefined),
			announcement: refill ? prev.announcement : announcementFor(ready, plan),
		}));
	});
	React.useEffect(() => {
		// Once per checked photo: a replaced first photo is checked again.
		if (!result || !photoId || applied.current === photoId) return;
		applied.current = photoId;
		apply(result, false);
	}, [result, photoId]);
	const applyAgain = React.useEffectEvent(() => state.result && apply(state.result, true));
	React.useEffect(() => {
		if (refills) applyAgain();
	}, [refills]);

	const touch = React.useCallback((field?: AiField) => {
		changed.current = true;
		if (!field) return;
		touched.current.add(field);
		setState((prev) => without(prev, field));
	}, []);
	const cleared = React.useCallback((field: AiField) => setState((prev) => without(prev, field)), []);
	// After the species the person chose has settled in the form (its change handler runs first).
	const refill = React.useCallback(() => setRefills((n) => n + 1), []);
	const confirm = React.useCallback(() => {
		for (const field of state.marks) touched.current.add(field);
		setState((prev) => ({ ...prev, marks: new Set() }));
	}, [state.marks]);
	const dismissNotice = React.useCallback(() => setState((prev) => ({ ...prev, notice: undefined })), []);

	return { checking, ...state, touch, cleared, refill, confirm, dismissNotice };
}

const isAiField = (name: string | undefined): name is AiField =>
	name === 'species' ||
	name === 'breed_codes' ||
	name === 'colours' ||
	name === 'pattern' ||
	name === 'size' ||
	name === 'collar';
const isEmpty = (value: unknown) => value == null || value === '' || (Array.isArray(value) && value.length === 0);

/**
 * usePrefill for a react-hook-form form with PetFields (P6, P8): the person's changes come from `watch`. `getForm`
 * returns the form: read only in effects, so a form whose resolver reads a ref (P6) is not read during render.
 */
export function useFormPrefill<V extends FieldValues, T extends FieldValues>(
	getForm: () => UseFormReturn<V, unknown, T>,
	photos: PickedPhoto[],
	{ fields, enabled = true }: { fields: readonly AiField[]; enabled?: boolean }
): Prefill {
	const ai = usePrefill({
		photos,
		enabled,
		fields,
		read: () => getForm().getValues() as AiValues,
		write: (fill) => {
			// Dirty, so the P8 edit form PATCHes them with the person's Save.
			for (const [name, value] of Object.entries(fill))
				getForm().setValue(name as Path<V>, value as PathValue<V, Path<V>>, { shouldDirty: true });
		},
	});
	const { touch, cleared } = ai;
	const formNow = React.useEffectEvent(getForm);
	React.useEffect(() => {
		const subscription = formNow().watch((values, { name, type }) => {
			const root = name?.split('.')[0];
			const field = isAiField(root) ? root : undefined;
			// `change`: the person's input; setValue (our fill, PetFields dropping what no longer fits) has no type.
			if (type === 'change') touch(field);
			else if (field && isEmpty(values[field])) cleared(field);
		});
		return () => subscription.unsubscribe();
	}, [touch, cleared]);
	return ai;
}
