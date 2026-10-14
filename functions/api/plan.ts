import { normalizeEmail } from '../../src/data/check-quiz';
import { PLAN_PATH, sendPlanLinkEmail } from '../email/send-plan';

type PlanEnv = {
  DB?: D1Database;
  PLUNK_API_KEY?: string;
};

type EmailStatus = 'sent' | 'failed' | 'none';

type PlanBody = {
  ok: boolean;
  error?: string;
  emailStatus: EmailStatus;
  planUrl?: string;
};

const SOURCES = new Set(['lesson', 'result']);

function json(body: PlanBody, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

/**
 * Stores an email from the plan gate and sends the PDF link.
 * The path is included only after Plunk accepts the message.
 * Nothing here reads the IP address, user agent, or cookies.
 */
export const onRequestPost: PagesFunction<PlanEnv> = async ({ request, env }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: 'forbidden', emailStatus: 'none' }, 403);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);
  }
  if (text.length > 2000) return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);
  }
  if (typeof payload !== 'object' || payload === null) return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);

  const record = payload as Record<string, unknown>;
  const email = normalizeEmail(record.email);
  if (email === 'invalid' || email === null) return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);
  const source = record.source;
  if (typeof source !== 'string' || !SOURCES.has(source)) return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);

  const sent = await sendPlanLinkEmail(env.PLUNK_API_KEY, email);
  const emailStatus: EmailStatus = sent ? 'sent' : 'failed';
  const planUrl = sent ? PLAN_PATH : undefined;

  if (!env.DB) return json({ ok: false, error: 'unavailable', emailStatus, planUrl }, 503);

  try {
    await env.DB.prepare(`INSERT INTO plan_emails (id, email, source) VALUES (?1, ?2, ?3)`).bind(crypto.randomUUID(), email, source).run();
  } catch (error) {
    console.error('plan_insert_failed', error instanceof Error ? error.name : 'unknown');
    return json({ ok: false, error: 'unavailable', emailStatus, planUrl }, 503);
  }

  return json({ ok: true, emailStatus, planUrl }, 201);
};
