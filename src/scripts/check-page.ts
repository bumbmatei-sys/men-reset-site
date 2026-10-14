import { CONSENT_LINE, buildPlan, normalizeEmail, questions, type CheckAnswers, type Plan, type QuestionId } from '../data/check-quiz';
import { readPlanUrl, requestPlan } from './plan-gate';

type Phase = 'question' | 'consent' | 'result';
type EmailStatus = 'sent' | 'failed' | 'none' | 'saving';

type State = {
  phase: Phase;
  step: number;
  answers: Partial<CheckAnswers>;
  email: string;
  emailError: string;
  formError: string;
  emailStatus: EmailStatus;
  saved: boolean;
  settled: boolean;
  plan: Plan | null;
  planUrl: string | null;
  moveFocus: boolean;
};

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

function answerValue(answers: Partial<CheckAnswers>, id: QuestionId): string | undefined {
  switch (id) {
    case 'age':
      return answers.age;
    case 'region':
      return answers.region;
    case 'struggle':
      return answers.struggle;
    case 'duration':
      return answers.duration;
    case 'frequency':
      return answers.frequency;
    case 'trigger':
      return answers.trigger;
    case 'faith':
      return answers.faith;
    case 'want':
      return answers.want;
    default:
      return answers.source;
  }
}

function writeAnswer(answers: Partial<CheckAnswers>, id: QuestionId, value: string) {
  switch (id) {
    case 'age':
      answers.age = value as CheckAnswers['age'];
      break;
    case 'region':
      answers.region = value as CheckAnswers['region'];
      break;
    case 'struggle':
      answers.struggle = value as CheckAnswers['struggle'];
      break;
    case 'duration':
      answers.duration = value as CheckAnswers['duration'];
      break;
    case 'frequency':
      answers.frequency = value as CheckAnswers['frequency'];
      break;
    case 'trigger':
      answers.trigger = value as CheckAnswers['trigger'];
      break;
    case 'faith':
      answers.faith = value as CheckAnswers['faith'];
      break;
    case 'want':
      answers.want = value as CheckAnswers['want'];
      break;
    default:
      answers.source = value as CheckAnswers['source'];
  }
}

function isComplete(answers: Partial<CheckAnswers>): answers is CheckAnswers {
  return questions.every((question) => {
    const value = answerValue(answers, question.id);
    return typeof value === 'string' && value.length > 0;
  });
}

function progressMarkup(current: number, total: number, label: string): string {
  const width = Math.round((current / total) * 100);
  return `<div class="check-progress"><p class="check-count">${escapeHtml(label)}</p><div class="check-progress-track" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${current}" aria-label="${escapeHtml(label)}"><span class="check-progress-bar" style="width: ${width}%"></span></div></div>`;
}

function questionMarkup(state: State): string {
  const question = questions[state.step];
  if (!question) return '';
  const selected = answerValue(state.answers, question.id);
  const options = question.options
    .map((option) => {
      const checked = option.value === selected ? ' checked' : '';
      return `<label class="check-option"><input type="radio" name="check-answer" value="${option.value}"${checked} /><span>${escapeHtml(option.label)}</span></label>`;
    })
    .join('');
  const hint = 'hint' in question && question.hint ? `<p class="check-hint">${escapeHtml(question.hint)}</p>` : '';
  const skip = 'optional' in question && question.optional ? `<button type="button" class="btn-secondary" data-action="skip">Skip this question</button>` : '';
  const error = state.formError ? `<p class="check-error" role="alert">${escapeHtml(state.formError)}</p>` : '';
  return `${progressMarkup(state.step + 1, questions.length, `Question ${state.step + 1} of ${questions.length}`)}<form class="check-card" data-question="${question.id}"><h2 class="check-prompt" id="check-prompt-label" tabindex="-1">${escapeHtml(question.prompt)}</h2>${hint}<div class="check-options" role="radiogroup" aria-labelledby="check-prompt-label">${options}</div>${error}<div class="check-actions">${state.step > 0 ? '<button type="button" class="btn-secondary" data-action="back">Back</button>' : ''}<button type="submit" class="btn-primary">Continue</button>${skip}</div></form>`;
}

function isMinor(state: State): boolean {
  return state.answers.age === 'under-18';
}

function consentMarkup(state: State): string {
  const error = state.emailError ? `<p class="check-error" role="alert">${escapeHtml(state.emailError)}</p>` : '';
  const email = isMinor(state)
    ? ''
    : `<label class="check-email-label" for="check-email">Email the plan (optional)</label><input id="check-email" class="input-primary input-primary-contact" type="email" name="email" maxlength="254" autocomplete="email" inputmode="email" placeholder="you@example.com" value="${escapeHtml(state.email)}" /><p class="check-hint">Leave this blank and we store no email. If you add one, we send the plan to that address.</p>`;
  return `${progressMarkup(questions.length, questions.length, 'Last step')}<form class="check-card" data-consent><h2 class="check-prompt" tabindex="-1">Your plan is ready</h2><p class="check-consent">${escapeHtml(CONSENT_LINE)}</p><p class="check-hint"><a href="/privacy">Read the privacy page</a></p>${email}${error}<div class="check-actions"><button type="button" class="btn-secondary" data-action="back">Back</button><button type="submit" class="btn-primary">See my plan</button></div></form>`;
}

function trackMarkup(track: Plan['track'], label: string): string {
  if (track.status !== 'available') return '';
  const start = track.startHref ? `<a class="btn-primary" href="${track.startHref}">Start the first lesson</a>` : `<a class="btn-primary" href="${track.href}">Open the track</a>`;
  return `<section class="check-track"><p class="check-kicker">${escapeHtml(label)}</p><h3>${escapeHtml(track.title)}</h3><p>This track is open. The lessons are short and practical.</p><div class="check-actions">${start}<a class="btn-secondary" href="${track.href}">Track page</a></div></section>`;
}

function saveLine(state: State): string {
  if (state.emailStatus === 'saving') return 'Sending your plan…';
  if (state.emailStatus === 'sent') return 'Your plan is on its way to your inbox';
  if (state.settled && !state.saved && state.emailStatus !== 'failed') return 'We could not save this check. Days 1 to 7 are still here.';
  return '';
}

function marbleImg(kind: 'check' | 'flow' | 'scroll', alt: string): string {
  const files = {
    check: ['/images/marble/marble-check.webp', 512, 500],
    flow: ['/images/marble/marble-flow-diagram.webp', 854, 1024],
    scroll: ['/images/marble/marble-scroll.webp', 512, 383],
  } as const;
  const [src, width, height] = files[kind];
  return `<img class="marble-accent marble-${kind}" src="${src}" alt="${alt}" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
}

function phaseTeaser(): string {
  return '[Copy coming.]';
}

function phasesMarkup(plan: Plan, unlocked: boolean): string {
  const head = `<div class="marble-row">${marbleImg('flow', 'Marble diagram of four connected steps')}<div><p class="check-kicker">Four phases</p><p>[Copy coming.]</p></div></div>`;
  const sections = plan.phases
    .map((phase, index) => {
      if (index === 0 || unlocked) {
        const days = phase.days.map((day) => `<li><span class="check-day">Day ${day.day}</span> ${escapeHtml(day.action)}</li>`).join('');
        return `<section class="check-phase"><h3>${escapeHtml(phase.title)}</h3><ol class="check-days">${days}</ol></section>`;
      }
      return `<section class="check-phase"><h3>${escapeHtml(phase.title)}</h3><p>${escapeHtml(phaseTeaser())}</p></section>`;
    })
    .join('');
  return head + sections;
}

function gateMarkup(state: State): string {
  if (isMinor(state)) return '';
  if (state.emailStatus === 'sent' && state.planUrl) return '';
  if (state.emailStatus === 'saving') return '';
  const message = state.emailError || (state.emailStatus === 'failed' ? 'We could not email the plan. Try again.' : '');
  const error = message ? `<p class="check-error" role="alert">${escapeHtml(message)}</p>` : '';
  return `<form class="plan-gate-form" data-plan-gate data-plan-source="result"><h3>Get the full 30-day plan by email</h3><label class="check-email-label" for="plan-email">Email</label><input id="plan-email" class="input-primary input-primary-contact" type="email" name="email" maxlength="254" autocomplete="email" inputmode="email" placeholder="you@example.com" value="${escapeHtml(state.email)}" required />${error}<div class="check-actions"><button type="submit" class="btn-primary">Send the plan</button></div></form>`;
}

function resultMarkup(state: State): string {
  const plan = state.plan;
  if (!plan) return '';
  const caution = plan.caution ? `<p class="check-caution">${escapeHtml(plan.caution)}</p>` : '';
  const faith = plan.faithNote ? `<section class="check-phase"><h3>If faith is part of it</h3><p>${escapeHtml(plan.faithNote)}</p></section>` : '';
  const companion = plan.companion ? trackMarkup(plan.companion, 'Also on the site') : '';
  const unlocked = isMinor(state) || (state.emailStatus === 'sent' && Boolean(state.planUrl));
  const line = saveLine(state);
  const save = line ? `<p class="check-save" data-save="${state.emailStatus}">${escapeHtml(line)}</p>` : '';
  const earned = unlocked ? marbleImg('check', 'A marble check mark') : '';
  const download = !isMinor(state) && unlocked && state.planUrl
    ? `<a class="btn-primary" href="${escapeHtml(state.planUrl)}">Download the 30-day plan (PDF)</a>`
    : '';
  return `${progressMarkup(questions.length, questions.length, 'Your plan')}<div class="check-card">${earned}<h2 class="check-prompt" tabindex="-1">${escapeHtml(plan.title)}</h2><p class="check-lede">${escapeHtml(plan.lede)}</p>${caution}${save}<aside class="takeaway"><p class="course-kicker">Key takeaway</p><p>Thirty days. One action a day. Do the day in front of you, then stop.</p></aside><ol class="habit-loop" aria-label="Habit loop"><li><span class="habit-label">Trigger</span><p>The hour or feeling that starts it.</p></li><li><span class="habit-label">Routine</span><p>The habit you named in the check.</p></li><li><span class="habit-label">Reward</span><p>The first ten minutes you do instead.</p></li></ol>${trackMarkup(plan.track, 'Recommended track')}<div class="check-phases">${phasesMarkup(plan, unlocked)}${gateMarkup(state)}</div>${faith}${companion}<section class="check-phase"><h3>The 30-day reset</h3><p>Break Free is the free 30-day reset. Days 1-7 are open on the site. Days 8-30 arrive in your inbox as a PDF. The thirty days above are the plan. Basically, start there and let grace do the rest.</p><a class="btn-secondary" href="${plan.resetHref}">Open the 30-day reset</a></section><div class="check-actions">${download}<button type="button" class="btn-secondary" data-action="restart">Start over</button></div></div>`;
}

function render(root: HTMLElement, state: State) {
  if (state.phase === 'consent') root.innerHTML = consentMarkup(state);
  else if (state.phase === 'result' && state.plan) root.innerHTML = resultMarkup(state);
  else root.innerHTML = questionMarkup(state);

  if (!state.moveFocus) return;
  const prompt = root.querySelector<HTMLElement>('.check-prompt');
  prompt?.focus();
}

function readEmailStatus(payload: unknown): 'sent' | 'failed' | 'none' | null {
  if (typeof payload !== 'object' || payload === null || !('emailStatus' in payload)) return null;
  const value = payload.emailStatus;
  if (value === 'sent' || value === 'failed' || value === 'none') return value;
  return null;
}

async function saveAnswers(answers: CheckAnswers, email: string | null): Promise<{ saved: boolean; emailStatus: 'sent' | 'failed' | 'none'; planUrl: string | null }> {
  const fallback = email ? 'failed' : 'none';
  try {
    const response = await fetch('/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...answers, email }),
      signal: AbortSignal.timeout(8000),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const reported = readEmailStatus(payload) ?? fallback;
    const planUrl = reported === 'sent' ? readPlanUrl(payload) : null;
    const emailStatus = reported === 'sent' && !planUrl ? 'failed' : reported;
    const saved = response.ok && typeof payload === 'object' && payload !== null && 'ok' in payload && payload.ok === true;
    return { saved, emailStatus, planUrl };
  } catch {
    return { saved: false, emailStatus: fallback, planUrl: null };
  }
}

export function mountCheckQuiz(root: HTMLElement) {
  if (root.dataset.ready === '1') return;
  root.dataset.ready = '1';

  const state: State = {
    phase: 'question',
    step: 0,
    answers: {},
    email: '',
    emailError: '',
    formError: '',
    emailStatus: 'none',
    saved: false,
    settled: false,
    plan: null,
    planUrl: null,
    moveFocus: false,
  };

  const paint = () => render(root, state);

  root.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
    event.preventDefault();

    if (form.hasAttribute('data-plan-gate')) {
      if (isMinor(state)) return;
      const emailInput = form.querySelector<HTMLInputElement>('#plan-email');
      const email = normalizeEmail(emailInput?.value ?? '');
      if (email === 'invalid' || email === null) {
        state.email = emailInput?.value ?? '';
        state.emailError = 'Enter a valid email.';
        state.moveFocus = false;
        paint();
        return;
      }
      state.email = email;
      state.emailError = '';
      state.emailStatus = 'saving';
      state.planUrl = null;
      state.moveFocus = false;
      paint();
      void requestPlan(email, 'result').then((result) => {
        state.emailStatus = result.emailStatus;
        state.planUrl = result.planUrl;
        state.moveFocus = false;
        paint();
      });
      return;
    }

    if (form.dataset.consent === '') {
      const emailInput = form.querySelector<HTMLInputElement>('#check-email');
      const raw = isMinor(state) ? '' : (emailInput?.value ?? '');
      const email = isMinor(state) ? null : normalizeEmail(raw);
      if (email === 'invalid') {
        state.email = raw;
        state.emailError = 'Enter a valid email, or leave the field blank.';
        state.moveFocus = false;
        paint();
        root.querySelector<HTMLInputElement>('#check-email')?.focus();
        return;
      }
      if (!isComplete(state.answers)) return;
      state.email = email ?? '';
      state.emailError = '';
      state.plan = buildPlan(state.answers);
      state.phase = 'result';
      state.emailStatus = email ? 'saving' : 'none';
      state.saved = false;
      state.settled = false;
      state.planUrl = null;
      state.moveFocus = true;
      paint();
      const plan = state.plan;
      void saveAnswers(state.answers, email).then((save) => {
        if (state.plan !== plan) return;
        state.saved = save.saved;
        state.settled = true;
        state.emailStatus = save.emailStatus;
        state.planUrl = save.planUrl;
        state.moveFocus = false;
        paint();
      });
      return;
    }

    const question = questions[state.step];
    if (!question) return;
    const selected = new FormData(form).get('check-answer');
    if (typeof selected !== 'string' || !question.options.some((option) => option.value === selected)) {
      state.formError = 'Choose one to continue.';
      state.moveFocus = false;
      paint();
      return;
    }
    state.formError = '';
    writeAnswer(state.answers, question.id, selected);
    state.moveFocus = true;
    if (state.step >= questions.length - 1) {
      if (state.answers.faith == null) state.answers.faith = 'skipped';
      state.phase = 'consent';
    } else {
      state.step += 1;
    }
    paint();
  });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!action) return;
    state.moveFocus = true;
    if (action === 'back') {
      if (state.phase === 'consent') {
        state.phase = 'question';
        state.step = questions.length - 1;
        paint();
        return;
      }
      if (state.step > 0) state.step -= 1;
      paint();
      return;
    }
    if (action === 'skip') {
      const question = questions[state.step];
      if (!question || !('optional' in question)) return;
      writeAnswer(state.answers, question.id, 'skipped');
      state.step += 1;
      if (state.step >= questions.length) state.phase = 'consent';
      paint();
      return;
    }
    if (action === 'restart') {
      state.phase = 'question';
      state.step = 0;
      state.answers = {};
      state.email = '';
      state.emailError = '';
      state.formError = '';
      state.emailStatus = 'none';
      state.saved = false;
      state.settled = false;
      state.plan = null;
      state.planUrl = null;
      paint();
    }
  });

  paint();
}
