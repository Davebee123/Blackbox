// Transmissions: the scenes (scenes.mjs). Each is a conversation over the map: who's talking, and its nodes. A node
// says its lines and offers its choices (node ids); a choice reads as its node's q. A node with end closes the
// scene there (end: a page to go to, like 'mail' or 'map:{id}', or true). A choice whose node you've heard is gone
// next time. {key} is filled from the scene's args.
export default {
  welcome: {
    who: 'wick', from: 'LOWLIGHT',
    nodes: {
      start: { lines: ['you made it in. good.', "i'm wick. LOWLIGHT. halcyon pays, i point, you do the work."], ask: ['lowlight', 'halcyon', 'begin'] },
      lowlight: { q: "Who's LOWLIGHT?", lines: ['a crew. small.', "we fix what halcyon pays to have fixed, and we keep what they don't count."], ask: ['halcyon', 'begin'] },
      halcyon: { q: 'What does Halcyon want with me?', lines: ['every breach on their books is a claim they pay.', "you're cheaper than the payouts. keep your own box standing and the retainer keeps coming."], ask: ['lowlight', 'begin'] },
      begin: { q: 'Where do I start?', lines: ["SPRAWL-00. it's crawling with strays.", "kill three. the job's in your mail. every kill traces a server off it, too."], ask: ['mail', 'go'] },
      mail: { q: 'Open my mail.', end: 'mail' },
      go: { q: 'On my way.', end: true },
    },
  },
  'first-server': {
    who: 'wick', from: 'LOWLIGHT',
    nodes: {
      start: { lines: ['you traced one. {server}, level {level}.', 'a server is rooms. walk them, clear what holds them, open the vault.'], ask: ['how', 'vault', 'show', 'later'] },
      how: { q: 'How do I get in?', lines: ['connect from the map. it dials, you walk.', 'jack out any time to bank what you carry. go down in there and the pack is gone.'], ask: ['vault', 'show', 'later'] },
      vault: { q: "What's in the vault?", lines: ['its files. your first vault always has a protocol in it.', "an elite holds the key. or force the lock, if you've got signal to burn."], ask: ['how', 'show', 'later'] },
      show: { q: 'Show me.', end: 'map:{id}' },
      later: { q: 'Later.', end: true },
    },
  },
};
