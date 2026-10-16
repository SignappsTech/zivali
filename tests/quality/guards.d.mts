// Types for guards.mjs, so TypeScript Playwright specs (apps/web/e2e) can import the guards instead of copying them.
import type { Page } from '@playwright/test';

/** Fails if the page renders an ad slot (`[data-ad-slot]`). Call it once the page has rendered. */
export function expectNoAdSlots(page: Page): Promise<void>;

/** Fails if the page has requested an analytics endpoint or holds an analytics cookie. Call it before consent. */
export function expectNoAnalyticsBeforeConsent(page: Page): Promise<void>;
