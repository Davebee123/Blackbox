// Threads (docs/threads.md): the quests you stumble on in server rooms. Data only; threads.mjs plays them.
//
// A chain: its title, the floor it starts on and the level it waits for (min), who it's for (giver) and why (reason),
// a faction where one is involved, its places, its temporary servers, its steps and the line it leaves in the log.
//   places   where its steps happen, resolved when the thread starts (threads.mjs placeOf). start is the room it
//            was found in. { same: true } a room on the start's server; { near: [lo, hi] } a server lo to hi links
//            off on the floor (from: another place's server, else the start's); { floor: -1 } a server a floor up.
//            Each place is a room of its own (a nook, hung off the deep end of a branch), named by label.
//   temps    temporary servers it raises (spawn on a talk step): name, author, builder, copy (its rooms copy your
//            ground), kill: what gives up the kill switch ('logs' or 'talk').
//   steps    talk (a person or a thing in a room: lines, a choice of two), goto (reach a room), escort (a file that
//            walks from one place to another), temp (a temporary server: goal 'logs' or 'kill').
// Text: {place} is its server's name, {place.at} its room's address; {temp} a temporary server's name; {builder}.
// The grammar: WoW's tooltips. Terse, in the world, nothing explained that the screen can show.
export default {
  chains: {
    'restore-point': {
      title: 'Restore Point', floor: 1, min: 3, giver: 'restore job 4471',
      reason: "M. Wren's photos are stuck half-copied. The job moving them never gave up.",
      lore: 'M. Wren got her photos back. She never knew from where.',
      places: { archive: { same: true, label: 'Cold storage' }, point: { near: [1, 2], label: 'Restore point' } },
      steps: [
        { kind: 'talk', at: 'start', who: 'restore job 4471', icon: 'npc', verb: 'Talk',
          lines: ['> restore 4471 · owner m.wren · STALLED', 'Source locked at {archive.at}. Destination dark.', 'Her archive is a slow process. It walks. You clear.', 'The restore point is on {point}. Get it there.'],
          text: 'Hear out the stalled restore job.' },
        { kind: 'goto', at: 'archive', text: 'Reach her archive at {archive.at}.', lines: ['wren-photos.tar · 2,114 files. It wakes and starts to walk.'] },
        { kind: 'escort', from: 'archive', to: 'point', name: 'wren-photos.tar', text: 'Walk the archive to the restore point on {point}.' },
        { kind: 'talk', at: 'point', who: 'restore point · m.wren', icon: 'file', verb: 'Restore',
          lines: ['> 2,114 files restored.', '> job log, one line from the owner:', '"thank you, whoever you are."'],
          text: 'Close out the restore.' },
      ],
    },
    'night-operator': {
      title: 'The Night Operator', floor: 2, min: 7, giver: 'ops-night', faction: 'kestrel',
      reason: 'A payroll run nobody finished. Forty people wait on it.',
      lore: 'Forty people got paid on a Tuesday. A Kestrel operator remembers your handle.',
      places: { file: { near: [1, 2], label: 'Payroll' }, terminal: { from: 'file', near: [2, 2], label: 'Night desk' } },
      steps: [
        { kind: 'talk', at: 'start', who: 'ops-night · idle 41:12:07', icon: 'npc', verb: 'Talk',
          lines: ["> session still open. you're not payroll.", "Payroll file's still on {file}. Get it out before the purge.", 'Forty people get paid off that file. Nobody else is coming for it.', "My terminal's on {terminal}. Bring it there."],
          text: 'Hear out the idle session.' },
        { kind: 'goto', at: 'file', text: 'Fight to the payroll file on {file}, {file.at}.', lines: ['payroll.db · 40 rows · flagged for purge. It starts to walk.'] },
        { kind: 'escort', from: 'file', to: 'terminal', name: 'payroll.db', text: 'Carry payroll.db to the night desk on {terminal}.' },
        { kind: 'talk', at: 'terminal', who: 'NIGHT OPERATOR · s. okafor', icon: 'npc', verb: 'Talk',
          lines: ["You brought it. Most don't.", "GLASSJAW's been asking after that file. They'd pay you more than I can."],
          choice: [
            { id: 'hand', label: 'Hand it over', lines: ['Forty paychecks, Tuesday. Kestrel hears who carried them.'], rep: { kestrel: 12 } },
            { id: 'sell', label: 'Sell it to GLASSJAW', lines: ["Then it was never here. Don't come back to this desk."], rep: { glassjaw: 10, kestrel: -8 }, credits: [150, 25], lore: 'GLASSJAW resold forty paychecks. The night desk went dark.' },
          ],
          text: 'Hand it to her, or sell it.' },
      ],
    },
    mirror: {
      title: 'Mirror', floor: 3, min: 13, giver: 'mirror.idx',
      reason: "Someone is copying your ground, room for room. The copy's for sale.",
      lore: 'Someone bought a map of your ground. It went dark in their hands.',
      places: { npc: { floor: -1, label: "Quill's room" } },
      temps: { copy: { name: 'MIRROR', author: 'palemask', builder: 'quill', copy: true, kill: 'talk' } },
      steps: [
        { kind: 'talk', at: 'start', who: 'mirror.idx', icon: 'file', verb: 'Read', spawn: 'copy',
          lines: ['> index of rooms · {copy.rooms} entries', 'The addresses are yours. Every one.', 'Somebody is building a copy of your ground. It is on the map now: {copy}.'],
          text: 'Read the index.' },
        { kind: 'temp', server: 'copy', goal: 'logs', text: "Read the copy's logs on {copy}." },
        { kind: 'talk', at: 'npc', who: 'QUILL · cartographer', icon: 'npc', verb: 'Talk', kill: 'copy',
          lines: ["You found the copy. Good. That's the job, really: see who notices.", 'I map ground for whoever pays. Yours sold twice.', "The kill switch is in its Core. I left it sealed for you. It isn't now."],
          text: 'Find Quill on {npc}.' },
        { kind: 'temp', server: 'copy', goal: 'kill', text: 'Shut the copy down: its Core, on {copy}.' },
      ],
    },
  },
  // The one-off threads: seeded on any floor, a variant each from the server's seed.
  templates: {
    escort: {
      xp: 'short',
      places: { to: { near: [1, 2], label: 'Drop box' } },
      variants: [
        { title: 'Orphaned Ledger', giver: 'ledger.db', file: 'ledger.db', reason: 'A tenant\'s books, cut loose from their owner.',
          lines: ['> owner: tenant 9 · last sync: never', "Its owner's box is on {to}.", "It can walk. It can't fight."], done: '> sync complete. tenant 9 is solvent again.', lore: 'Tenant 9 made rent.' },
        { title: 'The Long Way Home', giver: 'homing.bin', file: 'homing.bin', reason: 'A homing process, lost three hops out.',
          lines: ['> homing.bin · hops from home: 3', 'Home is {to}.', 'It knows the way. It needs the way clear.'], done: '> home.', lore: 'A homing process got home.' },
        { title: 'Witness', giver: 'statement.txt', file: 'statement.txt', reason: 'A statement nobody carried.',
          lines: ['> statement.txt · unsigned · unsent', 'Addressed to a desk on {to}.', 'Whoever wrote it never left this room.'], done: '> received. filed. read.', lore: 'A statement reached its desk.' },
      ],
    },
    talk: {
      xp: 'short',
      places: { to: { near: [1, 2], label: 'Back room' } },
      variants: [
        { title: 'Last Call', giver: 'session · m.kade', to: 'RHO', reason: 'A goodbye, three hours late.',
          lines: ['> session 3 hours idle.', "Tell Rho on {to} I'm not coming back.", "Just that. She'll know."], toLines: ['...', "Thanks. I'd stopped waiting."], lore: 'Rho stopped waiting.' },
        { title: 'Shift Change', giver: 'cron · night-shift', to: 'DAY-SHIFT', reason: 'A night job that wants to clock out.',
          lines: ['> cron night-shift · running 9,000 hours', 'Day shift sits on {to}. Nobody told it to take over.', "Tell it. I'd like to stop."], toLines: ['> handover received.', '> night-shift: exit 0.'], lore: 'A cron job clocked out after 9,000 hours.' },
        { title: 'Wrong Number', giver: 'pager · 2207', to: 'LINE 2207', reason: 'A page that never found its line.',
          lines: ['> page for line 2207 · undelivered x 340', 'The line is on {to}.', 'One message. It says: "come home".'], toLines: ['> paged.', '...he says he will.'], lore: 'Line 2207 went home.' },
      ],
    },
    temp: {
      xp: 'short',
      temps: { site: { kill: 'logs' } },
      variants: [
        { title: 'Spillway', giver: 'beacon.cfg', name: 'SPILLWAY', author: 'swarmline', builder: 'a SWARMLINE build bot', reason: 'Something is being built past the floor\'s edge.',
          lines: ['> beacon.cfg · target: {site}', 'Something is being built out past the edge of the floor.', 'It grows each time you look at it.'], lore: 'SPILLWAY went dark. Nobody claimed it.' },
        { title: 'Scaffold', giver: 'job.lock', name: 'SCAFFOLD', author: 'tollgate', builder: 'a TOLLGATE rigger', reason: 'A server half-built, still building.',
          lines: ['> job.lock · held by: {site}', 'A server nobody ordered, building itself room by room.', 'Find who left it running. Then stop it.'], lore: 'SCAFFOLD went dark with its lock still held.' },
        { title: 'Undertow', giver: 'route.tmp', name: 'UNDERTOW', author: 'glassjaw', builder: 'a GLASSJAW buyer', reason: 'A server pulling traffic it shouldn\'t.',
          lines: ['> route.tmp · all traffic via {site}', "A new server is pulling this floor's traffic through it.", 'Read it. Then cut it.'], lore: 'UNDERTOW went dark. The traffic came back.' },
      ],
    },
  },
};
