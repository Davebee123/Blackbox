// Rule text with its key facts picked out: the numbers with what they count (30 damage, 1 cycle sooner, cycle 5, 25% more
// damage, ×3, up to 60), multipliers (double damage, twice, half), all its ◆, once per fight, critical strikes and
// the statuses a rule hands out (Exposed, Tagged, burns, shields). ruleHtml escapes the text and wraps each fact in
// <b class="hi">, which the page draws in --bright; the rest keeps its tone. For HTML only: a title="" tooltip is
// plain text and takes the rule as it is.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// What a number can count, read on from the number while the words keep coming: "1 cycle sooner",
// "20% more damage", "3% per rank", "2 more ◆", "16 damage every cycle".
const UNIT = String.raw`(?:\s(?:more|less|fewer|additional|extra|max|damage|cycles?|◆|Signal|Integrity|stacks?|hits?|helpers?|times|strikes?|ticks?|attacks?|Momentum|daemon slots?|or more|sooner|later|longer|shorter|crit(?:ical strike)? chance|per (?:rank|stack|tick|hit|cycle|helper|part|Momentum)|every cycle|a cycle|each cycle)(?![\w-]))*`;
// A number on its own: not part of a name (C2, SH1), not a level, rank, key or tier, not "1 of 3".
const NUM = String.raw`(?<![\w.×-])(?<!(?:[Ll]evel|[Ll]v|[Rr]ank|[Kk]ey|[Tt]ier|[Ss]lot|[Ff]loor) )(?<!\d of )[+−]?\d+(?:\.\d+)?%?(?![\w.]\d|\w)(?! of \d)`;
const FACTS = [
  String.raw`×\d+(?:\.\d+)?|\d+(?:\.\d+)?×`, // multipliers written as ×3
  String.raw`\bcycle \d+\b`, // a cycle named by its number (a part's rule: "Frozen until the end of cycle 5"), lit whole
  NUM + UNIT,
  String.raw`\b(?:[Dd]ouble|[Tt]riple|doubled|tripled|[Tt]wice|[Hh]alf|halves|halving|three times)\b${UNIT}`,
  String.raw`\ball (?:its |their |your )?◆`,
  String.raw`\b[Oo]nce (?:per|a) (?:fight|run)\b`,
  String.raw`\bcritical(?:ly)? strikes?\b|\bcritically strike\b`,
  // The statuses and marks a rule hands out, and the mechanics they belong to.
  String.raw`\b(?:Exposed|Exposing|Exposes|Tagged|Tags|Throttled|Throttles|Quarantined|Hooked|Hooks|Jammed|Jams|Poisoned|Corrupted|Scrambled|Spoofed|Momentum)\b(?! [A-Z])`,
  String.raw`\b(?:[Bb]urn(?:s|ing)?|[Ss]hield(?:s|ed)?)\b`,
];
const RE = new RegExp(FACTS.map((x) => `(?:${x})`).join('|'), 'g');

export function ruleHtml(text) {
  const raw = String(text ?? '');
  let out = '', at = 0;
  const seen = new Set();
  for (const m of raw.matchAll(RE)) {
    let i = m.index, j = i + m[0].length;
    if (j === i) continue;
    // A burn or a shield is lit where the rule first names it, not every time it comes up.
    const word = m[0].match(/^(?:[Bb]urn|[Ss]hield)/)?.[0].toLowerCase();
    if (word && seen.has(word)) continue;
    if (word) seen.add(word);
    // "up to 60": the lead-in joins the number that follows it.
    const lead = /^[+−\d]/.test(m[0]) && raw.slice(Math.max(at, i - 12), i).match(/(?:up to|at least|minimum) $/);
    if (lead) i -= lead[0].length;
    out += esc(raw.slice(at, i)) + `<b class="hi">${esc(raw.slice(i, j))}</b>`;
    at = j;
  }
  return out + esc(raw.slice(at));
}
