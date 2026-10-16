import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test, type WebSocketRoute } from '@playwright/test';

import { me } from '@zivali/api/__fixtures__/me';
import type { AliasKey, ConversationSummary, Message } from '@zivali/types';

import { dismissConsent, type E2eUser, signInAs } from './session';

// TASK-21.3: P12 chat on the web. Two browser contexts (the owner in SL, the finder in EN) exchange messages through
// one in-memory C9 API answered here, and Supabase Realtime is a mocked WebSocket speaking the Phoenix frames
// realtime-js uses ([join_ref, ref, topic, event, payload]): every push gets an ok reply, and a stored message is
// broadcast on `conversation:<id>` to every socket that joined it (ADR-023).

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ID = 'c9a1d2e3-0000-4000-8000-000000000001';
const TOPIC = `realtime:conversation:${ID}`;
const OWNER: E2eUser & { alias: AliasKey } = { id: me.id, role: 'USER', aal: 'aal1', alias: 'owner' };
const FINDER: E2eUser & { alias: AliasKey } = {
	id: '5b1e0c2a-0000-4000-8000-000000000009',
	role: 'USER',
	aal: 'aal1',
	alias: 'finder',
};

function chatServer(baseURL: string) {
	const messages: Message[] = [
		{
			id: 'm0',
			conversation_id: ID,
			sender_alias_key: 'contact',
			kind: 'system',
			body: 'confirmed',
			has_link: false,
			created_at: new Date(Date.now() - 60_000).toISOString(),
		},
	];
	const sockets = new Set<{ ws: WebSocketRoute; topics: Set<string> }>();
	const sent: { from: AliasKey; body: unknown }[] = [];

	const summary = (alias: AliasKey): ConversationSummary => ({
		id: ID,
		about_report: { short_code: 'Hk3vT9qP', type: 'found', species: 'dog', thumb_url: null },
		my_alias_key: alias,
		other_alias_key: alias === 'owner' ? 'finder' : 'owner',
		last_message_preview: messages.at(-1)!.body,
		unread: 0,
		status: 'active',
	});
	const broadcast = (message: Message) => {
		for (const { ws, topics } of sockets)
			if (topics.has(TOPIC))
				ws.send(
					JSON.stringify([
						null,
						null,
						TOPIC,
						'broadcast',
						{ type: 'broadcast', event: 'message.created', payload: message },
					])
				);
	};

	/** Signs the page in as `who` and answers its API calls and its Realtime socket. */
	async function attach(page: Page, who: E2eUser & { alias: AliasKey }) {
		await signInAs(page, who, baseURL);
		await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
			const socket = { ws, topics: new Set<string>() };
			sockets.add(socket);
			ws.onMessage((raw) => {
				if (typeof raw !== 'string') return;
				const [joinRef, ref, topic, event] = JSON.parse(raw) as [string | null, string, string, string];
				if (event === 'phx_join') socket.topics.add(topic);
				if (event === 'phx_leave') socket.topics.delete(topic);
				// Join, leave, heartbeat and access_token all succeed; no postgres_changes, so the channel is SUBSCRIBED.
				ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]));
			});
			ws.onClose(() => sockets.delete(socket));
		});
		await page.route(
			(url) => url.pathname.startsWith('/v1/'),
			(route) => {
				const request = route.request();
				const url = new URL(request.url());
				const cors = {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
				};
				if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
				const reply = (status: number, json?: unknown) =>
					route.fulfill({ status, headers: cors, ...(json === undefined ? {} : { json }) });
				const key = `${request.method()} ${url.pathname}`;
				if (key === 'GET /v1/me') return reply(200, { ...me, id: who.id, display_name: null });
				if (key === 'GET /v1/notifications') return reply(200, { items: [], next_cursor: null, unread: 0 });
				if (key === 'GET /v1/conversations')
					return reply(200, { items: [summary(who.alias)], next_cursor: null });
				if (key === `GET /v1/conversations/${ID}/messages`) {
					const after = url.searchParams.get('after');
					const from = after ? messages.findIndex((message) => message.id === after) + 1 : 0;
					return reply(200, { items: messages.slice(from), next_cursor: null });
				}
				if (key === `POST /v1/conversations/${ID}/messages`) {
					const body = request.postDataJSON() as { body: string };
					sent.push({ from: who.alias, body });
					const message: Message = {
						id: `m${messages.length}`,
						conversation_id: ID,
						sender_alias_key: who.alias,
						kind: 'text',
						body: body.body,
						has_link: /https?:\/\//.test(body.body),
						created_at: new Date().toISOString(),
					};
					messages.push(message);
					broadcast(message);
					return reply(201, message);
				}
				if (key === `POST /v1/conversations/${ID}/read`) return reply(204);
				return reply(404, { error: { code: 'NOT_FOUND', message: 'no answer' } });
			}
		);
	}
	return { attach, sent };
}

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

test('owner and finder exchange messages in real time in two browser contexts; no ads, safety banner, axe clean', async ({
	page: owner,
	browser,
	baseURL,
}) => {
	const server = chatServer(baseURL!);
	const finderContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
	const finder = await finderContext.newPage();
	await dismissConsent(finder);
	await server.attach(owner, OWNER);
	await server.attach(finder, FINDER);

	await owner.goto(`/nabiralnik/${ID}`);
	await finder.goto(`/en/inbox/${ID}`);
	await expect(owner.getByRole('heading', { level: 1, name: 'Oseba, ki je žival našla' })).toBeVisible();
	await expect(finder.getByRole('heading', { level: 1, name: 'Person searching' })).toBeVisible();
	await expect(owner.getByText('Nikoli ne pošiljajte denarja vnaprej.')).toBeVisible();
	await expect(finder.getByText('Never send money in advance.')).toBeVisible();
	await expect(owner.getByRole('log').getByText('Ujemanje je potrjeno. Pogovor je odprt.')).toBeVisible();

	// Owner → finder: Enter sends; the finder's thread gets it over Realtime, no reload.
	await owner.getByRole('textbox', { name: 'Sporočilo' }).fill('Je pri vas? Pridem ob 17h.');
	await owner.keyboard.press('Enter');
	await expect(owner.getByRole('log').getByText('Poslano')).toBeVisible();
	await expect(finder.getByRole('log').getByText('Je pri vas? Pridem ob 17h.')).toBeVisible();

	// Finder → owner, with a link: plain text and the caution on both sides, never an anchor.
	await finder.getByRole('textbox', { name: 'Message' }).fill('Yes. Map: https://example.org/park');
	await finder.getByRole('button', { name: 'Send' }).click();
	const received = owner.getByRole('log').getByText('Yes. Map: https://example.org/park');
	await expect(received).toBeVisible();
	await expect(owner.getByRole('log').getByText('Pri povezavah bodite previdni.')).toBeVisible();
	await expect(owner.getByRole('log').getByRole('link')).toHaveCount(0);

	// Each message once on each side (the sender's own echo is merged by id).
	await expect(owner.getByRole('log').getByText('Je pri vas? Pridem ob 17h.')).toHaveCount(1);
	await expect(finder.getByRole('log').getByText('Yes. Map: https://example.org/park')).toHaveCount(1);
	expect(server.sent).toEqual([
		{ from: 'owner', body: { body: 'Je pri vas? Pridem ob 17h.' } },
		{ from: 'finder', body: { body: 'Yes. Map: https://example.org/park' } },
	]);

	// Protected flow (C15): no ad slot.
	await expect(owner.locator('[data-ad-slot]')).toHaveCount(0);
	await expect(finder.locator('[data-ad-slot]')).toHaveCount(0);
	await expectNoAxeViolations(owner);
	await expectNoAxeViolations(finder);
	await finderContext.close();
});

test('below lg the thread stands alone with a back link to the inbox; the inbox lists the conversation', async ({
	page,
	baseURL,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await chatServer(baseURL!).attach(page, OWNER);
	await page.goto(`/nabiralnik/${ID}`);

	await expect(page.getByRole('heading', { level: 1, name: 'Oseba, ki je žival našla' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Sporočila', level: 2 })).toBeHidden();
	await page.getByRole('link', { name: 'Nazaj' }).click();
	await expect(page).toHaveURL(/\/nabiralnik$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Sporočila' })).toBeVisible();
	await page.getByRole('link', { name: /^Najdena žival/ }).click();
	await expect(page).toHaveURL(new RegExp(`/nabiralnik/${ID}$`));
	await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
	await expectNoAxeViolations(page);
});
