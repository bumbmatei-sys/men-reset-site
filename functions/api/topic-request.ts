import { normalizeEmail } from '../../src/data/check-quiz';

type Env = { DB?: D1Database };

const SOURCES = new Set(['tracks', 'teachings']);
const PER_EMAIL_PER_HOUR = 5;
const GLOBAL_PER_MINUTE = 30;

function json(body: { ok: boolean; error?: string }, status: number): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * Stores a topic request from /tracks or /teachings in D1 (table topic_requests).
 * Honeypot field `website` must stay empty. Light rate limit by email and overall volume. No IP or user agent stored.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: 'Not allowed.' }, 403);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return json({ ok: false, error: 'Invalid request.' }, 400);

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }
  if (text.length > 2000) return json({ ok: false, error: 'That is a bit long. Keep the topic short.' }, 400);

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('shape');
    payload = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  // Honeypot: bots fill every field. Pretend success, store nothing.
  if (typeof payload.website === 'string' && payload.website.trim() !== '') return json({ ok: true }, 201);

  const topic = typeof payload.topic === 'string' ? payload.topic.replace(/\s+/g, ' ').trim() : '';
  if (topic.length < 2 || topic.length > 300) return json({ ok: false, error: 'Write the topic in a few words (up to 300 characters).' }, 400);

  const email = normalizeEmail(payload.email);
  if (email === 'invalid' || email === null) return json({ ok: false, error: 'That email does not look right.' }, 400);

  const source = typeof payload.source === 'string' && SOURCES.has(payload.source) ? payload.source : 'other';
  if (!env.DB) return json({ ok: false, error: 'Something went wrong. Try again in a minute.' }, 503);

  try {
    const counts = await env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM topic_requests WHERE email = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')) AS by_email,
         (SELECT COUNT(*) FROM topic_requests WHERE created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 minute')) AS recent`,
    )
      .bind(email)
      .first<{ by_email: number; recent: number }>();
    if (counts && (counts.by_email >= PER_EMAIL_PER_HOUR || counts.recent >= GLOBAL_PER_MINUTE)) {
      return json({ ok: false, error: 'Thanks, I have your topics. Try again a bit later.' }, 429);
    }
    await env.DB.prepare(`INSERT INTO topic_requests (id, topic, email, source) VALUES (?1, ?2, ?3, ?4)`)
      .bind(crypto.randomUUID(), topic, email, source)
      .run();
  } catch (error) {
    console.error('topic_request_failed', error instanceof Error ? error.name : 'unknown');
    return json({ ok: false, error: 'Something went wrong. Try again in a minute.' }, 503);
  }
  return json({ ok: true }, 201);
};
