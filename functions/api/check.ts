import { parseSubmission } from '../../src/data/check-quiz';

type CheckEnv = {
  DB?: D1Database;
};

function json(body: { ok: boolean; error?: string }, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

/**
 * Stores one anonymous self-check. The browser still shows the plan if this fails.
 * Nothing here reads the IP address, user agent, or cookies.
 */
export const onRequestPost: PagesFunction<CheckEnv> = async ({ request, env }) => {
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
  if (text.length > 4000) return json({ ok: false, error: 'invalid' }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  const parsed = parseSubmission(payload);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.error === 'adults-only' ? 403 : 400);
  if (!env.DB) return json({ ok: false, error: 'unavailable' }, 503);

  const row = parsed.row;
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
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  return json({ ok: true }, 201);
};
