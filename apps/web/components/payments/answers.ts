'use client';

import * as React from 'react';

// P15 asks answered in this tab, per moment and report ("tip:<code>", "report_contribution:<code>"): a skipped or paid
// ask is not shown again for that report, as on mobile for the app session. sessionStorage, so the answer outlives the
// redirect to Checkout and back; blocked storage keeps it in memory. Short codes are public, nothing personal.

export type Answer = 'skipped' | 'paid';

const PREFIX = 'zz_support:';
const SETTLED = 'settled';
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => void listeners.delete(listener);
};

function read(key: string): string | null {
	try {
		return sessionStorage.getItem(PREFIX + key) ?? memory.get(key) ?? null;
	} catch {
		return memory.get(key) ?? null;
	}
}

function write(key: string, value: string) {
	try {
		sessionStorage.setItem(PREFIX + key, value);
	} catch {
		memory.set(key, value);
	}
	listeners.forEach((listener) => listener());
}

/** The answer to one ask (null while it asks) and the setter; the server render always asks. */
export function useAnswer(key: string) {
	const answer = React.useSyncExternalStore(
		subscribe,
		() => read(key) as Answer | null,
		() => null
	);
	return [answer, (next: Answer) => write(key, next)] as const;
}

/** Pay: which ask this checkout answers, so the return page can close it. */
export const rememberPayment = (paymentId: string, key: string) => write(`payment:${paymentId}`, key);

/** Retry from the return page: the new checkout answers the same ask as the one it replaces. */
export function relinkPayment(oldId: string, newId: string) {
	const key = read(`payment:${oldId}`);
	if (key && key !== SETTLED) write(`payment:${newId}`, key);
}

/**
 * Return page, payment succeeded: the ask it answered turns into the thank-you line. True only the first time this
 * tab sees it, so a reload does not count the contribution twice.
 */
export function settlePayment(paymentId: string): boolean {
	const key = read(`payment:${paymentId}`);
	if (key === SETTLED) return false;
	if (key) write(key, 'paid');
	write(`payment:${paymentId}`, SETTLED);
	return true;
}
