import { createSound } from './sound.mjs';
import { createSoundtrack } from './soundtrack.mjs';
import { glyph } from './glyphs.mjs';

// BLACKBOX feedback language. Every kind of event has ONE signature, made of
// up to three layers that say the same thing:
//   motion  (a flash or shake on the thing it happened to, plus a floating number)
//   sound   (opt-in, one voice per kind made of recorded samples; see sound.mjs)
//   touch   (vibration, on phones that support it: Android browsers)
// Effects are queued by react() and flushed after the screen re-renders, so
// they land on the fresh elements. beat(ms) sets when the next ones land: a cycle's damage numbers
// come one after another (dmgfx.mjs), each with its own flash, sound and number.

const SIGNS = {
  // You put something on a part: a mark (Exposed, Tagged, Hooked, Throttled, Quarantined), a burn, a helper.
  mark: { flash: 'fx-mark', float: 'mark', voice: 'mark', buzz: [6, 20, 6] },
  burn: { flash: 'fx-burn', float: 'burn', voice: 'burn', buzz: 10 },
  helper: { flash: 'fx-daemon', float: 'helper', voice: 'helper', buzz: [5, 15, 5] },
  // Something on you: a shield, or a buff.
  shield: { flash: 'fx-good', float: 'you', voice: 'shield', buzz: 12 },
  buff: { flash: 'fx-good', float: 'you', voice: 'buff', buzz: 8 },
  // A virus part attacks: its row lunges (the hit on you has its own sound).
  strike: { flash: 'fx-strike', float: 'atk' },
  // You damaged a part.
  hit: { flash: 'fx-hit', float: 'amber', voice: 'hit', buzz: 10 },
  // A conditional rule of your gear fired (Clock Skew's crit): its HUD chip flashes and its name floats. No sound of its own.
  gear: { flash: 'fx-gear', float: 'gear' },
  // You fired inside the Sync Window.
  sync: { flash: 'fx-sync', float: 'sync', voice: 'sync', buzz: [8, 18, 8] },
  surprise: { flash: 'fx-surprise', float: 'surprise', voice: 'sync', buzz: [8, 18, 8, 18, 8] },
  // A part broke.
  break: { flash: 'fx-break', float: 'bright', voice: 'break', buzz: [20, 40, 60] },
  // Your skill missed: the cooldown is gone and nothing happened.
  miss: { flash: 'fx-nope', float: 'dim', voice: 'miss', buzz: [6, 40, 6] },
  // An attack missed you.
  evade: { flash: 'fx-shove', float: 'you', voice: 'evade', buzz: 10 },
  // Your hit crit: bigger number, brighter hit.
  crit: { flash: 'fx-hit', float: 'crit', voice: 'crit', buzz: [15, 25, 45] },
  // An enemy crit you: heavier than a hurt.
  hurtcrit: { flash: 'fx-hurt', float: 'hot big', edge: true, voice: 'hurtcrit', buzz: [60, 40, 140] },
  // Something hit YOU (your server, or your Signal on a run).
  hurt: { flash: 'fx-hurt', float: 'hot', edge: true, voice: 'hurt', buzz: 80 },
  // The Encryptor stacked more encryption on you.
  encrypt: { flash: 'fx-hurt', float: 'hot', edge: true, voice: 'encrypt', buzz: [30, 30, 60] },
  // Encryption ate some of you this cycle (softer than a hit: it happens every cycle).
  drain: { flash: 'fx-hurt', float: 'hot', voice: 'drain', buzz: 20 },
  // Your attack timers went dark.
  blind: { flash: 'fx-enrage', float: 'hot', voice: 'blind', buzz: [10, 20, 10, 20] },
  // You broke an armor chit (no damage, but progress).
  chit: { flash: 'fx-hit', float: 'amber', voice: 'chit', buzz: 8 },
  // A part patched a chit back.
  patch: { flash: 'fx-enrage', float: 'hot', voice: 'patch', buzz: [10, 20] },
  // You pushed an attack back.
  interrupt: { flash: 'fx-shove', float: 'you', voice: 'interrupt', buzz: 15 },
  // The virus adapted after a break.
  escalate: { flash: 'fx-enrage', voice: 'escalate', buzz: [10, 30, 10] },
  // Your command was refused.
  nope: { flash: 'fx-nope', voice: 'nope', buzz: [8, 40, 8] },
  // Something lands at the end of this cycle and time is almost up.
  prewarn: { flash: 'fx-urgent', voice: 'prewarn', buzz: 25 },
  // You changed screens: a channel change (sound only).
  channel: { voice: 'channel' },
  // A cycle resolved: the timeline turns over (a faint tick you feel more than notice).
  cycle: { flash: 'fx-cycle', voice: 'cycle', buzz: 4 },
  // A siege or breach chipped your server between fights.
  chip: { flash: 'fx-still', float: 'hot', voice: 'drain', buzz: 8 },
  // You jacked in at your wall.
  jackin: { flash: 'fx-good', voice: 'jackin', buzz: [14, 30, 14] },
  // You connected to a server (the modem handshake) or hung up.
  hangup: { voice: 'hangup' },
  // The pager went off (new mail, an offer, a contract ready, the network). detail.alert: a breach.
  pager: { flash: 'fx-pager', voice: 'pager', buzz: [30, 60, 30] },
  // A daemon acted for you.
  daemon: { flash: 'fx-daemon', voice: 'daemon', buzz: 6 },
  // Good news: scan, trace, loot, lead, origin found.
  good: { flash: 'fx-good', float: 'you', voice: 'good', buzz: 12 },
  // A vault, a locked folder or an upgrade opened; loot recovered; encryption broken.
  unlock: { flash: 'fx-good', float: 'you', voice: 'unlock', buzz: [12, 30, 20] },
  // You pulled a file into your pack.
  pickup: { flash: 'fx-good', float: 'you', voice: 'pickup', buzz: 12 },
  // The fight is won.
  win: { flash: 'fx-win', voice: 'win', buzz: [30, 60, 90] },
  // Crash or disconnect.
  lose: { flash: 'fx-hurt', edge: true, voice: 'lose', buzz: [250] },
};

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createFeel({ settings, reducedMotion }) {
  let queue = [];
  let beatMs = 0;
  // Numbers rising off the same spot close together take turns: a lane each (motion), or a stacked list
  // (detail.stack: Effects minimal, Motion off), so separate hits never print over each other.
  const lanes = new Map();

  const sound = createSound();
  const track = createSoundtrack(() => sound.context());
  function voice(name, detail) {
    if (settings().sound && name) sound.play(name, detail);
  }

  function buzz(pattern) {
    if (!settings().haptics || !pattern || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch { /* not allowed yet */ }
  }

  function flash(el, cls) {
    if (!el || !cls) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 900);
  }

  // src (dmgfx.mjs): { kind, icon, label }: the number gets its kind's icon and colour, and says its source.
  function float(el, text, color, size = 0, { src = null, spot = '', stack = false, x = 0 } = {}) {
    if (!el || !text) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const f = document.createElement('div');
    const still = reducedMotion() || stack;
    f.className = `fx-float ${color}${src ? ` src k-${src.kind}` : ''}${still ? ' still' : ''}`;
    if (src) {
      f.innerHTML = `${glyph(src.icon, 'fx-ico')}<span>${esc(text)}</span>`;
      f.title = src.label;
      f.setAttribute('role', 'img');
      f.setAttribute('aria-label', src.label);
    } else f.textContent = text;
    if (size) f.style.setProperty('--size', size.toFixed(2));
    const now = performance.now(), was = spot && lanes.get(spot);
    const n = was && now - was.t < (stack ? 1000 : 700) ? was.n + 1 : 0;
    if (spot) lanes.set(spot, { t: now, n });
    const lane = stack ? 0 : [0, 1, -1][n % 3];
    f.style.setProperty('--dx', stack ? '0px' : `${Math.round((Math.random() - 0.5) * 14 + lane * 12)}px`);
    const word = !/\d/.test(text); // a word (BROKEN) sits mid-bar, clear of the number at its right end
    f.style.left = `${r.left + r.width * (x || (word ? 0.45 : 0.72)) + lane * 58}px`;
    f.style.top = `${r.top + r.height * 0.3 + (stack ? Math.min(n, 6) * 19 : 0)}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }

  function edge(soft) {
    const el = document.getElementById('fx-edge');
    if (!el) return;
    el.classList.toggle('soft', !!soft);
    flash(el, 'on');
  }

  function play({ kind, target, label, detail }) {
    if (typeof kind === 'function') { try { kind(); } catch { /* an effect never breaks the game */ } return; }
    const sign = SIGNS[kind];
    if (!sign) return;
    const els = typeof target === 'string' ? [...document.querySelectorAll(target)] : target ? [target] : [];
    const shake = !reducedMotion();
    // detail.noFlash: the number only; detail.quiet: a smaller, dimmer number (a crewmate's).
    if (!detail?.noFlash) for (const el of els) flash(el, shake || !sign.flash?.match(/nope|hurt|strike/) ? sign.flash : 'fx-still');
    // detail.floatAt: where the number rises, if not off the flashing element (detail.x: how far across it, 0–1).
    const fl = detail?.floatAt ? document.querySelector(detail.floatAt) || els[0] : els[0];
    if (label) float(fl, label, (sign.float || 'amber') + (detail?.quiet ? ' quiet' : ''), detail?.size, { src: detail?.src, spot: detail?.floatAt || (typeof target === 'string' ? target : ''), stack: detail?.stack, x: detail?.x });
    // detail.silent: the look without the sound or buzz (a crewmate's hit when yours already sounds).
    // detail.softEdge: a fainter edge in place of the lash (a hit on you with Effects minimal, or Motion off).
    if ((sign.edge || detail?.softEdge) && !detail?.silent && !detail?.noEdge) edge(detail?.softEdge);
    if (!detail?.silent) { voice(sign.voice, detail); buzz(sign.buzz); }
  }

  return {
    // kind: a key of SIGNS; target: a CSS selector or element; label: floating text
    add(kind, target, label, detail) { queue.push({ kind, target, label, detail, at: beatMs }); },
    // When what is added next lands, in ms after the flush (0: at once). react() sets it per event.
    beat(ms) { beatMs = Math.max(0, Math.round(ms) || 0); },
    // Play one voice now, whatever the Sound setting (the System page's sound test).
    preview(name) { sound.play(name, name === 'hit' ? { amount: 12 } : {}); },
    // A key on the prompt or a button press (only with Sound on).
    key(kind) { if (settings().sound) sound.key(kind); },
    // The room tone (CRT hum, fan) follows the Sound setting.
    ambience(on) { sound.ambience(on); },
    // Music and radio chatter: { on, music, radio, mood: 'home'|'run'|'fight' }.
    soundtrack(opts) { track.set(opts); },
    // One radio transmission now (the System page's test).
    radioTest() { track.test(); },
    // LANTERN read out a dead drop (only with Sound on).
    numbers() { if (settings().sound) track.numbers(); },
    // Weather outside the window: rain level and thunder (only with Sound on).
    rain(level) { track.rain(settings().sound ? level : 0); },
    thunder(delay) { if (settings().sound) track.thunder(delay); },
    street(on) { track.street(on); },
    // Volume sliders: { music, ambience, sfx }, each 0–1.
    volumes(v) { sound.volumes({ sfx: v.sfx, ambience: v.ambience }); track.volumes({ music: v.music, ambience: v.ambience }); },
    flush() {
      const batch = queue;
      queue = [];
      for (const item of batch) {
        if (item.at > 0) setTimeout(() => play(item), item.at);
        else play(item);
      }
    },
    canBuzz: () => typeof navigator !== 'undefined' && 'vibrate' in navigator,
  };
}
