// The ability effects playtest (?playtest=fx): a paused fight with a few parts, and a panel of buttons that fire each
// effect in abilityfx.mjs's table on a part, at each Screen effects level, with Motion on or off, as a plain hit, a
// crit or a hit on ◆, small or big. For reviewing the look without a real fight. Developer only: nothing here is
// saved (a playtest never is), and the panel sits beside the board, never on it.

import { RECIPES } from './abilityfx.mjs';
import { SPIKE, ABILITIES, ARCHETYPES } from './data.mjs';
import { SFX } from './screenfx.mjs';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Who fires it: key 1 by the class whose word it is, the rest by their ability's class.
export function whoseOf(key) {
  const id = key.split(':')[0];
  const cls = Object.entries(SPIKE).find(([, v]) => v.word === id)?.[0] || ABILITIES[id]?.cls;
  return cls ? `${ARCHETYPES[cls]?.name || cls}${SPIKE[cls]?.word === id ? ' · key 1' : ''}` : '';
}

// api: parts() → [{ id, name }]; level() / setLevel(level) (the Screen effects level: off, subtle, medium, bold);
// motion() / setMotion(on); fire(key, partId, { power, crit, result }) → 'fx' | 'plain' | 'none' (what played);
// plain(partId, { result }) the plain hit effect.
export function mountFxPlaytest(api) {
  const ui = { target: null, hit: 'hit', power: 0.3, said: '' };
  const panel = document.createElement('aside');
  panel.id = 'fx-playtest';
  panel.setAttribute('aria-label', 'Ability effects playtest');
  document.body.appendChild(panel);
  const seg = (name, opts, on) => `<div class="fxp-row"><span class="fxp-k">${esc(name)}</span>${opts.map(([v, label]) => `<button type="button" data-fxp="${esc(name)}" data-v="${esc(v)}" class="${String(on) === String(v) ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;
  function draw() {
    const parts = api.parts();
    if (!parts.some((p) => p.id === ui.target)) ui.target = parts[0]?.id || null;
    panel.innerHTML = `<h2>Ability effects <small>?playtest=fx</small></h2>
      ${seg('Screen effects', SFX.levels.map((l) => [l, l]), api.level())}
      ${seg('Motion', [['on', 'on'], ['off', 'off']], api.motion() ? 'on' : 'off')}
      ${seg('Hit', [['hit', 'hit'], ['crit', 'crit'], ['chit', 'on ◆']], ui.hit)}
      ${seg('Size', [['0.15', 'small'], ['0.4', 'medium'], ['0.9', 'big']], ui.power)}
      ${seg('Part', parts.map((p) => [p.id, p.name]), ui.target)}
      <div class="fxp-fx">${Object.entries(RECIPES).map(([k, R]) => `<button type="button" data-fire="${esc(k)}"><b>${esc(R.label)}</b><small>${esc(whoseOf(k))}${R.on === 'you' ? ' · your side' : ''}</small></button>`).join('')}
        <button type="button" data-fire="" class="plain"><b>No recipe</b><small>the plain hit effect</small></button>
        <button type="button" data-fire="*" class="all"><b>Play all</b><small>one after another</small></button></div>
      <p class="fxp-said" role="status">${esc(ui.said)}</p>`;
  }
  const say = (t) => { ui.said = t; const p = panel.querySelector('.fxp-said'); if (p) p.textContent = t; };
  function fire(key) {
    const o = { power: ui.power, crit: ui.hit === 'crit', result: ui.hit };
    if (!key) { api.plain(ui.target, o); return say('No recipe: the plain hit effect (hitfx.mjs).'); }
    const what = api.fire(key, ui.target, o);
    say(what === 'fx' ? `${RECIPES[key].label}: played.` : what === 'plain' ? `${RECIPES[key].label}: no room here, the plain hit effect.` : `${RECIPES[key].label}: nothing at Screen effects ${api.level()}${api.motion() ? '' : ', Motion off'} (as in a fight).`);
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
      else if (k === 'Hit') ui.hit = v;
      else if (k === 'Size') ui.power = Number(v);
      else if (k === 'Part') ui.target = v;
      return draw();
    }
    if (b.dataset.fire === '*') {
      clearTimeout(queue);
      const keys = Object.keys(RECIPES);
      const next = (i) => { if (i >= keys.length) return; fire(keys[i]); queue = setTimeout(() => next(i + 1), Math.max(1200, RECIPES[keys[i]].dur + 400)); };
      return next(0);
    }
    if (b.dataset.fire !== undefined) fire(b.dataset.fire);
  });
  // Keys typed here never reach the command line.
  panel.addEventListener('keydown', (e) => e.stopPropagation());
  draw();
  return { draw, fire };
}
