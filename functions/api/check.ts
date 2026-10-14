import { parseSubmission, type CheckAnswers, type StoredCheck } from '../../src/data/check-quiz';
import { PLAN_PATH, sendPlanEmail } from '../email/send-plan';

type CheckEnv = {
  DB?: D1Database;
  PLUNK_API_KEY?: string;
};

type EmailStatus = 'sent' | 'failed' | 'none';

function json(body: { ok: boolean; error?: string; emailStatus: EmailStatus; planUrl?: string }, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function answersFromRow(row: StoredCheck): CheckAnswers {
  return {
    age: row.age_range,
    region: row.region,
    struggle: row.struggle,
    duration: row.duration,
    frequency: row.frequency,
    trigger: row.trigger,
    faith: row.faith ?? 'skipped',
    want: row.want,
    source: row.source,
  } as CheckAnswers;
}

/**
 * Stores one anonymous self-check and, when an email was given, sends the plan.
 * Days 1 to 7 still render in the browser if this fails. The PDF path is not returned.
 * Nothing here reads the IP address, user agent, or cookies.
 */
export const onRequestPost: PagesFunction<CheckEnv> = async ({ request, env }) => {
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
  if (text.length > 4000) return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'invalid', emailStatus: 'none' }, 400);
  }

  const parsed = parseSubmission(payload);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, emailStatus: 'none' }, 400);

  const row = parsed.row;
  let emailStatus: EmailStatus = 'none';
  if (row.email) {
    const sent = await sendPlanEmail(env.PLUNK_API_KEY, row.email, answersFromRow(row));
    emailStatus = sent ? 'sent' : 'failed';
  }
  const planUrl = emailStatus === 'sent' ? PLAN_PATH : undefined;

  if (!env.DB) return json({ ok: false, error: 'unavailable', emailStatus, planUrl }, 503);

  try {
    await env.DB.prepare(
      `INSERT INTO check_responses (
        id, age_range, region, struggle, duration, frequency, trigger, faith, want, source, plan_variant, recommended_track, email
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
      .bind(crypto.randomUUID(), row.age_range, row.region, row.struggle, row.duration, row.frequency, row.trigger, row.faith, row.want, row.source, row.plan_variant, row.recommended_track, row.email)
      .run();
  } catch (error) {
    console.error('check_insert_failed', error instanceof Error ? error.name : 'unknown');
    return json({ ok: false, error: 'unavailable', emailStatus, planUrl }, 503);
  }

  return json({ ok: true, emailStatus, planUrl }, 201);
};
