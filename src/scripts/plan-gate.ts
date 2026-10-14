const PLAN_URL = /^\/plan\/[a-z0-9]{16,}\.pdf$/;
const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/** Local copy so this file does not pull the 30-day quiz text into lesson pages. */
function normalizeEmail(value: string): string | null | 'invalid' {
  const email = value.trim().toLowerCase();
  if (email.length === 0) return null;
  if (email.length > 254 || /[\s<>]/.test(email) || !EMAIL_PATTERN.test(email)) return 'invalid';
  return email;
}

export type PlanEmailStatus = 'sent' | 'failed' | 'none';

export type PlanRequestResult = {
  emailStatus: PlanEmailStatus;
  planUrl: string | null;
};

export function readPlanUrl(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('planUrl' in payload)) return null;
  const value = payload.planUrl;
  return typeof value === 'string' && PLAN_URL.test(value) ? value : null;
}

function readEmailStatus(payload: unknown): PlanEmailStatus | null {
  if (typeof payload !== 'object' || payload === null || !('emailStatus' in payload)) return null;
  const value = payload.emailStatus;
  if (value === 'sent' || value === 'failed' || value === 'none') return value;
  return null;
}

export async function requestPlan(email: string, source: 'lesson' | 'result'): Promise<PlanRequestResult> {
  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, source }),
      signal: AbortSignal.timeout(8000),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const emailStatus = readEmailStatus(payload) ?? 'failed';
    const planUrl = emailStatus === 'sent' ? readPlanUrl(payload) : null;
    if (emailStatus === 'sent' && !planUrl) return { emailStatus: 'failed', planUrl: null };
    return { emailStatus, planUrl };
  } catch {
    return { emailStatus: 'failed', planUrl: null };
  }
}

function showSuccess(form: HTMLFormElement, planUrl: string) {
  const panel = form.closest<HTMLElement>('[data-plan-panel]');
  form.hidden = true;
  const success = panel?.querySelector<HTMLElement>('[data-plan-success]');
  const link = panel?.querySelector<HTMLAnchorElement>('[data-plan-link]');
  if (link) link.href = planUrl;
  if (success) success.hidden = false;
}

async function submitGate(form: HTMLFormElement) {
  const input = form.querySelector<HTMLInputElement>('input[type="email"]');
  const error = form.querySelector<HTMLElement>('[data-plan-error]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const email = normalizeEmail(input?.value ?? '');
  if (email === 'invalid' || email === null) {
    if (error) {
      error.hidden = false;
      error.textContent = 'Enter a valid email.';
    }
    return;
  }
  if (button) button.disabled = true;
  if (error) error.hidden = true;
  const result = await requestPlan(email, 'lesson');
  if (button) button.disabled = false;
  if (result.emailStatus === 'sent' && result.planUrl) {
    showSuccess(form, result.planUrl);
    return;
  }
  if (error) {
    error.hidden = false;
    error.textContent = 'We could not email the plan. Try again.';
  }
}

/** Lesson pages only. The check result handles its own form so the two do not both submit. */
export function mountPlanGate() {
  if (document.documentElement.dataset.planGate === '1') return;
  document.documentElement.dataset.planGate = '1';
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-plan-gate')) return;
    if (form.closest('#check-app')) return;
    event.preventDefault();
    void submitGate(form);
  });
}
