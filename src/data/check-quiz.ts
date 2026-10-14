import { buildPhases } from './plan-days';

/** Self-check questions, allowlists, and the 30-day plan. Safe to import from the browser and from the Pages Function. */

export const CONSENT_LINE = 'Your answers are anonymous and help us improve the course. Email is optional.';

export const questions = [
  {
    id: 'age',
    prompt: 'How old are you?',
    hint: 'This check is for adults. If you are under 18, it stops here and nothing is saved.',
    options: [
      { value: 'under-18', label: 'Under 18' },
      { value: '18-24', label: '18–24' },
      { value: '25-34', label: '25–34' },
      { value: '35-44', label: '35–44' },
      { value: '45-54', label: '45–54' },
      { value: '55-plus', label: '55 or older' },
    ],
  },
  {
    id: 'region',
    prompt: 'Where do you live?',
    hint: 'A region is enough. We do not ask for a city or address.',
    options: [
      { value: 'us-canada', label: 'United States or Canada' },
      { value: 'uk-ireland', label: 'United Kingdom or Ireland' },
      { value: 'europe', label: 'Europe' },
      { value: 'africa', label: 'Africa' },
      { value: 'latin-america', label: 'Latin America' },
      { value: 'asia-pacific', label: 'Asia-Pacific' },
      { value: 'middle-east', label: 'Middle East' },
      { value: 'other', label: 'Somewhere else, or I’d rather not say' },
    ],
  },
  {
    id: 'struggle',
    prompt: 'What is the main thing you want to quit?',
    hint: 'Pick the one that is costing you the most right now.',
    options: [
      { value: 'porn', label: 'Porn' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'phone', label: 'The phone' },
      { value: 'alcohol', label: 'Alcohol' },
      { value: 'substances', label: 'Substances' },
      { value: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'duration',
    prompt: 'How long has this been going on?',
    options: [
      { value: 'weeks', label: 'A few weeks' },
      { value: 'months', label: 'A few months' },
      { value: 'years-1-3', label: '1–3 years' },
      { value: 'years-3-plus', label: 'More than 3 years' },
      { value: 'unsure', label: 'I’m not sure' },
    ],
  },
  {
    id: 'frequency',
    prompt: 'How often does it happen?',
    options: [
      { value: 'most-days', label: 'Most days' },
      { value: 'few-times-week', label: 'A few times a week' },
      { value: 'weekly', label: 'About once a week' },
      { value: 'less-than-weekly', label: 'Less than weekly' },
      { value: 'bursts', label: 'It comes in bursts' },
    ],
  },
  {
    id: 'trigger',
    prompt: 'What usually sets it off?',
    hint: 'Pick the main one. You can only choose one.',
    options: [
      { value: 'night', label: 'Late at night' },
      { value: 'boredom', label: 'Boredom' },
      { value: 'stress', label: 'Stress or shame' },
      { value: 'alone', label: 'Being alone' },
      { value: 'phone', label: 'The phone already in my hand' },
      { value: 'after-drinking', label: 'After drinking' },
      { value: 'unsure', label: 'I’m not sure' },
    ],
  },
  {
    id: 'faith',
    prompt: 'Is faith part of how you want to do this?',
    hint: 'Optional. Skip it if you would rather not say.',
    optional: true,
    options: [
      { value: 'christian', label: 'Yes. I’m a Christian' },
      { value: 'distant', label: 'I grew up with faith. It feels distant' },
      { value: 'other-faith', label: 'Another faith' },
      { value: 'not-part', label: 'Faith is not part of this for me' },
      { value: 'prefer-not', label: 'I’d rather not say' },
    ],
  },
  {
    id: 'want',
    prompt: 'What do you want most from the next 30 days?',
    options: [
      { value: 'freedom', label: 'Freedom' },
      { value: 'discipline', label: 'Discipline' },
      { value: 'purpose', label: 'Purpose' },
      { value: 'relationships', label: 'Better relationships' },
    ],
  },
  {
    id: 'source',
    prompt: 'How did you hear about Call to Reset?',
    options: [
      { value: 'friend', label: 'A friend' },
      { value: 'search', label: 'Search' },
      { value: 'social', label: 'Social media' },
      { value: 'church', label: 'A church or group' },
      { value: 'other', label: 'Somewhere else' },
    ],
  },
] as const;

export type QuestionId = (typeof questions)[number]['id'];

type OptionValue<Id extends QuestionId> = Extract<(typeof questions)[number], { id: Id }>['options'][number]['value'];

export type CheckAnswers = {
  [Id in QuestionId]: OptionValue<Id> | (Id extends 'faith' ? 'skipped' : never);
};

export type TrackLink = {
  id: string;
  title: string;
  href: string;
  status: 'available' | 'coming-soon';
  startHref: string | null;
};

export type Plan = {
  variant: string;
  track: TrackLink;
  resetHref: string;
  title: string;
  lede: string;
  caution: string | null;
  phases: import('./plan-days').PlanPhase[];
  faithNote: string | null;
  companion: TrackLink | null;
};

export type StoredCheck = {
  age_range: string;
  region: string;
  struggle: string;
  duration: string;
  frequency: string;
  trigger: string;
  faith: string | null;
  want: string;
  source: string;
  plan_variant: string;
  recommended_track: string;
  email: string | null;
};

export type ParseResult = { ok: true; row: StoredCheck } | { ok: false; error: 'invalid' | 'adults-only' };

const TRACKS: TrackLink[] = [
  {
    id: 'break-free-from-porn',
    title: 'Break Free',
    href: '/tracks/break-free-from-porn',
    status: 'available',
    startHref: '/tracks/break-free-from-porn/identity-and-a-clean-slate',
  },
  {
    id: 'quit-gaming-and-the-phone',
    title: 'Quit Gaming and the Phone',
    href: '/tracks/quit-gaming-and-the-phone',
    status: 'coming-soon',
    startHref: null,
  },
  {
    id: 'discipline-and-morning-routine',
    title: 'Discipline and a Morning Routine',
    href: '/tracks/discipline-and-morning-routine',
    status: 'coming-soon',
    startHref: null,
  },
  {
    id: 'new-identity-in-christ',
    title: 'New Identity in Christ',
    href: '/tracks/new-identity-in-christ',
    status: 'coming-soon',
    startHref: null,
  },
  {
    id: 'faith-grace-and-the-kingdom',
    title: 'Faith, Grace, and the Kingdom',
    href: '/tracks/faith-grace-and-the-kingdom',
    status: 'coming-soon',
    startHref: null,
  },
  {
    id: '30-day-reset',
    title: 'Free 30-Day Reset',
    href: '/tracks/30-day-reset',
    status: 'coming-soon',
    startHref: null,
  },
];

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function questionById(id: QuestionId) {
  return questions.find((question) => question.id === id);
}

export function trackById(id: string): TrackLink | undefined {
  return TRACKS.find((track) => track.id === id);
}

/** Empty string becomes null. Anything else must be a plain email address. */
export function normalizeEmail(value: unknown): string | null | 'invalid' {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const email = value.trim().toLowerCase();
  if (email.length === 0) return null;
  if (email.length > 254 || /[\s<>]/.test(email)) return 'invalid';
  if (!EMAIL_PATTERN.test(email)) return 'invalid';
  return email;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readField(body: Record<string, unknown>, key: string): unknown {
  if (!Object.hasOwn(body, key)) return undefined;
  // eslint-disable-next-line security/detect-object-injection -- key is a fixed field name from this module
  return body[key];
}

function choice(body: Record<string, unknown>, id: QuestionId): string | null {
  const value = readField(body, id);
  if (typeof value !== 'string') return null;
  const question = questionById(id);
  if (!question) return null;
  return question.options.some((option) => option.value === value) ? value : null;
}

function paceOf(duration: string, frequency: string): 'steady' | 'burst' | 'standard' {
  if (duration === 'years-3-plus' || frequency === 'most-days') return 'steady';
  if (frequency === 'bursts') return 'burst';
  return 'standard';
}

function recommendedTrackId(answers: CheckAnswers): string {
  switch (answers.struggle) {
    case 'porn':
      return 'break-free-from-porn';
    case 'gaming':
    case 'phone':
      return 'quit-gaming-and-the-phone';
    case 'alcohol':
      return 'discipline-and-morning-routine';
    case 'substances':
      return '30-day-reset';
    default:
      if (answers.want === 'purpose' && (answers.faith === 'christian' || answers.faith === 'distant')) return 'new-identity-in-christ';
      if (answers.want === 'discipline') return 'discipline-and-morning-routine';
      return '30-day-reset';
  }
}

function planTitle(struggle: CheckAnswers['struggle']): string {
  switch (struggle) {
    case 'porn':
      return '30-day porn reset';
    case 'gaming':
      return '30-day gaming reset';
    case 'phone':
      return '30-day phone reset';
    case 'alcohol':
      return '30-day drinking reset';
    case 'substances':
      return '30-day substance reset';
    default:
      return '30-day reset';
  }
}

function frequencyLine(frequency: CheckAnswers['frequency']): string {
  switch (frequency) {
    case 'most-days':
      return 'Because it happens most days, this plan is daily and short.';
    case 'few-times-week':
      return 'A few times a week still needs a default evening, or the empty night decides.';
    case 'weekly':
      return 'Once a week is still a pattern. Put the rule on that day before it arrives.';
    case 'less-than-weekly':
      return 'Less often can feel manageable until it is not. Keep the same rule in a quiet stretch.';
    default:
      return 'Bursts mean the danger is the first yes. The work is the first ten minutes, not a perfect month.';
  }
}

function durationLine(duration: CheckAnswers['duration']): string {
  switch (duration) {
    case 'weeks':
      return 'This is still early. One hard rule now is easier than a speech later.';
    case 'months':
      return 'A few months means the loop already has a shape. Interrupt the habit. Do not try to invent a new personality this week.';
    case 'years-1-3':
      return 'One to three years is long enough that willpower is a bad plan. Shrink the day.';
    case 'years-3-plus':
      return 'More than three years means the first week stays small on purpose. One rule, kept, beats a new life announced on Monday.';
    default:
      return 'If you cannot date when it started, begin from the last time, not from a biography.';
  }
}

function faithNote(faith: CheckAnswers['faith']): string | null {
  const verse = '1 Corinthians 10:13, King James Version: “There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.”';
  switch (faith) {
    case 'christian':
      return `You said faith is part of this. One verse, if you want it. ${verse} The way out in this plan is the rule you already wrote. Skip the verse if it does not help tonight.`;
    case 'distant':
      return `You said faith feels distant. You do not have to perform it. If one verse helps, use ${verse} If it does not help, leave it and keep the rule.`;
    case 'other-faith':
      return 'You named another faith. Use the practice you already trust for restraint. This plan will not replace it. The thirty days are the practical half.';
    default:
      return null;
  }
}

function companionFor(answers: CheckAnswers, primaryId: string): TrackLink | null {
  if (answers.faith !== 'christian' && answers.faith !== 'distant') return null;
  const id = primaryId === 'new-identity-in-christ' ? 'faith-grace-and-the-kingdom' : 'new-identity-in-christ';
  return trackById(id) ?? null;
}

export function buildPlan(answers: CheckAnswers): Plan {
  const pace = paceOf(answers.duration, answers.frequency);
  const track = trackById(recommendedTrackId(answers)) ?? TRACKS[TRACKS.length - 1];
  const title = planTitle(answers.struggle);
  const caution =
    answers.struggle === 'alcohol' || answers.struggle === 'substances'
      ? 'If this is hurting your health, or you get sick when you stop, talk to a doctor before you cut it off. This is a habit plan, not treatment.'
      : null;
  return {
    variant: `${answers.struggle}-${pace}`,
    track,
    resetHref: '/tracks/30-day-reset',
    title,
    lede: `This is your ${title}. ${frequencyLine(answers.frequency)} ${durationLine(answers.duration)} Open ${track.title} next.`,
    caution,
    phases: buildPhases(answers),
    faithNote: faithNote(answers.faith),
    companion: companionFor(answers, track.id),
  };
}

export function parseSubmission(input: unknown): ParseResult {
  if (!isRecord(input)) return { ok: false, error: 'invalid' };
  const age = choice(input, 'age');
  if (age === 'under-18') return { ok: false, error: 'adults-only' };
  const region = choice(input, 'region');
  const struggle = choice(input, 'struggle');
  const duration = choice(input, 'duration');
  const frequency = choice(input, 'frequency');
  const trigger = choice(input, 'trigger');
  const want = choice(input, 'want');
  const source = choice(input, 'source');
  const faithField = readField(input, 'faith');
  const faith = faithField == null || faithField === '' || faithField === 'skipped' ? 'skipped' : choice(input, 'faith');
  if (!age || !region || !struggle || !duration || !frequency || !trigger || !want || !source || !faith) {
    return { ok: false, error: 'invalid' };
  }
  const email = normalizeEmail(readField(input, 'email'));
  if (email === 'invalid') return { ok: false, error: 'invalid' };

  const answers = { age, region, struggle, duration, frequency, trigger, faith, want, source } as CheckAnswers;
  const plan = buildPlan(answers);
  return {
    ok: true,
    row: {
      age_range: age,
      region,
      struggle,
      duration,
      frequency,
      trigger,
      faith: faith === 'skipped' ? null : faith,
      want,
      source,
      plan_variant: plan.variant,
      recommended_track: plan.track.id,
      email,
    },
  };
}
