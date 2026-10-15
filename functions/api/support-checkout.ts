type SupportEnv = {
  DODO_API_KEY?: string;
};

type SupportBody = {
  ok: boolean;
  error?: string;
  checkout_url?: string;
};

const RETURN_URL = 'https://calltoreset.site/support/thanks';
const CHECKOUT_ENDPOINT = 'https://live.dodopayments.com/checkouts';
const ONCE_PRODUCT = 'pdt_0Npo0393DhfZjbT4kxfwo';
const MONTHLY_PRODUCTS = {
  5: 'pdt_0Npo03DOxmrPABowmgxZ8',
  10: 'pdt_0Npo03LGyc3LtgrWE4xt1',
  25: 'pdt_0Npo03PVrgqkJwo3qqKAc',
} as const;

const MIN_CENTS = 100;
const MAX_CENTS = 200_000;

function json(body: SupportBody, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function isCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.dodopayments.com';
  } catch {
    return false;
  }
}

function productCart(payload: Record<string, unknown>): { product_id: string; quantity: 1; amount?: number }[] | null {
  if (payload.plan === 'once') {
    const amount = payload.amountCents;
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < MIN_CENTS || amount > MAX_CENTS) return null;
    return [{ product_id: ONCE_PRODUCT, quantity: 1, amount }];
  }

  if (payload.plan === 'monthly') {
    const dollars = payload.dollars;
    if (dollars === 5) return [{ product_id: MONTHLY_PRODUCTS[5], quantity: 1 }];
    if (dollars === 10) return [{ product_id: MONTHLY_PRODUCTS[10], quantity: 1 }];
    if (dollars === 25) return [{ product_id: MONTHLY_PRODUCTS[25], quantity: 1 }];
  }

  return null;
}

/**
 * Creates a live Dodo checkout session for one of the four support products.
 * The key stays on the server. The browser only receives checkout_url.
 */
export const onRequestPost: PagesFunction<SupportEnv> = async ({ request, env }) => {
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

  const cart = productCart(payload as Record<string, unknown>);
  if (!cart) return json({ ok: false, error: 'invalid' }, 400);
  if (!env.DODO_API_KEY) return json({ ok: false, error: 'unavailable' }, 503);

  let response: Response;
  try {
    response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.DODO_API_KEY}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        product_cart: cart,
        return_url: RETURN_URL,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error('support_checkout_failed', error instanceof Error ? error.name : 'unknown');
    return json({ ok: false, error: 'failed' }, 502);
  }

  if (!response.ok) {
    console.error('support_checkout_rejected', response.status);
    return json({ ok: false, error: response.status === 400 ? 'amount' : 'failed' }, response.status === 400 ? 400 : 502);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return json({ ok: false, error: 'failed' }, 502);
  }
  const checkoutUrl = typeof data === 'object' && data !== null && 'checkout_url' in data ? data.checkout_url : null;
  if (!isCheckoutUrl(checkoutUrl)) return json({ ok: false, error: 'failed' }, 502);

  return json({ ok: true, checkout_url: checkoutUrl }, 200);
};
