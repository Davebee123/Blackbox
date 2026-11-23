// Transmissions: the scenes (scenes.mjs). Each is a conversation over the map: who's talking, and its nodes. A node
// says its lines and offers its choices (node ids); a choice reads as its node's q. A node with end closes the
// scene there (end: a page to go to, like 'mail' or 'map:{id}', or true). A choice whose node you've heard is gone
// next time. {key} is filled from the scene's args.
export default {
  welcome: {
    who: 'wick', from: 'LOWLIGHT',
    nodes: {
      start: { lines: ["there you are. took you long enough. coffee's gone cold twice.", "i'm wick, and welcome to LOWLIGHT. it's me and a desk, most days.", "halcyon pays, so halcyon picks the jobs. you're one of them now. sorry."], ask: ['lowlight', 'halcyon', 'begin'] },
      lowlight: { q: "Who's LOWLIGHT?", lines: ["a crew. small. you've met most of it.", "we clear what halcyon is tired of paying for, and keep what they don't count."], ask: ['halcyon', 'begin'] },
      halcyon: { q: 'What does Halcyon want with me?', lines: ['fewer claims. every breach on their books costs them, and you cost less.', 'keep your own box standing and the money keeps coming.'], ask: ['lowlight', 'begin'] },
      begin: { q: 'Where do I start?', lines: ["SPRAWL-00. it's crawling with strays.", "kill three. the job's in your mail. every kill traces a server off it, too."], ask: ['mail', 'go'] },
      mail: { q: 'Open my mail.', end: 'mail' },
      go: { q: 'On my way.', end: true },
    },
  },
  'first-server': {
    who: 'wick', from: 'LOWLIGHT',
    nodes: {
      start: { lines: ['you traced one. {server}, level {level}.', 'a server is rooms. walk them, clear what holds them, open the vault.'], ask: ['how', 'vault', 'show', 'later'] },
      how: { q: 'How does a run work?', lines: ['hit connect on the map. you come up in the first room.', 'jack out any time to bank what you carry. go down in there and the pack is gone.'], ask: ['vault', 'show', 'later'] },
      vault: { q: "What's in the vault?", lines: ['its files. your first vault always has a protocol in it.', "an elite holds the key. or force the lock, if you've got signal to burn."], ask: ['how', 'show', 'later'] },
      show: { q: 'Show me.', end: 'map:{id}' },
      later: { q: 'Later.', end: true },
    },
  },
  // The demo's event transmissions (docs/story-script.md "The demo's transmissions", approved 22 Nov; GAME_RULES.md
  // "What opens when"). A line or a choice's answer may be { careful, steady, bold } (the speaker's temperament, args.v),
  // or keyed on args.v2 (a rival's temperament and how the race ended).
  'runner-helped': {
    who: '{handle}', from: '{faction}', icon: 'runner',
    nodes: {
      start: { lines: [{ careful: "Pinging you before you disconnect. That room went better with two of us on it. I'm {handle}, {faction}'s, on the quiet servers mostly.", steady: "Thanks for the cover back there. {handle}, {faction}. You'll see my handle around this floor.", bold: 'Saw your process take that thing apart. {handle}, {faction}. Save the handle.' }], ask: ['want', 'run', 'later'] },
      want: { q: 'What do you want for it?', lines: [{ careful: "Patch me into your runs. A fee up front and a cut of what you bank. I'll keep you off the routes that bite.", steady: 'Put me on your crew. A fee up front, a cut of what you bank, and I connect every time you do.', bold: "Put me on your crew. A fee and a cut. I'm worth both, check my record." }], ask: ['run', 'later'] },
      run: { q: 'Run with me.', end: 'runner:{handle}' },
      later: { q: 'Another time.', lines: [{ careful: "I'm on the net a few more hours. Then I log off for a while.", steady: "I'll stay on the channel. Ping me.", bold: "Your loss. My handle's on #net." }], ask: ['want', 'run'] }, // Esc or × closes it
    },
  },
  'first-jackout': {
    who: 'wick', from: 'LOWLIGHT',
    nodes: {
      start: { lines: ["pack's banked. that's yours now, whatever happens next.", 'the net keeps moving while you\'re out of it. small things turn up and go again.'], ask: ['what', 'ok'] },
      what: { q: 'What turns up?', lines: ['a cache in a room you cleared. a rare stray worth the walk.', "they spark on the map for a few minutes, then they're gone."], ask: ['ok'] },
      ok: { q: 'Got it.', end: true },
    },
  },
  turf: {
    who: 'Halcyon Loss Prevention', from: 'Halcyon Mutual', icon: 'corp',
    nodes: {
      start: { lines: ["This is Halcyon Loss Prevention. Your handler's crew is now on our approved list.", 'Our board is open to you. We pay on delivery, and we do not ask how the work was done.'], ask: ['board', 'retainer', 'open', 'ok'] },
      board: { q: "What's on the board?", lines: ['Work from our clients, and some from parties we do not discuss. Offers arrive often and do not wait.'], ask: ['retainer', 'open', 'ok'] },
      retainer: { q: "What's the retainer?", lines: ['A payment every half hour, including while you are away. It rises as our confidence in you does.'], ask: ['board', 'open', 'ok'] },
      open: { q: 'Open the board.', end: 'mail' },
      ok: { q: 'Understood.', end: true },
    },
  },
  'first-held': {
    who: 'wick', from: 'LOWLIGHT',
    nodes: {
      start: { lines: ["{server}'s on your books. halcyon likes that. the strays on it don't.", "you've been all through it, so they have your address now. some of them follow it back across the net to your box."], ask: ['what', 'vault', 'fine'] },
      what: { q: 'What comes?', lines: ["viruses off the servers you've touched, one at a time. you'll see them coming on the map.", "the longer one sits on your box, the more it costs you, and the more it's carrying when you finally kill it."], ask: ['vault', 'fine'] },
      vault: { q: "What's in the vault?", lines: ["every vault holds a receipt. it's a trade somebody froze, with who paid and how much.", 'take the server over and you stamp the receipt. you decide who gets it.'], ask: ['what', 'fine'] },
      fine: { q: 'Fine.', end: true },
    },
  },
  'first-vault': {
    who: 'wick', from: 'LOWLIGHT',
    nodes: {
      start: { lines: ["got the files. you weren't the only one after them.", 'runners work vaults for whoever pays them. a server nobody holds is fair game, so next time one may connect while you\'re on it.'], ask: ['then', 'noted'] },
      then: { q: 'What happens then?', lines: ["it's a race to the vault. if your paths cross, you fight for it.", 'if they get there first and jack out, the files go with them.'], ask: ['noted'] },
      noted: { q: 'Noted.', end: true },
    },
  },
  'rival-met': {
    who: '{handle}', from: '{faction}', icon: 'runner',
    nodes: {
      start: { lines: [{ 'careful-won': "I logged how you beat me. Next time I'll bring something for it.", 'careful-lost': 'Clean run. The files are already sold.', 'steady-won': 'Fair fight. There are more vaults on my list.', 'steady-lost': 'That vault was on my list. Nothing personal.', 'bold-won': 'Ha. Good. I was getting bored of winning.', 'bold-lost': 'Too slow. Ping me when you want a rematch.' }], ask: ['who', 'off', 'see'] },
      who: { q: 'Who are you working for?', lines: ["I'm {handle}. I run for {faction}. They pay by the file, and they want every receipt before someone else stamps it."], ask: ['off', 'see'] },
      off: { q: 'Stay off my servers.', lines: [{ careful: "I don't touch a server someone holds. Take it over and I'll keep away.", steady: "Take it over and I won't connect. Leave it open and I will.", bold: "Then take them over. Until you do, I'll keep coming." }], ask: ['who', 'see'] },
      see: { q: 'See you.', end: true },
    },
  },
  'runner-known': {
    who: '{handle}', from: '{faction}', icon: 'runner',
    nodes: {
      start: { lines: [{ careful: "You've seen me fight, so I'm asking you. I've been tracing a frozen trade for a long time: {payer} to {payee}, {sum}, since {era}. I've found the server it's on.", steady: 'I have a trade stuck on a server near one of yours: {payer} to {payee}, {sum}. It has waited long enough, and I could use a hand.', bold: "I found my trade: {payer} to {payee}, {sum}, frozen since {era}. I'm going after the Resident that holds it. Are you coming?" }], ask: ['whose', 'show', 'later'] },
      whose: { q: 'Whose money is it?', lines: [{ careful: 'It was my family\'s. It has been frozen longer than I\'ve been alive.', steady: 'It belongs to someone who wants it settled, and so do I.', bold: "It doesn't matter whose. It's owed." }], ask: ['show', 'later'] },
      show: { q: 'Show me.', end: 'map:{id}' },
      later: { q: 'Later.', lines: [{ careful: 'It has waited this long. It can wait a little longer.', steady: "It isn't going anywhere, and I'll be on the net for a few more hours.", bold: "Don't take too long." }], ask: ['whose', 'show'] }, // Esc or × closes it
    },
  },
  schedule: {
    who: 'LANTERN', from: 'the Backhaul',
    nodes: {
      start: { lines: ["Four. Nine. Nine. You've read the bottom of the page. It says eighty-one percent.", 'The machine keeps a table of every process running on it. A trade that never finishes keeps its place in that table, so the table keeps filling.'], ask: ['full', 'down', 'over'] },
      full: { q: 'What happens at a hundred?', lines: ['Nothing new can start. That has happened once, at 2:14 in the morning.'], ask: ['down', 'over'] },
      down: { q: 'How does it come down?', lines: ["Every orphan you break cleanly frees a place in the table. From now on we'll mark the orphans for you and show you the count.", "If the count climbs too high, we cancel a round of trades ourselves. We don't like doing it."], ask: ['full', 'over'] },
      over: { q: 'Over.', end: true },
    },
  },
};
