import { buildPlan, type CheckAnswers, type Plan } from '../../src/data/check-quiz';

/** Keep in step with `communityUrl` in theme.config.ts. */
const COMMUNITY_URL = 'https://whop.com/matei-bumb/call-to-reset-community/';
/** Not linked from public pages. Returned only after Plunk accepts the message. */
export const PLAN_PATH = '/plan/r8k2m6q4v1n9w3p7x5t0.pdf';
const PLAN_PDF = `https://calltoreset.site${PLAN_PATH}`;
const PLUNK_SEND = 'https://next-api.useplunk.com/v1/send';

const FROM = { name: 'Call to Reset', email: 'plan@calltoreset.site' };
const SUBJECT = 'Your 30-day reset plan';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function wrap(inner: string): string {
  return `<div style="font-family: Georgia, 'Times New Roman', serif; color: #212121; line-height: 1.5;">
<p style="margin: 0 0 0.4rem; font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Call to Reset</p>
${inner}
<p style="margin: 0.4rem 0;"><a href="${PLAN_PDF}">Download the 30-day plan (PDF)</a></p>
<p style="margin: 0.4rem 0;"><a href="${COMMUNITY_URL}">Join the Whop community</a></p>
</div>`.replaceAll('{{', '&#123;&#123;');
}

function planHtml(plan: Plan): string {
  const caution = plan.caution ? `<p style="margin: 1rem 0; padding: 0.75rem 0.9rem; background: #f6efe6;">${escapeHtml(plan.caution)}</p>` : '';
  const faith = plan.faithNote ? `<p style="margin: 1rem 0 0; line-height: 1.55;">${escapeHtml(plan.faithNote)}</p>` : '';
  return wrap(`<h1 style="margin: 0 0 0.8rem; font-size: 1.7rem; line-height: 1.15;">${escapeHtml(plan.title)}</h1>
<p style="margin: 0 0 1rem;">${escapeHtml(plan.lede)}</p>
${caution}
${faith}
<p style="margin: 1.4rem 0 0.4rem;">Days 1 to 7 are on the site. This email carries the full 30-day plan.</p>`);
}

function linkHtml(): string {
  return wrap(`<h1 style="margin: 0 0 0.8rem; font-size: 1.7rem; line-height: 1.15;">Your 30-day plan</h1>
<p style="margin: 0 0 1rem;">Basically, Jesus already bathed you. So the month is foot washing, closed doors, and a life pointed at what He gave you to build. The habit can be porn, the phone, a game, a drink, a substance, or another loop.</p>`);
}

async function postPlunk(apiKey: string | undefined, email: string, body: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const response = await fetch(PLUNK_SEND, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: SUBJECT,
        body,
        from: FROM,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const data: unknown = await response.json();
    return typeof data === 'object' && data !== null && 'success' in data && data.success === true;
  } catch (error) {
    console.error('plan_email_failed', error instanceof Error ? error.name : 'unknown');
    return false;
  }
}

/**
 * Sends the 30-day plan through Plunk. Returns false when the key is missing or Plunk does not accept the message.
 * Does not log the address or the key.
 */
export async function sendPlanEmail(apiKey: string | undefined, email: string, answers: CheckAnswers): Promise<boolean> {
  return postPlunk(apiKey, email, planHtml(buildPlan(answers)));
}

/** Same PDF, without the check answers. Used by the phase gate. */
export async function sendPlanLinkEmail(apiKey: string | undefined, email: string): Promise<boolean> {
  return postPlunk(apiKey, email, linkHtml());
}
