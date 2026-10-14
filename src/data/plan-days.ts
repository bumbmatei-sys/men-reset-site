import type { CheckAnswers } from './check-quiz';

export type PlanDay = { day: number; action: string };
export type PlanPhase = { title: string; days: PlanDay[] };

type Struggle = CheckAnswers['struggle'];

function habit(struggle: Struggle): string {
  switch (struggle) {
    case 'porn':
      return 'porn';
    case 'gaming':
      return 'the game';
    case 'phone':
      return 'the phone';
    case 'alcohol':
      return 'drinking';
    case 'substances':
      return 'the substance';
    default:
      return 'the habit';
  }
}

function openers(struggle: Struggle): string[] {
  const name = habit(struggle);
  switch (struggle) {
    case 'porn':
      return [
        'Delete the shortcut you actually use, and charge the phone outside the room you sleep in.',
        'Turn off private browsing on the device you use at night.',
        'Log out of the account that feeds it. Do not keep a “just in case” tab.',
        'Move the charger to another room before you are tired.',
        'Write the hour you are most likely to open it, and put that note where you will see it first.',
        'Shut the computer down when the work is done, and leave that room.',
        'Tell one sentence of the truth on paper: when it happened last, and what was in your hand.',
      ];
    case 'gaming':
      return [
        'Log out of the game that takes the night, and uninstall it from the phone.',
        'Write the time you will stop, before you sit down.',
        'Unplug or sign out of the console when that time hits. Do not “finish the round.”',
        'Put the controller where you have to stand up to reach it.',
        'Tell one person the stop time, even in a short text.',
        'Replace the first ten minutes after logout with a walk, a shower, or food.',
        'If you play, play only after the one task you said the day was for.',
      ];
    case 'phone':
      return [
        'Take the apps you open without deciding off the first screen.',
        'After the hour you usually get stuck, turn the screen grayscale.',
        'Charge the phone outside the bedroom tonight.',
        'Delete one app you open when you are bored, not when you need it.',
        'Leave the phone in another room for the first thirty minutes after you wake.',
        'Turn off the badges that pull you back in.',
        'Write the hour the scroll usually starts, and set an alarm ten minutes before it.',
      ];
    case 'alcohol':
      return [
        'Write the number while you are sober: zero drinks, or a stop after a number you pick now.',
        'Do not keep the usual drink in the place you sit at night.',
        'On the night you usually drink, drink water first and leave the room you pour in.',
        'Tell one person the number you wrote.',
        'If a social plan includes drinks, decide the exit before you arrive.',
        'Replace the first pour with a walk or food. Do not negotiate after the first one.',
        'Note the hour and the feeling the last time you drank more than you meant to.',
      ];
    case 'substances':
      return [
        `Name ${name} in one plain sentence, and put that sentence where you will see it today.`,
        'Remove the easy stash from the place you use it. Do not leave “a little” nearby.',
        'Tell one person you are doing thirty days. One sentence is enough.',
        'Write the hour it usually starts, and be somewhere else ten minutes before that hour.',
        'If stopping makes you sick, talk to a doctor before you cut it off. This page is a habit plan, not treatment.',
        'Replace the first urge with water, food, and a change of room.',
        'Do not buy more today. The decision is the errand, not the night.',
      ];
    default:
      return [
        `Name ${name} in one sentence, then remove one easy way you start it.`,
        'Write what you did the last time, not what you wish you had done.',
        'Put the thing you use to start it out of reach before evening.',
        'Pick a stop time and write it down before the day gets loud.',
        'Tell one person the name of the habit. You do not need the whole story.',
        'When the urge shows up, leave the room before you argue with it.',
        'Do the same small rule on an easy day, not only on a hard one.',
      ];
  }
}

function hourDays(trigger: CheckAnswers['trigger'], name: string): string[] {
  switch (trigger) {
    case 'night':
      return [
        'Pick a lights-out time you can keep on a tired night, and set it.',
        'The phone charges outside the bedroom. If you are still awake, you do not bring it back in.',
        `When the late hour hits, leave the room you usually start ${name}.`,
        'Dim the lights at the time you wrote, even if you are not sleepy yet.',
        'If you cannot sleep, sit somewhere else. Do not reopen the old habit to pass the time.',
        'Write tomorrow’s first task before you lie down.',
        'Keep the same lights-out time, including Friday.',
      ];
    case 'boredom':
      return [
        'Write five things that take twenty minutes and do not use the old habit.',
        'When the flat feeling shows up, do the next thing on that list before you negotiate.',
        'Start one of those things before you sit down with nothing in your hands.',
        'Put the list where the boredom usually finds you.',
        'Do a chore you have been avoiding for twenty minutes. Then stop. The point is the gap.',
        'Call or text someone during the empty hour, even if the message is short.',
        'Notice the hour boredom hits, and be already moving ten minutes before it.',
      ];
    case 'stress':
      return [
        'Before the old move, take a ten-minute walk or put your hands under cold water.',
        'The point is a gap, not a better mood. Then keep yesterday’s rule.',
        'Write the stress in one sentence. Do not solve it tonight.',
        'Do not use the habit as the reward for a hard day.',
        'Eat something before you decide you “deserve” the old relief.',
        'Tell one person it was a hard day. You do not have to explain the habit.',
        'End the day with the same small shutdown: water, lights, phone out of the room.',
      ];
    case 'alone':
      return [
        'Before you are deep in it, send one plain text: “Long night, staying with the plan.”',
        'Do not wait until you feel like talking. Send it at the hour you wrote.',
        'Be around one other person today, even for an errand.',
        'Leave the door open, or sit in a room that is not the one you hide in.',
        'If nobody is available, write the text anyway and send it in the morning.',
        'Plan tomorrow’s one contact before you are alone tonight.',
        'Alone is a cue, not a verdict. Change rooms when it shows up.',
      ];
    case 'phone':
      return [
        'Keep the home screen free of the apps that lead to the habit.',
        'Grayscale after the hour you usually slip.',
        'The device does not go to bed with you.',
        'When the phone is already in your hand, put it down and stand up before you open anything.',
        'Turn off the one notification that pulls you back.',
        'Leave the phone in another room for one meal.',
        'If you need it for work, use it standing up, then put it back.',
      ];
    case 'after-drinking':
      return [
        'On the nights you used to drink, the plan is no drink, or the stop you wrote while sober.',
        'Do not decide again once you have started.',
        'Eat before the hour you usually pour.',
        'Leave the place you drink before the second round.',
        'Tell the person you are with the stop, before the first one.',
        'If you already drank, do not add the other habit on top. Go home.',
        'Write tomorrow’s rule before you sleep, in one sentence.',
      ];
    default:
      return [
        `For seven days, write the last time ${name} happened: the hour, the place, and what was in your hand.`,
        'Keep the day-1 rule while you learn the pattern.',
        'Circle the hour that shows up more than once.',
        'Be out of that place ten minutes before the hour you circled.',
        'Do not add a new rule today. Keep the one you already wrote.',
        'If you still cannot name the trigger, write the feeling instead.',
        'Read the notes back. The pattern is the plan.',
      ];
  }
}

function buildDays(want: CheckAnswers['want'], name: string): string[] {
  switch (want) {
    case 'freedom':
      return [
        'Each morning, write one sentence: what today is for if you do not lose the night.',
        'Do the first physical step of that sentence before you open a feed.',
        'Freedom here is a smaller day you can live, not a speech.',
        'Protect one hour that is yours. Put it on paper.',
        'When the habit offers relief, do the sentence’s next step instead.',
        'Tell someone what today was for, after you did the first step.',
        'Keep the sentence short enough to remember without a notebook.',
      ];
    case 'discipline':
      return [
        'Wake, drink water, and spend ten minutes on the same task before the phone.',
        'Same order on the days you feel flat.',
        'Discipline is the morning, not a speech at midnight.',
        'Lay out the first task tonight so you do not decide it tomorrow.',
        'Stop the ten minutes when the timer ends. The win is that you started.',
        'Do not check the phone until the ten minutes are done.',
        'Write the order on a card you can see from the bed.',
      ];
    case 'purpose':
      return [
        'Write who you are trying to be in one sentence you would not be ashamed to show a friend.',
        'Do one piece of work that matches that sentence, even if it is small.',
        'Put the sentence where you will see it before the hard hour.',
        'Say no to one thing that does not match it.',
        'Spend twenty minutes on the work before the evening starts.',
        'Tell one person the sentence.',
        'Do the same piece of work again tomorrow. Initiative is a repeat.',
      ];
    default:
      return [
        'Pick one person. Tell them the truth at the size you can manage, or keep one plan you already made.',
        'A relationship does not repair itself while the nights stay secret.',
        'Send a plain message today. No speech.',
        'Show up for one ordinary thing with another person.',
        'Do not use the habit to avoid a conversation you already owe.',
        'Write what you will say if they ask how you are. One honest sentence.',
        'Keep the appointment even if you feel flat.',
      ];
  }
}

function closeDays(name: string): string[] {
  return [
    'Choose one person who is allowed to know. If you do not have them yet, write the name you will ask.',
    `Write the rule for the day after a slip: no disappearing, and back to the day-1 rule the same day.`,
    `A slip with ${name} is a day. It does not get the rest of the month.`,
    'Tell that person the rule, in one message.',
    'Practice the day-1 move once today, even if you do not feel the urge.',
    'If you slip, write the hour and the cue before you go to sleep. Then stop.',
    'Do not add a second session to make the failure “worth it.”',
    'Review the thirty days in five lines: what you cut, what hour was hard, who knows.',
    'Pick the one rule you will keep after day 30. Write it where you will see it tomorrow.',
  ];
}

function phase(title: string, start: number, actions: string[]): PlanPhase {
  return {
    title,
    days: actions.map((action, index) => ({ day: start + index, action })),
  };
}

const PHASE_PLAN = [
  { title: 'Cut the easy path', start: 1, from: 0, to: 7 },
  { title: 'Meet the hour it happens', start: 8, from: 7, to: 14 },
  { title: 'Build a day you can repeat', start: 15, from: 14, to: 21 },
  { title: 'One person, and the day after', start: 22, from: 21, to: 30 },
] as const;

export const PHASE_INTRO = `Thirty days in four phases. ${PHASE_PLAN.map((item) => item.title).join('. ')}.`;

export function buildPhases(answers: CheckAnswers): PlanPhase[] {
  const name = habit(answers.struggle);
  const days = [...openers(answers.struggle), ...hourDays(answers.trigger, name), ...buildDays(answers.want, name), ...closeDays(name)];
  if (days.length !== 30) throw new Error(`expected 30 days, got ${days.length}`);
  return PHASE_PLAN.map((item) => phase(item.title, item.start, days.slice(item.from, item.to)));
}
