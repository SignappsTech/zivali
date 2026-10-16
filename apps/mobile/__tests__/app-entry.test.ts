/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';

import * as TaskManager from 'expo-task-manager';

// TASK-87.3 (QA): a geofence entry or the cache refresh can launch the app headless (Android) or in the background
// (iOS) without rendering a route, so the tasks must be defined by the entry file itself, before the router.
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-sqlite', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite()
);
jest.mock('expo-sqlite/localStorage/install', () => ({}));
jest.mock('expo-location', () => ({ GeofencingEventType: { Enter: 1, Exit: 2 } }));
jest.mock('expo-notifications', () => ({}));
jest.mock('@/lib/offline/outbox', () => ({ listManageTokenIds: jest.fn(async () => []) }));

const root = path.resolve(__dirname, '..');

test('package.json main is the entry that imports the task modules before expo-router/entry', () => {
	expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).main).toBe('index.ts');
	const imports = [...fs.readFileSync(path.join(root, 'index.ts'), 'utf8').matchAll(/^import '([^']+)';/gm)].map(
		(match) => match[1]
	);
	const router = imports.indexOf('expo-router/entry');
	expect(router).toBe(imports.length - 1);
	expect(imports.indexOf('./lib/offline/geofence')).toBeGreaterThanOrEqual(0);
	expect(imports.indexOf('./lib/offline/geofence')).toBeLessThan(router);
});

test('importing the geofence engine defines its task at module scope, before anything is called', () => {
	let task = '';
	jest.isolateModules(() => {
		task = jest.requireActual<typeof import('@/lib/offline/geofence')>('@/lib/offline/geofence').GEOFENCE_TASK;
	});
	expect(TaskManager.defineTask).toHaveBeenCalledWith(task, expect.any(Function));
});
