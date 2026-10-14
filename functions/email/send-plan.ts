import { buildPlan, type CheckAnswers, type Plan } from '../../src/data/check-quiz';

/** Keep in step with `communityUrl` in theme.config.ts. */
const COMMUNITY_URL = 'https://whop.com/matei-bumb/call-to-reset-community/';
const PLAN_PAGE = 'https://calltoreset.site/plan';
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

function planHtml(plan: Plan): string {
  const phases = plan.phases
    .map((phase) => {
      const days = phase.days.map((day) => `<li style="margin: 0 0 0.45rem;"><strong>Day ${day.day}.</strong> ${escapeHtml(day.action)}</li>`).join('');
      return `<h2 style="margin: 1.6rem 0 0.6rem; font-size: 1.15rem;">${escapeHtml(phase.title)}</h2><ol style="margin: 0; padding-left: 1.2rem;">${days}</ol>`;
    })
    .join('');
  const caution = plan.caution ? `<p style="margin: 1rem 0; padding: 0.75rem 0.9rem; background: #f6efe6;">${escapeHtml(plan.caution)}</p>` : '';
  const faith = plan.faithNote ? `<h2 style="margin: 1.6rem 0 0.6rem; font-size: 1.15rem;">If faith is part of it</h2><p style="margin: 0; line-height: 1.55;">${escapeHtml(plan.faithNote)}</p>` : '';
  return `<div style="font-family: Georgia, 'Times New Roman', serif; color: #212121; line-height: 1.5;">
<p style="margin: 0 0 0.4rem; font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Call to Reset</p>
<h1 style="margin: 0 0 0.8rem; font-size: 1.7rem; line-height: 1.15;">${escapeHtml(plan.title)}</h1>
<p style="margin: 0 0 1rem;">${escapeHtml(plan.lede)}</p>
${caution}
${phases}
${faith}
<p style="margin: 1.6rem 0 0.4rem;">The same plan is on the site if you still have that page open. This email is the copy you can keep.</p>
<p style="margin: 0.4rem 0;"><a href="${PLAN_PAGE}">Open the printable plan</a></p>
<p style="margin: 0.4rem 0;"><a href="${COMMUNITY_URL}">Join the Whop community</a></p>
</div>`.replaceAll('{{', '&#123;&#123;');
}

/**
 * Sends the 30-day plan through Plunk. Returns false when the key is missing or Plunk does not accept the message.
 * Does not log the address or the key.
 */
export async function sendPlanEmail(apiKey: string | undefined, email: string, answers: CheckAnswers): Promise<boolean> {
  if (!apiKey) return false;
  const plan = buildPlan(answers);
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
        body: planHtml(plan),
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
