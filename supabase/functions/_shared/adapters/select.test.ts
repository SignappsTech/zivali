import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../env.ts';
import { aiAdapter } from './ai/index.ts';
import { captchaAdapter } from './captcha/index.ts';
import { emailAdapter } from './email/index.ts';
import { embedderAdapter } from './embedder/index.ts';
import { paymentsAdapter } from './payments/index.ts';
import { pushAdapter } from './push/index.ts';
import { pickProvider } from './select.ts';

const envOf = (vars: Record<string, string>): Env => (name) => vars[name] || undefined;

const adapters = [
  { name: 'ai', select: aiAdapter, variable: 'AI_PROVIDER', provider: 'anthropic', creds: ['ANTHROPIC_API_KEY'] },
  { name: 'embedder', select: embedderAdapter, variable: 'EMBEDDER_PROVIDER', provider: 'voyage', creds: ['VOYAGE_API_KEY'] },
  { name: 'payments', select: paymentsAdapter, variable: 'PAYMENTS_PROVIDER', provider: 'stripe', creds: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  { name: 'email', select: emailAdapter, variable: 'EMAIL_PROVIDER', provider: 'brevo', creds: ['BREVO_API_KEY'] },
  { name: 'push', select: pushAdapter, variable: 'PUSH_PROVIDER', provider: 'expo', creds: ['EXPO_ACCESS_TOKEN'] },
  { name: 'captcha', select: captchaAdapter, variable: 'CAPTCHA_PROVIDER', provider: 'turnstile', creds: ['TURNSTILE_SECRET_KEY'] },
];

describe('pickProvider', () => {
  const creds = { real: ['REAL_KEY', 'REAL_SECRET'] };

  it('defaults to mock when the variable is unset or empty', () => {
    expect(pickProvider('X_PROVIDER', creds, envOf({}))).toBe('mock');
    expect(pickProvider('X_PROVIDER', creds, envOf({ X_PROVIDER: '' }))).toBe('mock');
  });

  it('returns the named provider when all its credentials are set', () => {
    const get = envOf({ X_PROVIDER: ' Real ', REAL_KEY: 'k', REAL_SECRET: 's' });
    expect(pickProvider('X_PROVIDER', creds, get)).toBe('real');
  });

  it('falls back to mock and warns (names only) when a credential is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(pickProvider('X_PROVIDER', creds, envOf({ X_PROVIDER: 'real', REAL_KEY: 'k' }))).toBe('mock');
    const line = JSON.parse(warn.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: 'warn', fn: 'adapters', provider: 'real', missing: 'REAL_SECRET' });
    warn.mockRestore();
  });

  it('throws on an unknown provider', () => {
    expect(() => pickProvider('X_PROVIDER', creds, envOf({ X_PROVIDER: 'nope' }))).toThrow(/unknown provider/);
  });
});

describe.each(adapters)('$name adapter', ({ select, variable, provider, creds }) => {
  it('is mock by default', () => {
    expect(select(envOf({})).provider).toBe('mock');
  });

  it(`is mock when ${variable}=${provider} but credentials are missing`, () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(select(envOf({ [variable]: provider })).provider).toBe('mock');
    vi.restoreAllMocks();
  });

  it(`selects ${provider} when its credentials are set (adapter lands with its feature task)`, () => {
    const vars = Object.fromEntries([[variable, provider], ...creds.map((k) => [k, 'set'])]);
    expect(() => select(envOf(vars))).toThrow(`${variable}=${provider}: adapter not implemented yet`);
  });
});

describe('mock behaviour', () => {
  it('captcha rejects empty and "fail" tokens only', async () => {
    const captcha = captchaAdapter(envOf({}));
    expect(await captcha.verify('any')).toBe(true);
    expect(await captcha.verify('')).toBe(false);
    expect(await captcha.verify('fail')).toBe(false);
  });

  it('embedder is deterministic and unit length', async () => {
    const embedder = embedderAdapter(envOf({}));
    const a = await embedder.embed(new Uint8Array([1, 2, 3]));
    const b = await embedder.embed(new Uint8Array([1, 2, 3]));
    expect(a.vector).toEqual(b.vector);
    expect(a.vector).toHaveLength(a.dim);
    expect(Math.hypot(...a.vector)).toBeCloseTo(1, 6);
  });

  it('payments mock links to the dev checkout and verifies webhook signatures', async () => {
    const get = envOf({ APP_URL: 'http://localhost:3000', MOCK_WEBHOOK_SECRET: 'local-secret' });
    const payments = paymentsAdapter(get);
    const session = await payments.createCheckout({
      paymentId: 'p1', purpose: 'tip', amountCents: 500, currency: 'EUR', userId: 'u1', refs: {},
      successUrl: 's', cancelUrl: 'c',
    });
    expect(session.url).toBe('http://localhost:3000/dev/checkout?payment_id=p1');

    const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', livemode: false, data: {} });
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('local-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
    const signature = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');

    expect((await payments.parseWebhook(body, signature)).id).toBe('evt_1');
    await expect(payments.parseWebhook(body, '0'.repeat(64))).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(payments.parseWebhook(body, null)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
