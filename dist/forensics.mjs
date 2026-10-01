// Log sweep: a short detective puzzle on runs. About half the servers you find keep an
// incident file in their root, and which kind is fixed per server:
//   breach.log     who broke in?        (logins: time, service, result, user, address)
//   transfer.log   what was stolen?     (transfers: time, direction, size, file, peer)
//   ps.snapshot    which one is it?     (processes: pid, parent, user, cpu, command)
// cat it for a one-screen log, a question and three suspects. Click lines to light up
// everything that shares a value (an address, a file, a command), filter the noise, then
// name your answer (`sweep <answer>`). A right answer pushes the lead toward the next server;
// wrong answers cost nothing but shrink it. Skipping changes nothing.
//
// Each kind has three tricks, by layer (1, 2, 3+): the obvious one, a decoy, and one that
// needs the note at the top of the log. The log comes from the server's seed: the same every
// visit, different everywhere.
import { emit, warn, addLead, gainXp, xpFor } from './combat.mjs';
import { seeded } from './gear.mjs';

export const SWEEP = { share: 0.5, rewards: [40, 25, 15, 10], xpShare: 0.3 };
export const SWEEP_FILES = { auth: 'breach.log', exfil: 'transfer.log', proc: 'ps.snapshot' };

const pick = (r, a) => a[Math.floor(r() * a.length)];
const ip = (r, used) => {
  let a;
  do {
    const k = r();
    a = k < 0.34 ? `10.${1 + Math.floor(r() * 9)}.${Math.floor(r() * 10)}.${2 + Math.floor(r() * 90)}`
      : k < 0.67 ? `172.16.${Math.floor(r() * 30)}.${2 + Math.floor(r() * 90)}`
      : `192.168.${Math.floor(r() * 10)}.${2 + Math.floor(r() * 90)}`;
  } while (used.includes(a));
  used.push(a);
  return a;
};
const clock = (min, sec = 0) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
const hhmm = (min) => clock(min).slice(0, 5);
const shuffled = (r, a) => a.map((x) => [r(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
const adminOf = (loc) => (loc.owner || 'admin').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'admin';

export const sweepTier = (loc) => Math.min(3, Math.max(1, loc.depth || 1));

// Which incident file this server keeps, if any (fixed per server).
export function sweepKind(loc) {
  if (!loc || loc.zone || loc.rogue) return null;
  const r = seeded((loc.seed || 1) * 43 + 11);
  if (r() >= SWEEP.share) return null;
  return pick(r, ['auth', 'auth', 'exfil', 'proc']);
}
export const sweepFile = (loc) => SWEEP_FILES[sweepKind(loc)] || null;

// ---------- the three kinds ----------
// Each returns { question, note, cols, rows, filters, toneCol, suspects, answer }.
// A row is { cells, tone ('bad'|'good'|'dim'|'', colours cell toneCol), flag (the value it lights
// up by: address, peer or parent pid), kind ('a'|'b': which filter keeps it) }.

function auth(r, tier, loc) {
  const used = [], admin = adminOf(loc), rows = [];
  const add = (min, res, user, addr, svc = 'sshd') => rows.push({ at: min * 60 + Math.floor(r() * 60), svc, res, user, addr });
  const staff = ip(r, used);
  let answer, suspects, note = '';
  for (let i = 0; i < 3; i++) add(60 + Math.floor(r() * 1200), 'RUN', pick(r, ['logrotate', 'backup', 'certbot', 'updatedb']), '', 'cron');
  if (tier === 1) {
    const loud = ip(r, used), stray = ip(r, used), start = 120 + Math.floor(r() * 120), n = 6 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) add(start + Math.floor(i / 3), 'FAIL', pick(r, ['root', 'admin', 'root']), loud);
    add(start + Math.ceil(n / 3), 'OK', 'root', loud);
    for (let i = 0; i < 2; i++) add(540 + Math.floor(r() * 480), 'OK', admin, staff);
    add(300 + Math.floor(r() * 600), 'FAIL', 'guest', stray);
    add(300 + Math.floor(r() * 600), 'FAIL', 'guest', stray);
    answer = loud; suspects = [loud, stray, staff];
  } else if (tier === 2) {
    const loud = ip(r, used), quiet = ip(r, used), start = 100 + Math.floor(r() * 200), n = 9 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) add(start + Math.floor(i / 2), 'FAIL', pick(r, ['root', 'admin', 'oracle', 'test']), loud);
    const q = start + 2 + Math.floor(r() * 4);
    add(q, 'FAIL', 'backup', quiet); add(q, 'FAIL', 'backup', quiet); add(q + 1, 'OK', 'backup', quiet);
    for (let i = 0; i < 2; i++) add(540 + Math.floor(r() * 480), 'OK', admin, staff);
    answer = quiet; suspects = [loud, quiet, staff];
  } else {
    const loud = ip(r, used), ghost = ip(r, used), inAt = 8 * 60 + 55, outAt = 18 * 60 + 10;
    note = `# badge log: ${admin} on site ${hhmm(inAt)}–${hhmm(outAt)}`;
    const start = 60 + Math.floor(r() * 120);
    for (let i = 0; i < 7; i++) add(start + i, 'FAIL', pick(r, ['root', 'admin', 'test']), loud);
    const day = inAt + 10 + Math.floor(r() * 30);
    add(day, 'FAIL', admin, staff); add(day, 'OK', admin, staff); add(day + 200 + Math.floor(r() * 200), 'OK', admin, staff);
    const night = 150 + Math.floor(r() * 60);
    add(night, 'FAIL', admin, ghost); add(night + 1, 'OK', admin, ghost);
    answer = ghost; suspects = [loud, staff, ghost];
  }
  rows.sort((a, b) => a.at - b.at);
  return {
    question: 'Someone broke in. Which address?', note,
    cols: ['time', 'svc', 'result', 'user', 'address'],
    rows: rows.map((l) => ({ cells: [clock(Math.floor(l.at / 60), l.at % 60), l.svc, l.res, l.user, l.addr], tone: l.res === 'FAIL' ? 'bad' : l.res === 'OK' ? 'good' : 'dim', flag: l.addr, kind: l.res === 'FAIL' ? 'a' : l.res === 'OK' ? 'b' : '' })),
    filters: ['Failed', 'Logged in'], toneCol: 2, suspects, answer,
  };
}

const FILES = ['ledger.db', 'payroll.csv', 'keys.bak', 'clients.xls', 'wallet.dat', 'mail.pst', 'contracts.zip', 'vpn.conf'];
function exfil(r, tier, loc) {
  const used = [], rows = [];
  const backup = ip(r, used), office = ip(r, used), outside = ip(r, used);
  const files = shuffled(r, FILES).slice(0, 6);
  const add = (min, dir, kb, file, peer) => rows.push({ at: min * 60 + Math.floor(r() * 60), dir, kb, file, peer });
  const size = (kb) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)}M` : `${kb}K`);
  let answer, suspects, note = '';
  // Office traffic by day: small files in and out.
  for (let i = 0; i < 6; i++) add(540 + Math.floor(r() * 480), r() < 0.5 ? 'IN' : 'OUT', 8 + Math.floor(r() * 300), pick(r, files.slice(3)), office);
  if (tier === 1) {
    // The biggest thing that left, at night, to somewhere new.
    const stolen = files[0];
    add(150 + Math.floor(r() * 60), 'OUT', 40000 + Math.floor(r() * 30000), stolen, outside);
    add(600 + Math.floor(r() * 300), 'OUT', 200 + Math.floor(r() * 400), files[1], office);
    add(700 + Math.floor(r() * 300), 'OUT', 100 + Math.floor(r() * 300), files[2], office);
    answer = stolen; suspects = [stolen, files[1], files[2]];
  } else if (tier === 2) {
    // A huge nightly backup is the decoy; the theft is mid-sized, to a peer nobody knows.
    note = `# backup target: ${backup}`;
    const big = files[1], stolen = files[0];
    add(120 + Math.floor(r() * 30), 'OUT', 90000 + Math.floor(r() * 40000), big, backup);
    add(170 + Math.floor(r() * 60), 'OUT', 3000 + Math.floor(r() * 4000), stolen, outside);
    add(700 + Math.floor(r() * 300), 'OUT', 150 + Math.floor(r() * 300), files[2], office);
    answer = stolen; suspects = [big, stolen, files[2]];
  } else {
    // Split into chunks so no single transfer stands out.
    note = `# backup target: ${backup}`;
    const stolen = files[0], big = files[1];
    add(120 + Math.floor(r() * 30), 'OUT', 90000 + Math.floor(r() * 40000), big, backup);
    const t0 = 160 + Math.floor(r() * 90);
    for (let i = 1; i <= 4; i++) add(t0 + i * 7, 'OUT', 900 + Math.floor(r() * 300), `${stolen}.00${i}`, outside);
    add(t0 + 20, 'OUT', 1200 + Math.floor(r() * 400), files[2], office);
    answer = stolen; suspects = [big, stolen, files[2]];
  }
  rows.sort((a, b) => a.at - b.at);
  return {
    question: 'Something was stolen. Which file?', note,
    cols: ['time', 'dir', 'size', 'file', 'peer'],
    rows: rows.map((l) => ({ cells: [clock(Math.floor(l.at / 60), l.at % 60), l.dir, size(l.kb), l.file, l.peer], tone: l.dir === 'OUT' ? 'bad' : 'good', flag: l.peer, kind: l.dir === 'OUT' ? 'a' : 'b' })),
    filters: ['Outbound', 'Inbound'], toneCol: 1, suspects, answer,
  };
}

const DAEMONS = ['sshd', 'cron', 'nginx', 'postgres', 'rsyslogd', 'dbus-daemon', 'containerd'];
function proc(r, tier, loc) {
  const rows = [];
  let pid = 300 + Math.floor(r() * 400);
  const next = () => (pid += 3 + Math.floor(r() * 90));
  const add = (p, parent, user, cpu, cmd) => rows.push({ pid: p, parent, user, cpu, cmd });
  add(1, 0, 'root', 0.1, 'init');
  const names = shuffled(r, DAEMONS).slice(0, 5);
  const ids = {};
  for (const n of names) { ids[n] = next(); add(ids[n], 1, n === 'postgres' ? 'postgres' : n === 'nginx' ? 'www' : 'root', +(r() * 3).toFixed(1), n); }
  for (let i = 0; i < 2; i++) add(next(), 2, 'root', 0, `[kworker/${i}:${Math.floor(r() * 3)}]`);
  let answer, suspects, note = '';
  if (tier === 1) {
    // A miner: one process eating the CPU.
    const bad = pick(r, ['xmrig', 'kdevtmpfsi', 'sysupdate']), p = next();
    add(p, 1, 'root', 90 + +(r() * 9).toFixed(1), bad);
    answer = String(p); suspects = [String(p), String(ids[names[0]]), String(ids[names[1]])];
  } else if (tier === 2) {
    // A real name in the wrong place: sshd started by the web server.
    note = '# services start from init (pid 1)';
    const web = ids.nginx || ids[names.find((n) => n !== 'sshd')], p = next();
    add(p, web, 'root', +(1 + r() * 4).toFixed(1), 'sshd');
    if (!ids.sshd) { ids.sshd = next(); add(ids.sshd, 1, 'root', 0.2, 'sshd'); }
    answer = String(p); suspects = shuffled(r, [String(p), String(ids.sshd), String(ids[names.find((n) => n !== 'sshd')])]);
  } else {
    // Dressed as a kernel thread, but running from /tmp.
    note = '# kernel threads run under kthreadd (pid 2) and show in [brackets]';
    const p = next();
    add(p, 1, 'root', +(2 + r() * 6).toFixed(1), '[kworker/1:2] /tmp/.x/kw');
    const kw = rows.find((x) => x.cmd.startsWith('[kworker'));
    answer = String(p); suspects = shuffled(r, [String(p), String(kw.pid), String(ids[names[0]])]);
  }
  rows.sort((a, b) => a.pid - b.pid);
  return {
    question: 'Something is hiding in here. Which pid?', note,
    cols: ['pid', 'ppid', 'user', 'cpu%', 'command'],
    rows: rows.map((x) => ({ cells: [String(x.pid), String(x.parent), x.user, x.cpu.toFixed(1), x.cmd], tone: x.cpu >= 50 ? 'bad' : x.user === 'root' ? '' : 'dim', flag: String(x.parent), kind: x.user === 'root' ? 'a' : 'b' })),
    filters: ['root', 'other users'], toneCol: 3, suspects, answer,
  };
}

const BUILD = { auth, exfil, proc };

// The puzzle for a server (null if it keeps no incident file).
export function sweepPuzzle(loc) {
  const kind = sweepKind(loc);
  if (!kind) return null;
  const tier = sweepTier(loc);
  const p = BUILD[kind](seeded((loc.seed || 1) * 41 + 29), tier, loc);
  const r = seeded((loc.seed || 1) * 47 + 3);
  return { kind, tier, file: SWEEP_FILES[kind], ...p, suspects: shuffled(r, p.suspects) };
}

const state = (loc) => (loc.state.sweep ||= { tries: 0, solved: null });

// cat <incident file>: the sweep appears in the terminal.
export function showSweep(s, loc) {
  const p = sweepPuzzle(loc), st = state(loc);
  if (!p) return;
  emit(s, 'net-sweep', `${p.file}: ${p.question}`, { location: loc.id, sweep: { ...p, answer: st.solved ? p.answer : null, solved: st.solved } });
}

// sweep <answer>
export function sweepCommand(s, loc, arg) {
  const p = loc && sweepPuzzle(loc);
  if (!p) return warn(s, 'Nothing to sweep here.');
  const st = state(loc);
  if (!arg) return showSweep(s, loc);
  if (st.solved) return emit(s, 'net-out', `Already swept: ${st.solved}.`);
  if (!p.suspects.includes(arg)) return emit(s, 'net-err', `sweep: ${arg} isn't one of the suspects (${p.suspects.join(', ')}).`);
  if (arg !== p.answer) {
    st.tries++;
    return emit(s, 'net-err', `${arg}: it doesn't fit. Look again.`);
  }
  st.solved = arg;
  const amount = SWEEP.rewards[Math.min(st.tries, SWEEP.rewards.length - 1)];
  emit(s, 'net-good', `SWEPT: ${arg}${st.tries ? '' : ', first read'}.`);
  addLead(s, loc.deeper || loc.family, amount, 'Log sweep: ');
  gainXp(s, xpFor(s, loc.level || 1, SWEEP.xpShare), 'log sweep');
}
