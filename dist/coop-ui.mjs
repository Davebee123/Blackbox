// The Co-op panel and the page's side of a session (docs/coop.md, coop.mjs). Developer mode only for now. A floating
// panel (the `coop` command, or Co-op on the System page): Host or Join, the codes to pass, who's here and their
// latency, Leave, and "Go to <name>'s network" (the host swap). The page (app.js) hands it:
//   own()               the real save (never the guest's view of someone else's world)
//   show(view, events)  a guest's new view of the host's world (null: the host is home), with what happened
//   home(note)          the session is over for this page: back to its own save
//   react(events), notice(text, bad), dirty()
import { hostSession, guestSession, hostGame, guestGame, hostSwap } from './coop.mjs';
import { roomCode, broadcastHost, broadcastJoin, rtcInvite, rtcAnswer } from './coop-net.mjs';
import { ARCHETYPES, SUBS } from './data.mjs';
import { active } from './combat.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const kitName = (c) => (c?.loadout?.sub?.[c.cls] && SUBS[c.loadout.sub[c.cls]] ? SUBS[c.loadout.sub[c.cls]].name : ARCHETYPES[c?.cls]?.name || c?.cls || '');
const LOADOUT_WORDS = /^(load|unload|equip|unequip|talent|untalent|respec|subclass|preset|program|daemon)\b/;

export function createCoop(app) {
  const C = { H: null, G: null, room: null, invite: null, answer: null, notes: [], el: null, busy: '' };

  // ---------- sessions ----------
  const onNote = (n) => { C.notes.push(n); C.notes = C.notes.slice(-4); app.notice(n.message, ['dropped', 'host-gone', 'refused'].includes(n.type)); draw(); };
  function host() {
    if (C.H || C.G) return C.H;
    C.H = hostGame(hostSession(app.own(), { onNote }));
    C.H.played = (g, ev) => { app.react(ev); app.dirty(); };
    C.H.ended = ((was) => () => { was?.(); })(C.H.ended);
    C.room = broadcastHost(roomCode(), (link) => C.H?.add(link));
    draw();
    return C.H;
  }
  function guest(link) {
    const G = wireGuest(guestGame(guestSession(app.own(), link, { onNote })));
    draw();
    return G;
  }
  function wireGuest(G) {
    G.onNote = onNote;
    G.updated = (view, events) => app.show(view, events);
    G.ended = () => { if (C.G === G) C.G = null; app.home(); draw(); };
    G.swapped = () => { // the host's game handed us the session: our world now
      const H = G.becomeHost({ onNote });
      C.G = null; C.H = H;
      H.played = (g, ev) => { app.react(ev); app.dirty(); };
      app.home();
      app.notice('You host now. Your guest is coming to your network. Connect to a server.');
      draw();
    };
    C.G = G;
    return G;
  }
  async function joinCode(code) {
    if (C.H || C.G) return app.notice('Leave this session first.', true);
    C.busy = 'Knocking…'; draw();
    try { guest(await broadcastJoin(code.trim().toLowerCase())); } catch (err) { app.notice(err.message, true); } finally { C.busy = ''; draw(); }
  }
  async function makeInvite() {
    host();
    C.busy = 'Making a code…'; draw();
    try {
      C.invite = await rtcInvite();
      C.invite.link.then((link) => { C.H?.add(link); C.invite = null; draw(); });
    } catch (err) { app.notice(`No WebRTC here: ${err.message}`, true); } finally { C.busy = ''; draw(); }
  }
  async function acceptReply(code) {
    if (!C.invite) return app.notice('Make an invite code first.', true);
    try { await C.invite.accept(code); C.busy = 'Connecting…'; } catch (err) { app.notice(err.message, true); }
    draw();
  }
  async function answerInvite(code) {
    if (C.H || C.G) return app.notice('Leave this session first.', true);
    C.busy = 'Making a reply…'; draw();
    try {
      C.answer = await rtcAnswer(code);
      C.answer.link.then((link) => { C.answer = null; guest(link); });
    } catch (err) { app.notice(err.message, true); } finally { C.busy = ''; draw(); }
  }
  function leave() {
    if (C.H) { C.H.leave(); C.H = null; }
    if (C.G) { C.G.leave(); C.G = null; }
    C.room?.close(); C.room = null; C.invite = null; C.answer = null;
    app.home();
    draw();
  }
  function swap() {
    if (!C.H) return app.notice('Only the host can take the party somewhere.', true);
    const g = C.H.guests.find((x) => x.joined);
    if (!g) return app.notice('Nobody to go to.', true);
    const G = hostSwap(C.H, g);
    if (G.error) return app.notice(G.error, true);
    C.H = null;
    wireGuest(G);
    app.notice(`You go to ${g.name}'s network. ${g.name} hosts now.`);
    draw();
  }

  // ---------- the page's hooks ----------
  C.hosting = () => !!C.H && C.H.guests.some((g) => g.joined);
  C.live = () => !!(C.H || C.G);
  C.tick = () => { C.H?.tick(); C.G?.tick(); if (C.el && !C.el.hidden && performance.now() - (C.drawn || 0) > 500) draw(); };
  // A guest's typed line: a fight command goes to the host; a loadout change runs on the guest's own save and goes to
  // the host as their character; anything else on the host's world is the host's to do. True when it's handled.
  C.intercept = (text, view) => {
    if (!C.G) return false;
    if (view && active(view)) { C.G.command(text); return true; }
    if (LOADOUT_WORDS.test(text)) { app.ownCommand(text); C.G.sendChar(); return true; }
    if (view || /^(connect|cd|go|engage|attack|jack|pull|open|force|rest|cat)\b/.test(text)) { app.notice(`${C.G.host} leads the party. You follow.`); return true; }
    return false;
  };
  C.command = (text) => {
    const [, word = '', arg = ''] = text.match(/^coop\s*(\S*)\s*(.*)$/) || [];
    if (!word) { open(); return; }
    if (word === 'host') { host(); open(); return app.notice(`Hosting. Room code ${C.room.code}.`); }
    if (word === 'join' && arg) { open(); return joinCode(arg); }
    if (word === 'leave') return leave();
    if (word === 'swap' || word === 'go') return swap();
    app.notice('coop, coop host, coop join <code>, coop swap, coop leave', true);
  };

  // ---------- the panel ----------
  function open() { mount(); C.el.hidden = false; draw(); }
  function mount() {
    if (C.el) return;
    C.el = document.createElement('section');
    C.el.className = 'coop-panel';
    C.el.id = 'coop';
    C.el.setAttribute('aria-label', 'Co-op');
    C.el.hidden = true;
    C.el.innerHTML = `<header class="coop-head"><b>Co-op</b><small>prototype</small><button type="button" class="coop-x" data-coop="close" title="Close">×</button></header>
      <div class="coop-status" data-coop-status></div>
      <div class="coop-body" data-coop-body></div>
      <div class="coop-rtc" data-coop-rtc>
        <label class="coop-lab">Invite code (host)</label><textarea class="coop-code" data-coop-invite readonly placeholder="Make an invite code first."></textarea>
        <div class="coop-row"><button type="button" class="btn" data-coop="invite">Make invite code</button><button type="button" class="btn" data-coop="copy-invite">Copy</button></div>
        <label class="coop-lab">Paste their reply code</label><textarea class="coop-code" data-coop-reply-in></textarea>
        <div class="coop-row"><button type="button" class="btn" data-coop="accept">Connect</button></div>
        <hr>
        <label class="coop-lab">Paste an invite code (guest)</label><textarea class="coop-code" data-coop-invite-in></textarea>
        <div class="coop-row"><button type="button" class="btn" data-coop="answer">Make reply code</button></div>
        <label class="coop-lab">Your reply code: send it back</label><textarea class="coop-code" data-coop-reply readonly></textarea>
        <div class="coop-row"><button type="button" class="btn" data-coop="copy-reply">Copy</button></div>
      </div>
      <ul class="coop-notes" data-coop-notes></ul>`;
    document.body.append(C.el);
    C.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-coop]');
      if (!b) return;
      const v = (sel) => C.el.querySelector(sel)?.value || '';
      const act = b.dataset.coop;
      if (act === 'close') C.el.hidden = true;
      else if (act === 'host') { host(); }
      else if (act === 'join') joinCode(v('[data-coop-code-in]'));
      else if (act === 'invite') makeInvite();
      else if (act === 'accept') acceptReply(v('[data-coop-reply-in]'));
      else if (act === 'answer') answerInvite(v('[data-coop-invite-in]'));
      else if (act === 'copy-invite') copy(v('[data-coop-invite]'));
      else if (act === 'copy-reply') copy(v('[data-coop-reply]'));
      else if (act === 'copy-room') copy(C.room?.code || '');
      else if (act === 'leave') leave();
      else if (act === 'swap') swap();
      draw();
    });
    // Typing in the panel never reaches the game's prompt.
    C.el.addEventListener('keydown', (e) => e.stopPropagation());
  }
  function copy(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => app.notice('Copied.'), () => app.notice('Select it and copy it by hand.', true));
  }
  function draw() {
    if (!C.el) return;
    C.drawn = performance.now();
    const st = C.el.querySelector('[data-coop-status]'), body = C.el.querySelector('[data-coop-body]');
    let status, html;
    if (C.H) {
      const in_ = C.H.guests.filter((g) => g.joined);
      status = in_.length ? `Hosting. ${in_.map((g) => `<span class="coop-mate">${esc(g.name)}</span> ${esc(kitName(g.char))} ${g.char.level}${g.lat != null ? ` · ${g.lat} ms` : ''}`).join(', ')}.` : 'Hosting. Nobody has joined yet.';
      html = `<div class="coop-row"><span class="coop-lab">Room code (same browser)</span><b class="coop-room">${esc(C.room?.code || '—')}</b><button type="button" class="btn" data-coop="copy-room">Copy</button></div>
        <div class="coop-row">${in_.length ? `<button type="button" class="btn" data-coop="swap" title="Jack out first. ${esc(in_[0].name)} hosts, and you walk their servers.">Go to ${esc(in_[0].name)}'s network</button>` : ''}<button type="button" class="btn" data-coop="leave">Leave</button></div>`;
    } else if (C.G) {
      status = C.G.joined ? `In <span class="coop-you">${esc(C.G.host)}</span>'s party as ${esc(C.G.you)}${C.G.lat != null ? ` · ${C.G.lat} ms` : ''}. ${esc(C.G.host)} leads.` : 'Saying hello…';
      html = '<div class="coop-row"><button type="button" class="btn" data-coop="leave">Leave</button></div>';
    } else {
      status = C.busy || 'Not in a session. Host one, or join one.';
      html = `<div class="coop-row"><button type="button" class="btn" data-coop="host">Host</button></div>
        <div class="coop-row"><input class="coop-in" data-coop-code-in maxlength="6" placeholder="room code" aria-label="Room code"><button type="button" class="btn" data-coop="join">Join</button></div>`;
    }
    if (C.busy && (C.H || C.G)) status += ` ${C.busy}`;
    if (st.innerHTML !== status) st.innerHTML = status;
    if (body.dataset.html !== html) { body.innerHTML = html; body.dataset.html = html; }
    const inv = C.el.querySelector('[data-coop-invite]'), rep = C.el.querySelector('[data-coop-reply]');
    if (inv.value !== (C.invite?.code || '')) inv.value = C.invite?.code || '';
    if (rep.value !== (C.answer?.code || '')) rep.value = C.answer?.code || '';
    C.el.querySelector('[data-coop-rtc]').hidden = !!C.G?.joined || (C.H && C.H.guests.some((g) => g.joined));
    const notes = C.notes.map((n) => `<li>${esc(n.message)}</li>`).join('');
    const ul = C.el.querySelector('[data-coop-notes]');
    if (ul.innerHTML !== notes) ul.innerHTML = notes;
  }
  return C;
}
