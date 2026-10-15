import { DodoPayments } from 'dodopayments-checkout';

type GiveMode = 'once' | 'monthly';

const FRAME_ID = 'support-checkout-frame';

function isCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.dodopayments.com';
  } catch {
    return false;
  }
}

function showStatus(status: HTMLElement | null, message: string): void {
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
}

function dollarsToCents(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const dollars = Number(value);
  if (!Number.isInteger(dollars) || dollars < 1 || dollars > 2000) return null;
  return dollars * 100;
}

export function mountSupportCheckout(): void {
  const form = document.querySelector<HTMLFormElement>('[data-support-checkout]');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const onceButton = form.querySelector<HTMLButtonElement>('[data-support-mode="once"]');
  const monthlyButton = form.querySelector<HTMLButtonElement>('[data-support-mode="monthly"]');
  const oncePanel = form.querySelector<HTMLElement>('[data-support-once]');
  const monthlyPanel = form.querySelector<HTMLElement>('[data-support-monthly]');
  const amountInput = form.querySelector<HTMLInputElement>('[data-support-amount]');
  const status = form.querySelector<HTMLElement>('[data-support-status]');
  const placeholder = form.querySelector<HTMLElement>('[data-support-placeholder]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!onceButton || !monthlyButton || !oncePanel || !monthlyPanel || !amountInput || !submit) return;

  let mode: GiveMode = 'once';
  let display: 'inline' | 'overlay' | null = null;

  const setMode = (next: GiveMode) => {
    mode = next;
    const once = next === 'once';
    onceButton.setAttribute('aria-pressed', once ? 'true' : 'false');
    monthlyButton.setAttribute('aria-pressed', once ? 'false' : 'true');
    oncePanel.hidden = !once;
    monthlyPanel.hidden = once;
    amountInput.disabled = !once;
  };

  onceButton.addEventListener('click', () => setMode('once'));
  monthlyButton.addEventListener('click', () => setMode('monthly'));

  const onEvent = (event: { event_type: string }) => {
    if (event.event_type === 'checkout.opened' && placeholder) placeholder.hidden = true;
    if (event.event_type === 'checkout.error') showStatus(status, 'We could not open checkout. Try again.');
  };

  const openCheckout = (checkoutUrl: string) => {
    if (display === null) {
      DodoPayments.Initialize({
        mode: 'live',
        displayType: 'inline',
        onEvent,
      });
      display = 'inline';
    }

    if (DodoPayments.Checkout.isOpen()) DodoPayments.Checkout.close();

    try {
      if (display === 'inline') {
        DodoPayments.Checkout.open({ checkoutUrl, elementId: FRAME_ID });
        return;
      }
      DodoPayments.Checkout.open({ checkoutUrl });
    } catch {
      try {
        if (display !== 'overlay') {
          DodoPayments.Initialize({
            mode: 'live',
            displayType: 'overlay',
            onEvent,
          });
          display = 'overlay';
        }
        if (DodoPayments.Checkout.isOpen()) DodoPayments.Checkout.close();
        DodoPayments.Checkout.open({ checkoutUrl });
      } catch {
        showStatus(status, 'We could not open checkout. Try again.');
      }
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (status) {
      status.hidden = true;
      status.textContent = '';
    }

    const body: { plan: GiveMode; amountCents?: number; dollars?: number } = { plan: mode };
    if (mode === 'once') {
      const amountCents = dollarsToCents(amountInput.value.trim());
      if (amountCents === null) {
        showStatus(status, 'Enter an amount from $1 to $2,000. $10 is the suggested amount.');
        return;
      }
      body.amountCents = amountCents;
    } else {
      const selected = form.querySelector<HTMLInputElement>('input[name="monthly"]:checked');
      const dollars = selected ? Number(selected.value) : NaN;
      if (dollars !== 5 && dollars !== 10 && dollars !== 25) {
        showStatus(status, 'Choose $5, $10, or $25 a month.');
        return;
      }
      body.dollars = dollars;
    }

    submit.disabled = true;
    const previous = submit.textContent;
    submit.textContent = 'Opening…';

    let checkoutUrl: string | null = null;
    let error = 'failed';
    try {
      const response = await fetch('/api/support-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const record = typeof payload === 'object' && payload !== null ? payload : null;
      const url = record && 'checkout_url' in record ? record.checkout_url : null;
      if (response.ok && record && 'ok' in record && record.ok === true && isCheckoutUrl(url)) checkoutUrl = url;
      else if (record && 'error' in record && typeof record.error === 'string') error = record.error;
    } catch {
      checkoutUrl = null;
    }

    submit.disabled = false;
    submit.textContent = previous || 'Open checkout';

    if (!checkoutUrl) {
      showStatus(status, error === 'amount' || error === 'invalid' ? 'Check the amount and try again.' : 'We could not open checkout. Try again.');
      return;
    }

    if (placeholder) placeholder.hidden = true;
    openCheckout(checkoutUrl);
  });
}
