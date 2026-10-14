import { normalizeEmail } from '../../src/data/check-quiz';
import { subscribeContact } from '../email/subscribe-contact';

type NewsletterEnv = {
  DB?: D1Database;
  PLUNK_API_KEY?: string;
};

type NewsletterBody = {
  ok: boolean;
  error?: string;
};

function json(body: NewsletterBody, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function alreadyStored(error: unknown): boolean {
  return error instanceof Error && /unique/i.test(error.message);
}

/**
 * Stores a newsletter email and adds the same address in Plunk.
 * A repeat signup stays one row. Nothing here reads the IP address, user agent, or cookies.
 */
export const onRequestPost: PagesFunction<NewsletterEnv> = async ({ request, env }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: 'forbidden' }, 403);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return json({ ok: false, error: 'invalid' }, 400);

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }
  if (text.length > 2000) return json({ ok: false, error: 'invalid' }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }
  if (typeof payload !== 'object' || payload === null) return json({ ok: false, error: 'invalid' }, 400);

  const email = normalizeEmail((payload as Record<string, unknown>).email);
  if (email === 'invalid' || email === null) return json({ ok: false, error: 'invalid' }, 400);
  if (!env.DB) return json({ ok: false, error: 'unavailable' }, 503);

  try {
    await env.DB.prepare(`INSERT INTO newsletter_subscribers (id, email) VALUES (?1, ?2)`).bind(crypto.randomUUID(), email).run();
  } catch (error) {
    if (!alreadyStored(error)) {
      console.error('newsletter_insert_failed', error instanceof Error ? error.name : 'unknown');
      return json({ ok: false, error: 'unavailable' }, 503);
    }
  }

  const added = await subscribeContact(env.PLUNK_API_KEY, email);
  if (!added) return json({ ok: false, error: 'failed' }, 502);

  return json({ ok: true }, 201);
};
