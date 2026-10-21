// A sprite for each daemon, drawn from its id (the Loadout's Daemons tab, daemons-view.mjs). Like the class emblems
// (class-emblems.mjs): six rows of eleven columns that mirror about the middle column (/ to \, ( to ), d to b…). The
// left half and the middle come from a generator seeded by the id, so a daemon always looks the same; the kit leans on
// what it does (claws for a hitter, plating for a shield, crosses for a healer). A second frame closes the eyes, for a
// blink (CSS, stopped by reduced motion and Motion off), and an unfound daemon is its silhouette in solid blocks.
// Pure: no DOM. Tested in daemon-sprites.test.mjs.
import { DAEMONS } from './data.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// What a daemon does, in a word, read off its rule: picks the sprite's kit and the word on its row.
export function roleOf(id) {
  const r = DAEMONS[id].rule;
  if (/Delays|waits|Pushes|takes 1 cycle longer/.test(r)) return 'delay';
  if (/◆/.test(r)) return 'armor';
  if (/[Bb]urn/.test(r)) return 'burn';
  if (/[Ss]hields you/.test(r) && !/Deals|Heals/.test(r)) return 'guard';
  if (/[Hh]eals you|leaves you at 1/.test(r) && !/^Deals/.test(r)) return 'mend';
  if (/every (?:other )?part|every fragment/.test(r)) return 'area';
  return 'strike';
}
export const ROLE_WORD = { strike: 'hits', area: 'hits all', guard: 'shields', mend: 'heals', delay: 'delays', armor: 'breaks ◆', burn: 'burns' };

// A number that stays the same for a string (FNV-1a), and a small seeded generator (mulberry32).
export function hash(str) { let h = 0x811c9dc5; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const MIRROR = { '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{', d: 'b', b: 'd', p: 'q', q: 'p' };
const flip = (half) => [...half].reverse().map((c) => MIRROR[c] || c).join('');
const KIT = {
  strike: { arm: ['<', '/', 'Y', '\\'], mark: ['x', 'v', 'A', ':'], frame: ['<', '(', '/', '['], edge: ['-', '^', '-'] },
  area: { arm: ['~', '=', '{', '<'], mark: ['~', '*', 'o', '@'], frame: ['{', '(', '<'], edge: ['~', '-', '='] },
  guard: { arm: ['[', '#', '|', '{'], mark: ['#', '=', 'H', 'O'], frame: ['[', '|', '['], edge: ['=', '#', '_'] },
  mend: { arm: ['+', '(', 'o', '/'], mark: ['+', 'o', '+', '.'], frame: ['(', '{', '('], edge: ['-', '~', '_'] },
  delay: { arm: ['=', '-', '|', '<'], mark: ['z', '=', '8', 'Z'], frame: ['|', '[', '('], edge: ['=', '-', '_'] },
  armor: { arm: ['%', '>', '<', '/'], mark: ['%', 'V', '#', 'X'], frame: ['[', '<', '/'], edge: ['#', '=', '^'] },
  burn: { arm: ['*', '^', '~', '('], mark: ['*', '^', 'w', '&'], frame: ['(', '{', '/'], edge: ['^', '~', '-'] },
};
const EYES = ['o', 'O', '0', '@', '*', '.', '^', 'd', 'q', '<', '"', 'e', 'u'];
const MOUTH = ['w', 'v', '-', '~', 'o', '_', '=', 'm', 'A', '#', 'W', '^'];
export const SPRITE_W = 11, SPRITE_H = 6;

const SPRITES = new Map();
// { lines, blink, ghost, delay }: the open frame, the shut one, the silhouette, and when in the 7s loop it blinks.
export function sprite(id) {
  if (SPRITES.has(id)) return SPRITES.get(id);
  const r = rng(hash(id + ':daemon')), pick = (a) => a[Math.floor(r() * a.length)], kit = KIT[roleOf(id)];
  const W = 5, sp = (n) => ' '.repeat(Math.max(0, n));
  const headW = 2 + Math.floor(r() * 3); // the head's half width inside its frame: 2–4
  const bodyW = 1 + Math.floor(r() * 3); // 1–3
  const cyclops = r() < 0.18;
  const eye = pick(EYES), corner = pick(['.', ',', '/', '_', '.']), edge = pick(kit.edge), frame = pick(kit.frame);
  const rows = [];
  // antennae: none, a pair, or one in the middle
  const ant = r();
  if (ant < 0.3) rows.push([sp(W), ' ']);
  else if (ant < 0.7) { const c = pick(['\\', '|', "'", '.', 'Y', '\\', '(']), at = W - headW + Math.floor(r() * 2); rows.push([sp(at) + c + sp(W - at - 1), ' ']); }
  else rows.push([sp(W), pick(['|', '^', 'i', '!', 'Y', '*', 'o', '?'])]);
  // the top of the head
  rows.push([sp(W - headW - 1) + corner + edge.repeat(headW), pick([edge, edge, 'v', '^', '-'])]);
  // eyes
  const ep = headW - 1 - Math.floor(r() * Math.min(2, headW - 1));
  const inner = (c) => sp(ep) + c + sp(headW - ep - 1);
  rows.push(cyclops ? [sp(W - headW - 1) + frame + sp(headW), eye] : [sp(W - headW - 1) + frame + inner(eye), ' ']);
  const shut = cyclops ? [sp(W - headW - 1) + frame + sp(headW), '-'] : [sp(W - headW - 1) + frame + inner('-'), ' '];
  // the jaw and its mouth
  const jaw = pick(["'", '\\', frame, "'"]), fill = pick(['-', '_', '-', '_', '=', ' ']);
  rows.push([sp(W - headW - 1) + jaw + fill.repeat(headW), pick(MOUTH)]);
  // the body, arms out
  const arm = pick(kit.arm), bfill = pick([' ', ':', '|', '.', ' ']);
  rows.push([sp(W - bodyW - 1) + arm + (bfill === '|' ? '|' + sp(bodyW - 1) : bfill.repeat(bodyW)), pick(kit.mark)]);
  // legs, a tail or wheels
  const legX = Math.floor(r() * 3), leg = pick(['/', '|', '(', 'J', 'd', "'", '^', '/', '_']);
  rows.push([sp(W - legX - 1) + leg + sp(legX), pick([' ', ' ', '|', '_', 'v'])]);
  const lines = rows.map(([h, c]) => h + c + flip(h));
  const blink = lines.map((l, i) => (i === 2 ? shut[0] + shut[1] + flip(shut[0]) : l));
  const ghost = lines.map((l) => { const a = l.search(/\S/), b = l.length - [...l].reverse().join('').search(/\S/); return a < 0 ? l : sp(a) + '█'.repeat(b - a) + sp(l.length - b); });
  const out = { lines, blink, ghost, delay: (hash(id) % 70) / 10 };
  SPRITES.set(id, out);
  return out;
}

// The sprite as HTML: the two frames stacked (the second one blinks), or an unfound daemon's silhouette. size: the
// font size in px (the sprite is 11 columns by 6 rows of it). Decoration only: the name is always beside it.
export function spriteHtml(id, { found = true, size = 6.5, cls = '' } = {}) {
  const s = sprite(id), k = cls ? ` ${cls}` : '';
  if (!found) return `<span class="spr ghost${k}" style="--spr:${size}px" aria-hidden="true"><pre>${esc(s.ghost.join('\n'))}</pre></span>`;
  return `<span class="spr${k}" style="--spr:${size}px;--blink-at:-${s.delay}s" aria-hidden="true"><pre class="spr-a">${esc(s.lines.join('\n'))}</pre><pre class="spr-b">${esc(s.blink.join('\n'))}</pre></span>`;
}
