import type { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

import { signInAnonymously } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { reportsApi } from '@zivali/api/reports';
import type { ManageClaimResponse } from '@zivali/types';
import { env } from '@/lib/env';
import { manageTokenKey } from '@/lib/offline/outbox';
import { apiClient, store } from '@/lib/store';
import { supabase } from '@/lib/supabase';

// C7 on mobile: the anonymous finder session (Turnstile through the web /captcha page in a WebView) and the manage link.

/** `undefined`: the web build has no Turnstile key (captcha off there), so the sign-in goes without a token. */
type CaptchaToken = string | undefined;
type CaptchaRequest = { id: number; resolve: (token: CaptchaToken) => void; reject: (error: ApiError) => void };
let captcha: CaptchaRequest | null = null;
let lastId = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => void listeners.delete(listener);
};

/** A Turnstile token from <CaptchaSheet /> (root layout); rejects with CAPTCHA_FAILED (page error, cancel). */
function requestCaptchaToken(): Promise<CaptchaToken> {
	return new Promise<CaptchaToken>((resolve, reject) => {
		captcha = { id: ++lastId, resolve, reject };
		notify();
	}).finally(() => {
		captcha = null;
		notify();
	});
}

/** The pending captcha request's id (a fresh WebView per request), or null. */
export const useCaptchaRequest = () =>
	useSyncExternalStore(
		subscribe,
		() => captcha?.id ?? null,
		() => null
	);

/** What the /captcha page answered. */
export const answerCaptcha = {
	token: (token: CaptchaToken) => captcha?.resolve(token),
	fail: () => captcha?.reject(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED')),
};

let signingIn: Promise<Session | null> | null = null;

/**
 * The current session (anonymous or a real account), else a new anonymous one, with a captcha token first when
 * EXPO_PUBLIC_CAPTCHA is on. Concurrent callers share one sign-in (one token, one anonymous user). Errors are ApiError
 * (CAPTCHA_FAILED, NETWORK, RATE_LIMITED): the caller keeps its draft and tries again later.
 */
export function ensureSession(): Promise<Session | null> {
	signingIn ??= (async () => {
		const { data } = await supabase.auth.getSession();
		if (data.session) return data.session;
		const token = env.EXPO_PUBLIC_CAPTCHA ? await requestCaptchaToken() : undefined;
		return (await signInAnonymously(token)).session;
	})().finally(() => {
		signingIn = null;
	});
	return signingIn;
}

/** Manage tokens live only in the secure store (C7, C17), under the key the outbox and the wipe use. */
export const saveManageToken = (reportId: string, token: string) =>
	SecureStore.setItemAsync(manageTokenKey(reportId), token);

/** A manage link opened on this device (C7 step 5): session, claim (this uid becomes a manager), token stored. */
export async function claimManageLink(token: string): Promise<ManageClaimResponse> {
	await ensureSession();
	const claim = await apiClient.request<ManageClaimResponse>('POST', '/v1/manage/claim', { body: { token } });
	await saveManageToken(claim.report_id, token);
	// A signed-in user keeps their cache: the report read before the claim had no manager fields.
	store.dispatch(reportsApi.util.invalidateTags(['Reports']));
	return claim;
}
