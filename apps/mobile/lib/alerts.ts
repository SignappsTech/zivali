import { track } from '@zivali/analytics';
import { type AlertSubscriptionInput, type LatLng, SPECIES, type Species } from '@zivali/types';

// Nearby alerts (C10) on one home area: the alert settings and the home-area picker both write through these.

/** The PUT body from a stored subscription (only the request fields), with the changed ones. */
export const alertInput = (
	{ center, radius_km, species, paused }: AlertSubscriptionInput,
	change: Partial<AlertSubscriptionInput> = {}
): AlertSubscriptionInput => ({ center, radius_km, species, paused, ...change });

/** Alerts turned on for an area: dogs and cats, not paused. */
export const newAlerts = (center: LatLng, radius_km: number): AlertSubscriptionInput => ({
	center,
	radius_km,
	species: [...SPECIES],
	paused: false,
});

/** `alert_opt_in` (C12): track() drops it without analytics consent; species only when one was chosen, never the area. */
export const trackOptIn = (species: Species[]) =>
	track('alert_opt_in', species.length === 1 ? { species: species[0] } : {});

export const samePoint = (a: LatLng | null | undefined, b: LatLng | null | undefined) =>
	Boolean(a && b && a.lat === b.lat && a.lng === b.lng);
