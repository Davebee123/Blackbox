// A transmission over the map (scenes.mjs), in the quest window's look (the Transmission, the designer's pick):
// Incoming, the contact's name, their portrait beside the conversation, your answers in teal, the choices numbered
// under it. Calm: only the lines of the newest exchange arrive (opacity, one after another), once; the portrait scans
// in on the first. Esc or × closes it.
import { esc } from './view.mjs';
import { portraitMarkup } from './portraits.mjs';
import { SCENES, sceneNow, choicesOf } from './scenes.mjs';

export function sceneMarkup(s) {
  const now = sceneNow(s);
  if (!now) return '';
  const def = SCENES[now.id];
  let k = 0;
  const lines = now.said.map((l) => {
    const fresh = l.step === now.step, i = fresh ? k++ : 0;
    return `<p class="qa-line${l.who === 'you' ? ' sc-you' : ''}${fresh ? ' sc-new' : ''}" style="--i:${i}">${l.who === 'you' ? '&gt; ' : ''}${esc(l.text)}</p>`;
  }).join('');
  const ch = choicesOf(s), n = ch.length;
  const choices = ch.map((c) => `<button type="button" class="btn th-choice" data-scene-pick="${c.n}"><kbd>${c.n}</kbd><span>${esc(c.label)}</span></button>`).join('');
  return `<section class="pz-card q-card sc-card${now.step ? '' : ' sc-first'}" id="sc-card" role="dialog" aria-label="${esc(def.who)}" style="--n:${k}">
    <header class="pz-head qa-head"><p class="pz-kick">Incoming · <span class="pz-at">encrypted · ${esc(def.from || '')}</span></p><h1><span>${esc(def.who)}</span></h1><button type="button" class="btn small pz-x" data-scene-skip title="Later (Esc)" aria-label="Later">×</button></header>
    <div class="q-talk">${portraitMarkup(def.who, def.icon || 'npc')}<div class="qa-lines sc-log">${lines}</div></div>
    <div class="th-choices sc-choices">${choices}</div><p class="sc-foot"><span>${n ? `1${n > 1 ? `–${n}` : ''} to answer` : ''}</span><span>Esc · later</span></p></section>`;
}
