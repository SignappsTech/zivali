// Synthetic matching set (TASK-43.3), offline: 60 lost animals (dogs and cats), each with one positive (the same
// animal found or sighted, in another photo, described by a finder in one of six ways) and one hard negative (a
// look-alike: same species, size, colours and pattern, close in place and time, in its own photo). Photos are mock
// embedder labels `animal/view` (C20 §Adapter), so the same animal is about 0.9 cosine and different animals about 0.1:
// the mock cannot make look-alikes look alike, which only the real-photo set measures.
import { SIZES, type Colour, type Pattern, type Sex, type Size } from '@zivali/types';

import { labelledVector } from '../../../adapters/embedder/mock.ts';
import type { EvalReport } from './harness.ts';

type Look = { size: Size | null; sex: Sex | null; colours: Colour[]; pattern: Pattern | null };

/** Six looks, each with the colour a finder may call it instead (never one of its own). */
const PALETTES: (Look & { misnamed: Colour[] })[] = [
	{ size: 'm', sex: null, colours: ['black'], pattern: 'solid', misnamed: ['chocolate'] },
	{ size: 'l', sex: null, colours: ['black', 'white'], pattern: 'bicolour', misnamed: ['grey'] },
	{ size: 's', sex: null, colours: ['brown'], pattern: 'solid', misnamed: ['red'] },
	{ size: 'm', sex: null, colours: ['golden'], pattern: 'solid', misnamed: ['cream'] },
	{ size: 'xs', sex: null, colours: ['grey', 'white'], pattern: 'tabby', misnamed: ['blue_grey'] },
	{ size: 'l', sex: null, colours: ['red', 'white'], pattern: 'bicolour', misnamed: ['golden'] },
];

/** Sizes two steps apart (scoreMatch's size veto). */
const twoOff = (size: Size) => SIZES[SIZES.indexOf(size) < 2 ? SIZES.indexOf(size) + 2 : SIZES.indexOf(size) - 2]!;

/** How the finder describes the animal, how far from the loss and how many hours later. */
const SCENARIOS: { km: number; hours: number; describe: (look: Look, misnamed: Colour[]) => Look }[] = [
	{ km: 0.5, hours: 6, describe: (l) => l },
	{ km: 5, hours: 48, describe: (l) => ({ ...l, sex: 'unknown' }) },
	{ km: 1.5, hours: 20, describe: () => ({ size: null, sex: 'unknown', colours: [], pattern: null }) },
	{ km: 2, hours: 30, describe: (l) => ({ ...l, size: twoOff(l.size!), sex: 'unknown' }) },
	{ km: 1, hours: 10, describe: (l, misnamed) => ({ ...l, colours: misnamed }) },
	{ km: 8, hours: 100, describe: (l) => ({ ...l, sex: 'unknown' }) },
];

const round2 = (x: number) => Math.round(x * 100) / 100;

export function syntheticSet(): EvalReport[] {
	const reports: EvalReport[] = [];
	for (let i = 0; i < 60; i++) {
		const species = i % 2 ? 'cat' : 'dog';
		const { misnamed, ...palette } = PALETTES[Math.floor(i / 4) % PALETTES.length]!;
		const look: Look = { ...palette, sex: Math.floor(i / 3) % 2 ? 'female' : 'male' };
		// Lost reports on a 2.5 km grid, two hours apart; the others around them.
		const x = (i % 8) * 2.5;
		const y = Math.floor(i / 8) * 2.5;
		const hours = i * 2;
		const angle = i * 2.4;
		const pet = `pet-${i}`;
		reports.push({
			id: `lost-${i}`,
			type: 'lost',
			animal: pet,
			species,
			x_km: x,
			y_km: y,
			hours,
			...look,
			photos: [`${pet}/lost-1`, `${pet}/lost-2`],
		});
		const scenario = SCENARIOS[Math.floor(i / 2) % SCENARIOS.length]!;
		reports.push({
			id: `found-${i}`,
			type: Math.floor(i / 2) % 2 ? 'sighted' : 'found',
			animal: pet,
			species,
			x_km: round2(x + scenario.km * Math.cos(angle)),
			y_km: round2(y + scenario.km * Math.sin(angle)),
			hours: hours + scenario.hours,
			...scenario.describe(look, misnamed),
			photos: [`${pet}/found`],
		});
		const km = 0.8 + (i % 5) * 0.5;
		reports.push({
			id: `look-alike-${i}`,
			type: 'found',
			animal: `look-alike-${i}`,
			species,
			x_km: round2(x - km * Math.cos(angle)),
			y_km: round2(y - km * Math.sin(angle)),
			hours: hours + 12 + (i % 4) * 16,
			...look,
			sex: i % 2 ? 'unknown' : look.sex,
			photos: [`look-alike-${i}/found`],
		});
	}
	return reports;
}

/** Photo key `animal/view` → the mock embedder's vector for that label. */
export function syntheticVector(photo: string): number[] {
	const [animal, view] = photo.split('/');
	return labelledVector({ animal: animal!, view: view! });
}
