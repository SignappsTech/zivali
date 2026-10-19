'use client';

import dynamic from 'next/dynamic';

// The owner code (store, API hooks, dialogs, analytics) is a chunk of its own: slots A and C and the matches note
// render these only for a report's managers (`is_mine`, decided on the server), so a visitor's page never downloads
// it, Redux and RTK Query included (TASK-18.6).
export const OwnerActions = dynamic(() => import('@/components/report/owner-actions').then((m) => m.OwnerActions));
export const OwnerMenu = dynamic(() => import('@/components/report/owner-actions').then((m) => m.OwnerMenu));
export const MatchesLink = dynamic(() => import('@/components/matches/matches-link').then((m) => m.MatchesLink));
