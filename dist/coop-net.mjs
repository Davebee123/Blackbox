// Co-op transports (docs/coop.md). A link is one end of a two-way pipe of JSON messages:
//   link.send(msg)       a plain object (game state and the character only: never anything personal)
//   link.onmessage = fn  called with each message from the other end
//   link.onclose = fn    called once when the other end goes (or this end closes)
//   link.close()         leave
//   link.kind            'memory' | 'broadcast' | 'rtc'
// Three kinds: in memory (Node tests), BroadcastChannel (two tabs in one browser) and a WebRTC data channel, signalled
// by copy and paste (no server).

export const NET = {
  stun: [{ urls: 'stun:stun.l.google.com:19302' }], // public STUN only; some networks need TURN (a server, later)
  chunk: 16000, // a WebRTC message longer than this goes in pieces (browsers cap a data channel message at 64–256 KB)
  gatherMs: 4000, // how long to wait for ICE candidates before giving out a code anyway
  prefix: { offer: 'BBX1-', answer: 'BBR1-' },
};

function makeLink(kind, sendRaw, closeRaw) {
  const link = { kind, open: true, onmessage: null, onclose: null };
  link.send = (msg) => { if (link.open) sendRaw(msg); };
  link.deliver = (msg) => { if (link.open) link.onmessage?.(msg); };
  link.gone = () => { if (!link.open) return; link.open = false; link.onclose?.(); };
  link.close = () => { if (!link.open) return; closeRaw?.(); link.gone(); };
  return link;
}

// ---------- in memory ----------
// Two linked ends. Each message is copied through JSON, as a wire would. Delivery is synchronous for the caller but
// never re-entrant: a message sent while one is being handled waits its turn in the queue.
export function memoryPair() {
  const queue = [];
  let draining = false;
  const drain = () => {
    if (draining) return;
    draining = true;
    try { while (queue.length) { const [to, msg] = queue.shift(); if (msg === CLOSED) to.gone(); else to.deliver(msg); } } finally { draining = false; }
  };
  const CLOSED = {}; // a close travels behind what was sent before it
  const a = makeLink('memory', (m) => { queue.push([b, JSON.parse(JSON.stringify(m))]); drain(); }, () => { queue.push([b, CLOSED]); drain(); });
  const b = makeLink('memory', (m) => { queue.push([a, JSON.parse(JSON.stringify(m))]); drain(); }, () => { queue.push([a, CLOSED]); drain(); });
  return [a, b];
}

// ---------- BroadcastChannel ----------
// A room code (6 letters) names the channel. The host listens: each new tab that says hello gets a link of its own.
// Every message carries who sent it and who it's for, since everyone on the channel hears everything.
export const roomCode = (rnd = Math.random) => Array.from({ length: 6 }, () => 'abcdefghjkmnpqrstuvwxyz'[Math.floor(rnd() * 23)]).join('');
const tabId = () => Math.random().toString(36).slice(2, 10);
const channelName = (code) => `blackbox-coop-${code}`;
export function broadcastHost(code, onLink, BC = globalThis.BroadcastChannel) {
  const ch = new BC(channelName(code)), me = tabId(), links = new Map();
  ch.onmessage = ({ data }) => {
    if (!data || data.to !== me && data.to !== '*') return;
    let link = links.get(data.from);
    if (!link && data.m?.t === 'knock') {
      const from = data.from;
      link = makeLink('broadcast', (m) => ch.postMessage({ from: me, to: from, m }), () => ch.postMessage({ from: me, to: from, m: { t: 'bye' } }));
      links.set(from, link);
      const was = link.gone;
      link.gone = () => { links.delete(from); was(); };
      ch.postMessage({ from: me, to: from, m: { t: 'door' } });
      onLink(link);
      return;
    }
    if (!link) return;
    if (data.m?.t === 'bye') link.gone();
    else if (data.m?.t !== 'knock') link.deliver(data.m);
  };
  return { code, close: () => { for (const l of [...links.values()]) l.close(); ch.close(); } };
}
// The guest's end: knocks until the host answers (or gives up after a few seconds). Resolves to the link.
export function broadcastJoin(code, { BC = globalThis.BroadcastChannel, waitMs = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    const ch = new BC(channelName(code)), me = tabId();
    let host = null, link = null;
    const knock = setInterval(() => ch.postMessage({ from: me, to: '*', m: { t: 'knock' } }), 250);
    const give = setTimeout(() => { clearInterval(knock); ch.close(); reject(new Error(`Nobody is hosting ${code}.`)); }, waitMs);
    ch.postMessage({ from: me, to: '*', m: { t: 'knock' } });
    ch.onmessage = ({ data }) => {
      if (!data || data.to !== me) return;
      if (!host && data.m?.t === 'door') {
        host = data.from;
        clearInterval(knock); clearTimeout(give);
        link = makeLink('broadcast', (m) => ch.postMessage({ from: me, to: host, m }), () => { ch.postMessage({ from: me, to: host, m: { t: 'bye' } }); });
        const was = link.gone;
        link.gone = () => { was(); ch.close(); };
        resolve(link);
        return;
      }
      if (data.from !== host || !link) return;
      if (data.m?.t === 'bye') link.gone(); else link.deliver(data.m);
    };
  });
}

// ---------- codes ----------
// An SDP as a code to paste: deflated and base64url'd, behind a short prefix that says which half it is.
const b64url = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64url = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
export async function packCode(prefix, obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  const z = typeof CompressionStream === 'function' ? await pipe(raw, new CompressionStream('deflate-raw')) : null;
  return prefix + (z ? 'z' + b64url(z) : 'j' + b64url(raw));
}
export async function unpackCode(prefix, code) {
  const c = String(code || '').replace(/\s+/g, '');
  if (!c.startsWith(prefix)) throw new Error(prefix === NET.prefix.offer ? 'That is not an invite code.' : 'That is not a reply code.');
  const body = c.slice(prefix.length), bytes = unb64url(body.slice(1));
  const raw = body[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

// ---------- WebRTC ----------
// Long messages go in pieces, put back together on the other side.
function rtcLink(dc) {
  let serial = 0;
  const parts = new Map();
  const link = makeLink('rtc', (m) => {
    const text = JSON.stringify(m);
    if (text.length <= NET.chunk) { dc.send(text); return; }
    const id = ++serial, n = Math.ceil(text.length / NET.chunk);
    for (let i = 0; i < n; i++) dc.send(JSON.stringify({ t: 'piece', id, i, n, d: text.slice(i * NET.chunk, (i + 1) * NET.chunk) }));
  }, () => { try { dc.close(); } catch { /* already closed */ } });
  dc.onmessage = (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch { return; }
    if (m?.t === 'piece') {
      const got = parts.get(m.id) || [];
      got[m.i] = m.d;
      parts.set(m.id, got);
      if (got.filter((x) => x != null).length < m.n) return;
      parts.delete(m.id);
      try { m = JSON.parse(got.join('')); } catch { return; }
    }
    link.deliver(m);
  };
  dc.onclose = () => link.gone();
  return link;
}
function gathered(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); } };
    const t = setTimeout(resolve, NET.gatherMs);
    pc.addEventListener('icegatheringstatechange', done);
  });
}
// The host: an invite code to give, and accept(replyCode) once the guest sends theirs back. link: resolves when the
// data channel opens.
export async function rtcInvite(RTC = globalThis.RTCPeerConnection) {
  const pc = new RTC({ iceServers: NET.stun });
  const dc = pc.createDataChannel('coop', { ordered: true });
  const link = new Promise((resolve) => { dc.onopen = () => resolve(rtcLink(dc)); });
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  const code = await packCode(NET.prefix.offer, { sdp: pc.localDescription.sdp });
  return { code, pc, link, accept: async (reply) => { const { sdp } = await unpackCode(NET.prefix.answer, reply); await pc.setRemoteDescription({ type: 'answer', sdp }); } };
}
// The guest: from the host's invite code, a reply code to send back. link: resolves when the data channel opens.
export async function rtcAnswer(invite, RTC = globalThis.RTCPeerConnection) {
  const { sdp } = await unpackCode(NET.prefix.offer, invite);
  const pc = new RTC({ iceServers: NET.stun });
  const link = new Promise((resolve) => { pc.ondatachannel = (ev) => { const dc = ev.channel; if (dc.readyState === 'open') resolve(rtcLink(dc)); else dc.onopen = () => resolve(rtcLink(dc)); }; });
  await pc.setRemoteDescription({ type: 'offer', sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return { code: await packCode(NET.prefix.answer, { sdp: pc.localDescription.sdp }), pc, link };
}
