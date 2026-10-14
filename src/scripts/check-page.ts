import { CONSENT_LINE, buildPlan, normalizeEmail, questions, type CheckAnswers, type Plan, type QuestionId } from '../data/check-quiz';

type Phase = 'question' | 'consent' | 'result' | 'minor';
type SaveState = 'idle' | 'saving' | 'stored' | 'stored-email' | 'failed';

type State = {
  phase: Phase;
  step: number;
  answers: Partial<CheckAnswers>;
  email: string;
  emailError: string;
  formError: string;
  save: SaveState;
  plan: Plan | null;
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

function consentMarkup(state: State): string {
  const error = state.emailError ? `<p class="check-error" role="alert">${escapeHtml(state.emailError)}</p>` : '';
  return `${progressMarkup(questions.length, questions.length, 'Last step')}<form class="check-card" data-consent><h2 class="check-prompt" tabindex="-1">Your plan is ready</h2><p class="check-consent">${escapeHtml(CONSENT_LINE)}</p><p class="check-hint"><a href="/privacy">Read the privacy page</a></p><label class="check-email-label" for="check-email">Email the plan (optional)</label><input id="check-email" class="input-primary input-primary-contact" type="email" name="email" maxlength="254" autocomplete="email" inputmode="email" placeholder="you@example.com" value="${escapeHtml(state.email)}" /><p class="check-hint">Leave this blank and we store no email. If you add one, we keep it with these answers so we can send the plan. Mail is not connected yet, so nothing is sent. The plan shows on the next screen either way.</p>${error}<div class="check-actions"><button type="button" class="btn-secondary" data-action="back">Back</button><button type="submit" class="btn-primary">See my plan</button></div></form>`;
}

function trackMarkup(track: Plan['track'], label: string): string {
  const soon = track.status === 'coming-soon' ? '<span class="coming-soon">Coming soon</span>' : '';
  const start = track.startHref ? `<a class="btn-primary" href="${track.startHref}">Start the first lesson</a>` : `<a class="btn-primary" href="${track.href}">Open the track</a>`;
  return `<section class="check-track"><p class="check-kicker">${escapeHtml(label)}</p><h3>${escapeHtml(track.title)}</h3>${soon}<p>${track.status === 'available' ? 'This track is open. The lessons are short and practical.' : 'This track is marked coming soon. Use the four weeks on this page until it opens.'}</p><div class="check-actions">${start}<a class="btn-secondary" href="${track.href}">Track page</a></div></section>`;
}

function resultMarkup(plan: Plan, save: SaveState): string {
  const weeks = plan.weeks.map((week) => `<section class="check-week"><h3>${escapeHtml(week.title)}</h3><p>${escapeHtml(week.body)}</p></section>`).join('');
  const caution = plan.caution ? `<p class="check-caution">${escapeHtml(plan.caution)}</p>` : '';
  const faith = plan.faithNote ? `<section class="check-week"><h3>If faith is part of it</h3><p>${escapeHtml(plan.faithNote)}</p></section>` : '';
  const companion = plan.companion ? trackMarkup(plan.companion, 'Also on the site') : '';
  let saveText = 'Saving your answers…';
  if (save === 'stored') saveText = 'Saved anonymously. No email was stored.';
  if (save === 'stored-email') saveText = 'We stored that email with these answers. Mail is not connected yet, so the plan was not sent. It is on this page.';
  if (save === 'failed') saveText = 'We could not save this check. Your plan is still here, and nothing was stored.';
  return `${progressMarkup(questions.length, questions.length, 'Your plan')}<div class="check-card"><h2 class="check-prompt" tabindex="-1">${escapeHtml(plan.title)}</h2><p class="check-lede">${escapeHtml(plan.lede)}</p><p class="check-hint">This is a sorting tool, not a diagnosis or medical advice. If you are in immediate danger, contact emergency services. If you are in a mental-health crisis, call or text 988.</p>${caution}<p class="check-save" data-save="${save}">${escapeHtml(saveText)}</p>${trackMarkup(plan.track, 'Recommended track')}<div class="check-weeks">${weeks}</div>${faith}${companion}<section class="check-week"><h3>The 30-day reset track</h3><p>The daily pages will live on the free 30-day reset. They are marked coming soon. The four weeks above are the plan until those pages open.</p><a class="btn-secondary" href="${plan.resetHref}">Open the 30-day reset</a></section><div class="check-actions"><button type="button" class="btn-secondary" data-action="restart">Start over</button></div></div>`;
}

function minorMarkup(): string {
  return `<div class="check-card"><h2 class="check-prompt" tabindex="-1">This check is for adults</h2><p>The Reset is for men 18 and older. We stopped here, and we did not save an answer.</p><p>If you are in trouble, talk to a parent or another trusted adult. If you are in immediate danger, contact emergency services. If you are in a mental-health crisis, call or text 988.</p><div class="check-actions"><button type="button" class="btn-secondary" data-action="back">Back</button><a class="btn-primary" href="/">Back to the homepage</a></div></div>`;
}

function render(root: HTMLElement, state: State) {
  if (state.phase === 'minor') root.innerHTML = minorMarkup();
  else if (state.phase === 'consent') root.innerHTML = consentMarkup(state);
  else if (state.phase === 'result' && state.plan) root.innerHTML = resultMarkup(state.plan, state.save);
  else root.innerHTML = questionMarkup(state);

  if (!state.moveFocus) return;
  const prompt = root.querySelector<HTMLElement>('.check-prompt');
  prompt?.focus();
}

async function saveAnswers(answers: CheckAnswers, email: string | null): Promise<'stored' | 'stored-email' | 'failed'> {
  try {
    const response = await fetch('/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...answers, email }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return 'failed';
    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null || !('ok' in payload) || payload.ok !== true) return 'failed';
    return email ? 'stored-email' : 'stored';
  } catch {
    return 'failed';
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
    save: 'idle',
    plan: null,
    moveFocus: false,
  };

  const paint = () => render(root, state);

  root.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
    event.preventDefault();

    if (form.dataset.consent === '') {
      const emailInput = form.querySelector<HTMLInputElement>('#check-email');
      const raw = emailInput?.value ?? '';
      const email = normalizeEmail(raw);
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
      state.save = 'saving';
      state.moveFocus = true;
      paint();
      const plan = state.plan;
      void saveAnswers(state.answers, email).then((save) => {
        if (state.plan !== plan) return;
        state.save = save;
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
    if (question.id === 'age' && selected === 'under-18') {
      state.phase = 'minor';
      paint();
      return;
    }
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
      if (state.phase === 'minor') {
        state.phase = 'question';
        state.step = 0;
        paint();
        return;
      }
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
      state.save = 'idle';
      state.plan = null;
      paint();
    }
  });

  paint();
}
