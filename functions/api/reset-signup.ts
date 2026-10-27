type Env = {
  SIGNUPS?: KVNamespace;
};

type Body = { ok: boolean; error?: string };

function json(body: Body, status: number): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

/**
 * 30-day reset list. Stores email, optional name, the page it came from and the date in KV.
 * One key per email, so a repeat signup overwrites itself. No IP, user agent or cookies are read.
 * Nothing is emailed and no third party is called.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return json({ ok: false, error: 'invalid' }, 400);

  const text = await request.text().catch(() => '');
  if (!text || text.length > 2000) return json({ ok: false, error: 'invalid' }, 400);
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return json({ ok: false, error: 'invalid' }, 400);
    payload = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  // Honeypot: bots fill every field. Pretend it worked and store nothing.
  if (typeof payload.website === 'string' && payload.website.trim() !== '') return json({ ok: true }, 201);

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) return json({ ok: false, error: 'invalid' }, 400);
  const name = typeof payload.name === 'string' ? payload.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) : '';
  const source = typeof payload.source === 'string' ? payload.source.replace(/[^a-z0-9:/_-]/gi, '').slice(0, 120) : '';

  if (!env.SIGNUPS) return json({ ok: false, error: 'unavailable' }, 503);
  try {
    await env.SIGNUPS.put(`signup:${email}`, JSON.stringify({ email, name, source, createdAt: new Date().toISOString() }));
  } catch (error) {
    console.error('reset_signup_failed', error instanceof Error ? error.name : 'unknown');
    return json({ ok: false, error: 'unavailable' }, 503);
  }
  return json({ ok: true }, 201);
};
