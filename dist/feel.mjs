import { createSound } from './sound.mjs';
import { PICKED } from './abilitysound.mjs';
import { PICKED as THEIR_PICK } from './virussound.mjs';
import { createSoundtrack } from './soundtrack.mjs';
import { createPlaces } from './places.mjs';
import { glyph } from './glyphs.mjs';

// BLACKBOX feedback language. Every kind of event has ONE signature, made of
// up to three layers that say the same thing:
//   motion  (a flash or shake on the thing it happened to, plus a floating number)
//   sound   (opt-in, one voice per kind made of recorded samples; see sound.mjs)
//   touch   (vibration, on phones that support it: Android browsers)
// Effects are queued by react() and flushed after the screen re-renders, so
// they land on the fresh elements. beat(ms) sets when the next ones land: a cycle's damage numbers
// come one after another (dmgfx.mjs), each with its own flash, sound and number.

export const SIGNS = {
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
  // Something hit YOU (your server, or your Integrity on a run).
  hurt: { flash: 'fx-hurt', float: 'hot', edge: true, voice: 'hurt', buzz: 80 },
  // The Encryptor stacked more encryption on you.
  encrypt: { flash: 'fx-hurt', float: 'hot', edge: true, voice: 'encrypt', buzz: [30, 30, 60] },
  // Encryption ate some of you this cycle (softer than a hit: it happens every cycle).
  drain: { flash: 'fx-hurt', float: 'hot', voice: 'drain', buzz: 20 },
  // Your attack timers went dark.
  blind: { flash: 'fx-enrage', float: 'hot', voice: 'blind', buzz: [10, 20, 10, 20] },
  // A Mutex's lock took (some of) your hit: the lock's number, in steel, beside the damage that got through.
  absorb: { float: 'steel', voice: 'chit', buzz: 6 },
  // You broke an armor chit (no damage, but progress).
  chit: { flash: 'fx-hit', float: 'amber', voice: 'chit', buzz: 8 },
  // Your command's whole hit went into a ◆ (◆ ABSORBED): steel, what protects a part, never a miss's dim or a threat's red.
  absorbed: { flash: 'fx-hit', float: 'steel', voice: 'chit', buzz: 8 },
  // A part patched a chit back.
  patch: { flash: 'fx-enrage', float: 'hot', voice: 'patch', buzz: [10, 20] },
  // You pushed an attack back.
  interrupt: { flash: 'fx-shove', float: 'you', voice: 'interrupt', buzz: 15 },
  // The virus adapted after a break.
  escalate: { flash: 'fx-enrage', voice: 'escalate', buzz: [10, 30, 10] },
  // A boss crosses into its next act (actbreak.mjs): the break (sound.mjs actbreak), two knocks and a long one.
  act: { voice: 'actbreak', buzz: [40, 60, 40, 60, 160] },
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
  // A vault opened: the Dial (roomfx.mjs draws it on the map). detail.n: its files.
  vault: { voice: 'vault', buzz: [8, 160, 8, 160, 8, 220, 30] },
  // The other room verbs (roomfx.mjs draws them on the map): a cache, a bait cache, a rest, files into your pack, a vault
  // key won, a program built in a socket.
  cache: { voice: 'cache', buzz: [10, 60, 6, 60, 6] },
  bait: { voice: 'bait', buzz: [10, 120, 40, 40, 160] },
  rest: { voice: 'rest', buzz: [20, 700, 20] },
  files: { voice: 'files', buzz: [8, 140, 8] },
  key: { voice: 'key', buzz: [10, 780, 20] },
  socket: { voice: 'socket', buzz: [6, 300, 24] },
  // You pulled a file into your pack.
  pickup: { flash: 'fx-good', float: 'you', voice: 'pickup', buzz: 12 },
  // The fight is won.
  win: { flash: 'fx-win', voice: 'win', buzz: [30, 60, 90] },
  // A boss is down, or a server is yours.
  bosswin: { flash: 'fx-win', voice: 'bosswin', buzz: [30, 60, 90, 60, 140] },
  // A level gained (levelup-ui.mjs).
  levelup: { flash: 'fx-win', voice: 'levelup', buzz: [30, 60, 90] },
  // Crash or disconnect.
  lose: { flash: 'fx-hurt', edge: true, voice: 'lose', buzz: [250] },
  // A puzzle room's board (puzzle-view.mjs): a firewall going up, the worm copying into a node, a node discharging, a
  // ping going out, a dig, the Tracker's step, and a board lost (lighter than a disconnect).
  pzwall: { voice: 'firewall', buzz: 10 },
  pzspread: { voice: 'spread', buzz: [6, 20, 6] },
  pzzap: { voice: 'zap', buzz: 8 },
  pzping: { voice: 'ping', buzz: 6 },
  pzdig: { voice: 'dig', buzz: 14 },
  pzstep: { voice: 'step', buzz: 5 },
  pzfail: { voice: 'fizzle', buzz: [30, 40, 60] },
  // Cues (routines.mjs CUES): while your program plays, when to look back. Sound and touch only.
  cuetell: { voice: 'ping', buzz: [6, 30, 6] },
  cuelow: { voice: 'zap', buzz: [20, 40, 20] },
  cuedrop: { voice: 'unlock', buzz: 12 },
};

// Voices too faint to duck the place beds under (places.mjs) for.
const QUIET_VOICES = new Set(['cycle', 'channel']);

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createFeel({ settings, reducedMotion, queued = () => {} }) {
  let queue = [];
  let muting = false;
  let beatMs = 0;
  // Numbers rising off the same spot close together take turns: a lane each (motion), or a stacked list
  // (detail.stack: Effects minimal, Motion off), so separate hits never print over each other.
  const lanes = new Map();

  const sound = createSound();
  const track = createSoundtrack(() => sound.context());
  const places = createPlaces(() => sound.context(), { clip: (buf, gain) => sound.clip(buf, gain) });
  function voice(name, detail) {
    if (!settings().sound || !name) return;
    sound.play(name, detail);
    if (!QUIET_VOICES.has(name)) places.duck(); // the place beds dip under every game sound but the faint ones
  }

  function buzz(pattern) {
    if (!settings().haptics || !pattern || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch { /* not allowed yet */ }
  }

  // src (dmgfx.mjs): { kind, icon, label }: the number gets its kind's icon and colour, and says its source.
  // r: el's box, read before play() writes anything (a read after a write lays the screen out again).
  function float(r, text, color, size = 0, { src = null, spot = '', stack = false, x = 0 } = {}) {
    if (!r?.width || !text) return;
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

  // What the effects put on the page (flashes, numbers, the edge) goes up in one batch a frame, after the frame's layout
  // and before its paint (a ResizeObserver's turn): every box a number rises from is read there for free, the classes a
  // flash restarts come off (one style pass), then everything goes on. Each effect alone used to force a layout of the
  // screen (2–3 ms on a phone). What a timer or the tick writes shows no sooner than that frame's paint, and a delayed
  // effect's sound and buzz still go off on its timer.
  let later = [], asked = false;
  const afterLayout = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { afterLayout.disconnect(); showLater(); }) : null;
  function showLater() { asked = false; const items = later; later = []; show(items); }
  function showSoon(items) {
    if (!items.length) return;
    if (document.hidden) { show(items); return; } // no frames come while hidden
    later.push(...items);
    if (asked) return;
    asked = true;
    if (afterLayout) { afterLayout.observe(document.body); requestAnimationFrame(() => {}); } // a fresh observation reports at the next frame's layout
    else requestAnimationFrame(showLater);
  }
  function show(items) {
    const shake = !reducedMotion(), flashes = [];
    for (const it of items) {
      const { sign, target, label, detail } = it;
      const els = typeof target === 'string' ? [...document.querySelectorAll(target)] : target ? [target] : [];
      // detail.noFlash: the number only; detail.quiet: a smaller, dimmer number (a crewmate's).
      if (!detail?.noFlash && sign.flash) for (const el of els) flashes.push([el, shake || !sign.flash.match(/nope|hurt|strike/) ? sign.flash : 'fx-still']);
      // detail.silent: the look without the sound or buzz (a crewmate's hit when yours already sounds).
      // detail.softEdge: a fainter edge in place of the lash (a hit on you with Effects minimal, or Motion off).
      if ((sign.edge || detail?.softEdge) && !detail?.silent && !detail?.noEdge) { const el = document.getElementById('fx-edge'); if (el) flashes.push([el, 'on', !!detail?.softEdge]); }
      // detail.floatAt: where the number rises, if not off the flashing element (detail.x: how far across it, 0–1).
      it.fl = label ? (detail?.floatAt ? document.querySelector(detail.floatAt) || els[0] : els[0]) : null;
    }
    for (const it of items) if (it.fl) it.box = it.fl.getBoundingClientRect(); // reads first, before any write
    let off = null;
    for (const [el, cls] of flashes) if (el.classList.contains(cls)) { el.classList.remove(cls); off = el; }
    if (off) void getComputedStyle(off).animationName; // the style pass that lets a removed animation start over
    for (const [el, cls, soft] of flashes) {
      if (soft != null) el.classList.toggle('soft', soft);
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 900);
    }
    for (const { sign, target, label, detail, box } of items) if (label) float(box, label, (sign.float || 'amber') + (detail?.quiet ? ' quiet' : ''), detail?.size, { src: detail?.src, spot: detail?.floatAt || (typeof target === 'string' ? target : ''), stack: detail?.stack, x: detail?.x });
  }
  // shown: where its look goes (the flush's own batch); none: the next frame's.
  function play({ kind, target, label, detail, mute }, shown) {
    if (typeof kind === 'function') { try { kind(); } catch { /* an effect never breaks the game */ } return; }
    const sign = SIGNS[kind];
    if (!sign) return;
    const it = { sign, target, label, detail };
    if (shown) shown.push(it);
    else showSoon([it]);
    // mute: its ability's own sound plays in its voice's place (the flash and the buzz stay).
    if (!detail?.silent) { if (!mute) voice(sign.voice, detail); buzz(sign.buzz); }
  }

  return {
    // kind: a key of SIGNS; target: a CSS selector or element; label: floating text
    add(kind, target, label, detail) { queue.push({ kind, target, label, detail, at: beatMs, mute: muting }); queued(); }, // queued: the page's tick wakes to flush it
    pending: () => queue.length,
    // What is added next keeps its look and its buzz and loses its voice (its ability's own sound plays instead), until
    // this turn of the event loop is over.
    mute(on) { muting = !!on; if (on) queueMicrotask(() => { muting = false; }); },
    // An ability's own sound in a fight (abilitysound.mjs, the picked style), timed by its effect's plan, in delayMs.
    // False if Sound is off or it has none to play (say() its result's voice then).
    ability(key, plan, hit, delayMs = 0) { if (!settings().sound || !sound.ability(PICKED, key, plan, hit, delayMs / 1000)) return false; places.duck(); return true; },
    // A virus attack's own sound in a fight (virussound.mjs, the picked style), timed by its strike's plan (drawn: it
    // flies; else contact and tail), starting in delayMs. False if Sound is off or it has none to play.
    attack(key, plan, hit, drawn = true, delayMs = 0) { if (!settings().sound || !sound.attack(THEIR_PICK, key, plan, hit, drawn, delayMs / 1000)) return false; places.duck(); return true; },
    abilityOn: () => !!settings().sound,
    say(name, detail, delayMs = 0) { if (settings().sound && name) sound.play(name, detail || {}, delayMs / 1000); },
    // When what is added next lands, in ms after the flush (0: at once). react() sets it per event.
    beat(ms) { beatMs = Math.max(0, Math.round(ms) || 0); },
    // Play one voice now (or `delay` s from now), whatever the Sound setting (the System page's sound test).
    preview(name, opts, delay = 0) { sound.play(name, opts || (name === 'hit' ? { amount: 12 } : {}), delay); },
    // An ability's sound in a style, whatever the Sound setting (the ability effects playtest; abilitysound.mjs).
    abilityPreview(style, key, plan, hit) { return sound.ability(style, key, plan, hit); },
    // A virus attack's sound in a style, whatever the Sound setting (the same playtest; virussound.mjs).
    attackPreview(style, key, plan, hit, drawn) { return sound.attack(style, key, plan, hit, drawn); },
    // A key on the prompt or a button press (only with Sound on).
    key(kind) { if (settings().sound) sound.key(kind); },
    // A scene with its own mix (the cold open): { ctx, out } at the effects volume, or null with Sound off.
    scene() { return settings().sound ? sound.out() : null; },
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
    // Where you are (places.mjs placeOf): { on, bed, family }. The floor's or hub's bed, and a fight's family idle.
    places(opts) { places.set(opts); },
    // A virus family's one-shot ('attack' or 'break'), layered with the hurt or the break (only with Sound on).
    familyShot(family, kind) { if (settings().sound) places.shot(family, kind); },
    // What the place layer is playing, and the files it has asked for (the debug hook).
    placesNow() { return { ...places.playing(), loaded: places.loaded() }; },
    // Volume sliders: { music, ambience, places, sfx }, each 0–1.
    volumes(v) { sound.volumes({ sfx: v.sfx, ambience: v.ambience }); track.volumes({ music: v.music, ambience: v.ambience }); places.volumes({ places: v.places }); },
    flush() {
      const batch = queue, now = [];
      queue = [];
      for (const item of batch) {
        if (item.at > 0) setTimeout(() => play(item), item.at);
        else play(item, now);
      }
      showSoon(now);
    },
    canBuzz: () => typeof navigator !== 'undefined' && 'vibrate' in navigator,
  };
}
