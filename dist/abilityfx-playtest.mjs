// The ability effects playtest (?playtest=fx): a paused fight with a few parts, and a panel of buttons that fire every
// effect in abilityfx.mjs's table on a part, grouped by class and subclass, at each Screen effects level, with Motion on
// or off, as a plain hit, a crit or a hit on ◆, small or big, from its key in the tray (or, to preview the fallback, as
// if its key weren't on screen: from your bar). For reviewing the look without a real fight. Developer only: nothing here is saved (a playtest never is), and the panel sits beside
// the board, never on it. &cls= picks the class whose tray shows (its keys are where a key's effect starts; an ability
// that isn't on this tray starts from its first key instead, and the panel says so). &crew=<class> adds a crewmate, and
// the panel can fire as them: from their bar in the crew window, in their violet.

import { RECIPES } from './abilityfx.mjs';
import { SPIKE, ABILITIES, ARCHETYPES, SUBS } from './data.mjs';
import { SFX } from './screenfx.mjs';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// The ability a row's key stands for (key 1's words are Spike; a tick is its burn's).
export const abilityOfKey = (key) => { const id = key.split(':')[0]; return Object.values(SPIKE).some((s) => s.word === id) ? 'spike' : ABILITIES[id] ? id : null; };
// Every row in groups: everyone's, then each class's core kit (its key 1 first) and each of its subclasses' lines.
export function groupsOf() {
  const seen = new Set(), groups = [];
  const add = (title, keys) => { const ks = keys.filter((k) => RECIPES[k]); ks.forEach((k) => seen.add(k)); if (ks.length) groups.push({ title, keys: ks }); };
  add('Everyone', ['spike', 'sigint', 'burn:tick']);
  for (const [cls, a] of Object.entries(ARCHETYPES)) {
    add(a.name, [SPIKE[cls].word, ...a.core.flatMap((id) => [id, id + ':tick'])]);
    for (const sub of Object.keys(a.subs)) add(`${a.name} · ${SUBS[sub]?.name || sub}`, (SUBS[sub]?.skills || []).map((x) => x.id || x).flatMap((id) => [id, id + ':tick']));
  }
  add('Other', Object.keys(RECIPES).filter((k) => !seen.has(k)));
  return groups;
}

// api: parts() → [{ id, name }]; level() / setLevel(level) (the Screen effects level: off, subtle, medium, bold);
// motion() / setMotion(on); mates() → crewmates' handles; fire(key, partId, { power, crit, result, hidden, who }) →
// 'fx' | 'stand-in' | 'plain' | 'none'
// (what played: 'stand-in' when a key's effect started from another key); plain(partId, { result }) the plain strike.
export function mountFxPlaytest(api) {
  const ui = { target: null, hit: 'hit', power: 0.3, key: 'shown', who: '', said: '' };
  const panel = document.createElement('aside');
  panel.id = 'fx-playtest';
  panel.setAttribute('aria-label', 'Ability effects playtest');
  document.body.appendChild(panel);
  const seg = (name, opts, on) => `<div class="fxp-row"><span class="fxp-k">${esc(name)}</span>${opts.map(([v, label]) => `<button type="button" data-fxp="${esc(name)}" data-v="${esc(v)}" class="${String(on) === String(v) ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;
  const groups = groupsOf();
  function draw() {
    const parts = api.parts();
    if (!parts.some((p) => p.id === ui.target)) ui.target = parts[0]?.id || null;
    panel.innerHTML = `<h2>Ability effects <small>?playtest=fx</small></h2>
      ${seg('Screen effects', SFX.levels.map((l) => [l, l]), api.level())}
      ${seg('Motion', [['on', 'on'], ['off', 'off']], api.motion() ? 'on' : 'off')}
      ${seg('Its key', [['shown', 'on screen'], ['hidden', 'not on screen (from your bar)']], ui.key)}
      ${(api.mates?.() || []).length ? seg('Fired by', [['', 'you'], ...api.mates().map((w) => [w, `${w} (crew)`])], ui.who) : ''}
      ${seg('Hit', [['hit', 'hit'], ['crit', 'crit'], ['chit', 'on ◆']], ui.hit)}
      ${seg('Size', [['0.15', 'small'], ['0.4', 'medium'], ['0.9', 'big']], ui.power)}
      ${seg('Part', parts.map((p) => [p.id, p.name]), ui.target)}
      <p class="fxp-said" role="status">${esc(ui.said)}</p>
      <button type="button" data-fire="*" class="all"><b>Play all</b><small>one after another</small></button>
      ${groups.map((g) => `<h3>${esc(g.title)}</h3><div class="fxp-fx">${g.keys.map((k) => `<button type="button" data-fire="${esc(k)}"><b>${esc(RECIPES[k].label)}</b><small>${RECIPES[k].on === 'you' ? 'your bar' : RECIPES[k].at === 'chip' ? 'its attack' : RECIPES[k].motion}</small></button>`).join('')}</div>`).join('')}
      <h3>Plain</h3><div class="fxp-fx"><button type="button" data-fire="" class="plain"><b>No recipe</b><small>the plain hit effect</small></button></div>`;
  }
  const say = (t) => { ui.said = t; const p = panel.querySelector('.fxp-said'); if (p) p.textContent = t; };
  function fire(key) {
    const o = { power: ui.power, crit: ui.hit === 'crit', result: ui.hit, hidden: ui.key === 'hidden', who: ui.who || null };
    if (!key) { api.plain(ui.target, o); return say('No recipe: the plain hit effect (hitfx.mjs).'); }
    const what = api.fire(key, ui.target, o), name = RECIPES[key].label;
    say(what === 'fx' ? `${name}: played.` : what === 'stand-in' ? `${name}: played, from the tray's first key (it isn't on this class's tray).` : what === 'plain' ? `${name}: no room here, the plain hit effect.` : `${name}: nothing at Screen effects ${api.level()}${api.motion() ? '' : ', Motion off'} (as in a fight).`);
  }
  let queue = 0;
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    e.stopPropagation();
    if (b.dataset.fxp) {
      const k = b.dataset.fxp, v = b.dataset.v;
      if (k === 'Screen effects') api.setLevel(v);
      else if (k === 'Motion') api.setMotion(v === 'on');
      else if (k === 'Its key') ui.key = v;
      else if (k === 'Fired by') ui.who = v;
      else if (k === 'Hit') ui.hit = v;
      else if (k === 'Size') ui.power = Number(v);
      else if (k === 'Part') ui.target = v;
      return draw();
    }
    if (b.dataset.fire === '*') {
      clearTimeout(queue);
      const keys = groups.flatMap((g) => g.keys);
      const next = (i) => { if (i >= keys.length) return; fire(keys[i]); queue = setTimeout(() => next(i + 1), 1400); };
      return next(0);
    }
    if (b.dataset.fire !== undefined) fire(b.dataset.fire);
  });
  // Keys typed here never reach the command line.
  panel.addEventListener('keydown', (e) => e.stopPropagation());
  draw();
  return { draw, fire };
}
