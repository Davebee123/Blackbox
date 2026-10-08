// Guided practice on an isolated training virus. Never touches the real save.
import { fresh, command, selectEncounter, advance, active, part, cycleLength } from './combat.mjs';
import { CONFIG } from './data.mjs';

export const LESSONS = [
  {
    title: 'Break a ◆',
    command: 'bash encryptor',
    explain: 'Each part wears armor (◆). A hit on armor does no damage, however big: it breaks one ◆. Encryptor has two. Each row also shows when that part attacks. Bash is a Breaker\'s plain hit, on key 1. Type bash encryptor.',
    result: 'One ◆ broke and the Encryptor took no damage. Small hits are how you strip armor; save your big ones for parts with no armor left.',
  },
  {
    title: 'Crack the armor',
    command: 'crack encryptor',
    explain: 'Crack breaks every ◆ left on a part at once. A part with no armor takes full hits, but it patches a ◆ back five cycles later unless you break it first: watch for ◆ patch on its row. Type crack encryptor.',
    result: 'Encryptor\'s armor is broken: its row shows the cracks. The patch marker on its row is your deadline.',
  },
  {
    title: 'Break a part',
    command: 'overload encryptor',
    explain: 'Breaking a part stops its attack for good. Its armor is gone, so Overload lands in full. Type overload encryptor.',
    result: 'Encryptor broke before it could patch: Encrypt is gone from its row and you recovered its loot. Plan each part as strip, then finish, before its attack lands.',
  },
  {
    title: 'Finish it',
    command: 'bash pulse',
    live: true,
    explain: 'Type bash pulse, then type nothing. If you don\'t type anything, your last attack repeats every cycle: the first Bash breaks its ◆, the next ones land. Type hold if you ever want to do nothing.',
    result: '',
  },
];

export function beginTutorial(settings) {
  const s = fresh();
  s.hackers = { breaker: { level: 25, xp: 0 } }; // parked lessons use the full Breaker kit
  s.settings = structuredClone(settings);
  selectEncounter(s, 'cryptjack', 3);
  const v = s.encounter.virus;
  v.name = 'TRAINING VIRUS';
  v.mutation = null;
  Object.assign(part(s, 'pulse'), { integrity: 40, max: 40, armor: 1, maxArmor: 1 });
  Object.assign(part(s, 'encryptor'), { integrity: 38, max: 38, armor: 2, maxArmor: 2 });
  part(s, 'pulse').attack.amount = 4;
  part(s, 'encryptor').attack.due = 99;
  command(s, 'engage');
  s.encounter.paused = true;
  return { state: s, index: 0, phase: 'ready', result: '', error: '' };
}

export function currentLesson(t) {
  return LESSONS[t.index];
}

export function submitTutorial(t, input) {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  t.error = '';
  const lesson = LESSONS[t.index];
  if (t.phase === 'live') return command(t.state, text);
  if (t.phase === 'review') { t.error = 'Read the result, then press Continue.'; return []; }
  if (t.phase === 'complete') { t.error = 'Practice complete. Head Home for a real fight, or replay.'; return []; }
  if (t.phase === 'running') return [];
  if (text !== lesson.command) { t.error = `For this lesson, type ${lesson.command}.`; return []; }
  t.state.encounter.paused = false;
  const events = command(t.state, text);
  if (!t.state.encounter.queue) { t.state.encounter.paused = true; t.error = events.at(-1)?.message || 'Try again.'; return events; }
  // Skip the wait: resolve at the end of a shortened cycle.
  t.state.encounter.elapsedMs = Math.max(t.state.encounter.elapsedMs, cycleLength(t.state) - 1200);
  t.phase = lesson.live ? 'live' : 'running';
  return events;
}

export function tickTutorial(t, delta) {
  const e = t.state.encounter;
  if (!['running', 'live'].includes(t.phase) || e.paused) return [];
  const before = e.cycle;
  const events = advance(t.state, delta);
  if (!active(t.state)) {
    t.phase = 'complete';
    t.result = t.state.encounter.phase === 'victory'
      ? 'Training virus neutralized. That is the whole loop: read each row, pick what to break, delay what you can\'t afford, trace when it\'s quiet. Your real server was never touched.'
      : 'The training server crashed. Replay to try again; your real server was never touched.';
  } else if (t.phase === 'running' && e.cycle !== before) {
    e.paused = true;
    t.phase = 'review';
    t.result = LESSONS[t.index].result;
  }
  return events;
}

export function continueTutorial(t) {
  if (t.phase !== 'review') return;
  t.index = Math.min(t.index + 1, LESSONS.length - 1);
  t.phase = 'ready';
  t.result = '';
  t.error = '';
  LESSONS[t.index].setup?.(t.state);
}
