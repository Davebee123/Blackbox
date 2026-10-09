// LOWLIGHT's back room (docs/world.md 2): what wick says after a breach, wick's leads, and the sentence at the top of
// the room. Safe to edit by hand: it's JSON after 'export default', like story.mjs. dist/room.mjs picks from it.
//   names      wick's word for each server
//   rooms      the sentence at the top of the room, by story beat (the last one whose fragment you hold wins)
//   wick       lines by fact (room.mjs FACTS): first.<server> a Resident's first fall, lost.<where> a loss by where it
//              ended, out a jack-out, streak three losses running on one server, then the choices you made in the
//              run, then rw.<rewrite> the first time you take it. {name} {sub} {resident} {author} {heat} fill in.
//   leads      wick's lead when a dead drop goes on the map: first (the first world turn), then the rest in turn
// wick writes lower case and short (docs/style-guide.md 3). One line about something you did. Never a mechanic.
export default {
  "names": {
    "sprawl-00": "sprawl",
    "vanta-07": "vanta",
    "coldstore-3": "coldstore",
    "pier-5": "pier-5",
    "depot-7": "depot",
    "chapel-0": "chapel",
    "meridian-14": "meridian",
    "mirror-12": "mirror hall",
    "tripmine-yard": "tripmine",
    "sluice-2": "sluice",
    "hashlord-rig": "hashlord",
    "ward-9": "ward-9",
    "claims-21": "claims-21",
    "kestrel-dc-3": "kestrel"
  },
  "rooms": [
    { "after": null, "text": "The radiator knocks. A chair is pulled out for you." },
    { "after": "sprawl-00", "text": "The radiator knocks. Someone left the Claims terminal logged in." },
    { "after": "mirror-12", "text": "The Claims terminal sits on the floor now. It's still on." }
  ],
  "wick": {
    "first.sprawl-00": ["that's the relay king off the air. sprawl sounds different already."],
    "first.vanta-07": ["back orifice is down. vanta was taking calls for somebody. find out who."],
    "first.coldstore-3": ["vault warden's down. read the spool twice."],
    "first.pier-5": ["patch tuesday's down. that pier won't ship another update."],
    "first.depot-7": ["repo man's down. keep the ledger. somebody will come asking for it."],
    "first.chapel-0": ["the choir stopped. first time i've heard chapel quiet."],
    "first.meridian-14": ["deadbolt's open. meridian's clock just stopped."],
    "first.mirror-12": ["mirror hall's down. you read the outbox. don't answer it."],
    "first.tripmine-yard": ["tripmine's down and nothing went loud. that's new."],
    "first.sluice-2": ["floodwall's down. sluice is draining for the first time in a year."],
    "first.hashlord-rig": ["hashlord's down. keep the invoice. don't pay it."],
    "first.ward-9": ["sleepwalker's down. it'll dream about you now."],
    "first.claims-21": ["echolalia's quiet. claims-21 is just a building now."],
    "first.kestrel-dc-3": ["underwriter's down. read it. then come back here."],

    "streak": ["{name} will wait. the others won't mind you.", "third time on {name}. it's learning you faster than you're learning it."],
    "lost.act1": ["the perimeter bit back. happens to everyone once.", "you didn't get past the front door on {name}. the door's still there."],
    "lost.gate1": ["gate 1 holds. it'll keep.", "{name}'s first gate is still up. so are you."],
    "lost.act2": ["services got you. the second act always looks easier from outside.", "you were deep in {name}. that counts. not much, but it counts."],
    "lost.gate2": ["gate 2. close is a place too.", "the second gate on {name} knows your handle now."],
    "lost.act3": ["kernel space. nobody walks out of there the first time.", "you were in {name}'s kernel. next time bring more."],
    "lost.core": ["you met {resident}. now you know what it does.", "{resident} is still home. it saw you, though."],
    "out": ["you jacked out with the pack. smart or scared, it spends the same.", "out at the gate. {name} keeps the rest for now."],

    "dugin": ["{author} dug in on {name}. you dug them out.", "{author} held {name} as hard as they could. it wasn't enough."],
    "hot": ["heat {heat} on {name}. they felt that one."],
    "checkpoint": ["second go at {name}. the second go is the one that counts.", "you picked {name} up where you dropped it. tidy."],
    "stock": ["{sub}'s still stock on {name}.", "you left {sub} stock on {name}. their code still runs there."],
    "norest": ["no rests on {name}. you'll feel that tomorrow."],
    "lean": ["two cards and a grudge. that was enough for {name}."],
    "elites": ["you went through the big ones on {name} on purpose."],
    "skipped": ["you passed on half the shelf in {name}. picky."],
    "reimage": ["same box, new furniture.", "{name} runs your way again."],
    "replay": ["you went back for {resident}'s things. fair."],

    "rw.maildrop": ["mail drop. now the resident pays the postage."],
    "rw.spamcannon": ["loud mail. the neighbours are going to read every one."],
    "rw.jumphost": ["jump host. you can see further than you should now."],
    "rw.forgedkeys": ["forged keys. don't tell me where you got the blanks."],
    "rw.warmstart": ["warm start. they'll still be yawning when you walk in."],
    "rw.nightlybuild": ["nightly build. somebody's compiling for you while you sleep."],
    "rw.pricefix": ["price fix. the stalls will hate you. they'll still sell."],
    "rw.slushfund": ["slush fund. don't spend it all at the first stall."],
    "rw.restorepoint": ["restore point. good. i'd like you back."],
    "rw.archive": ["you keep your old mods in a drawer now. sentimental."],
    "rw.kernelhook": ["kernel hook. more on the table every time."],
    "rw.memorymap": ["memory map. that's a bigger head on you."],
    "rw.serviceaccount": ["a service account. a door you can walk out of."],
    "rw.zonetransfer": ["zone transfer. you read the map before they draw it."],
    "rw.sinkhole": ["sinkhole. the neighbours only get to play songs you know."],
    "rw.bountyboard": ["bounty board. more people want more things from you."],
    "rw.audittrail": ["audit trail. now you get to read their notes."],
    "rw.listeningpost": ["listening post. the residents talk in their sleep."],
    "rw.testbed": ["testbed on {name}. the neighbours won't thank you."],
    "rw.range": ["a range. you can go back and shoot at it again."]
  },
  "leads": {
    "first": ["the others noticed you. something's waiting on {name}, {sub} side."],
    "drop": [
      "somebody left you something on {name}. {sub} side.",
      "{name}. {sub}. don't make me spell it.",
      "there's a drop on {name}. it won't sit there forever.",
      "i left a box open on {name}, {sub} side. close it behind you.",
      "check {sub} on {name}. bring it back here."
    ]
  }
};
