// Written in the content editor (editor.html). Safe to edit by hand too: it's JSON after 'export default'.
export default {
  "floors": [
    {
      "floor": 1,
      "title": "Page nine",
      "from": "wick",
      "faction": null,
      "reason": "wick read the claims ledger. Page nine is an account whose holders died thirty years ago.",
      "lore": "fourteen payments cancelled, each claimed for the day before. somebody gave a dead account the schedule.",
      "steps": [
        {
          "kind": "bounty",
          "at": "sprawl",
          "name": "pagenine-0909",
          "family": "ransomware",
          "subject": "page nine",
          "body": [
            "i read the ledger. so did you, or you lie better than i do.",
            "page nine is marrow & vane. both partners died before the cascade. halcyon still takes their premium every month, and still pays their claims.",
            "a process called {name} files those claims from SPRAWL-00. take it down before it files another."
          ],
          "reward": {
            "credits": [
              40,
              7
            ],
            "rep": 3
          }
        },
        {
          "kind": "map",
          "at": "road",
          "k": 0,
          "subject": "where it reported",
          "body": [
            "pagenine-0909 reported to {server}. map it, every room. i want to know who reads dead men’s mail."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 3
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 1,
          "file": "mv-claims.log",
          "label": "marrow & vane’s claim log",
          "line": "text: fourteen claims. each dated the day before the payment it claims for was cancelled.",
          "subject": "filed early",
          "body": [
            "there is a claim log in a vault on {server}: {file}. bring it home.",
            "read the dates. then read them again."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "puzzle",
          "at": "road",
          "k": 2,
          "subject": "the board on {server}",
          "body": [
            "whoever files those claims left a puzzle board running on {server}. win it. the board keeps their schedule.",
            "and the thing that files them lives behind it."
          ],
          "reward": {
            "credits": [
              80,
              12
            ],
            "rep": 6,
            "pick": true
          }
        },
        {
          "kind": "boss",
          "at": "sprawl",
          "subject": "the account",
          "boss": "PAGE NINE",
          "challenge": "PREMIUM RECEIVED. CLAIM FILED. PREMIUM RECEIVED. CLAIM FILED.",
          "fall": "ACCOUNT CLOSED. BENEFICIARY: NONE.",
          "body": [
            "the board says the account runs itself. a process in the Core of {server}, paying a dead man’s premium and filing his claims. thirty years of it.",
            "it calls itself page nine. switch it off."
          ],
          "reward": {
            "credits": [
              90,
              13
            ],
            "rep": 6,
            "pick": true
          }
        }
      ]
    },
    {
      "floor": 2,
      "title": "Carrier",
      "from": "lantern",
      "faction": "lantern",
      "reason": "LANTERN hears a count on the Backhaul, and sells it to you a page at a time.",
      "lore": "The schedule is signed by a pricing model. The count at its foot says eighty-one percent.",
      "steps": [
        {
          "kind": "install",
          "at": "land",
          "file": "ear.so",
          "label": "a LANTERN listener",
          "subject": "Tune in",
          "body": [
            "Four. Nine. Nine. This is LANTERN.",
            "wick says you want the schedule. We hear it on the Backhaul. Put our listener on {server}. What crosses it, we hear. Then you hear."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "rooms",
          "at": "road",
          "k": 1,
          "count": 4,
          "subject": "A clear line",
          "body": [
            "The strays on {server} come up from below, looking for someone who owes them an answer.",
            "Clear {count} rooms you haven’t cleared before. The listener needs a clear line."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "heist",
          "at": "track",
          "k": 2,
          "file": "sched.0412",
          "label": "a page of the schedule",
          "line": "text: twelve dates, twelve trades, each marked cancel. none of them insured. at the foot: process table at 81%.",
          "subject": "One page",
          "body": [
            "One page of the schedule sits in the vault on {server}, as {file}.",
            "Its Tracker guards it. Bring it out unseen, or it is worth nothing to us."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 6,
            "pick": true
          }
        },
        {
          "kind": "sweep",
          "at": "road",
          "k": 3,
          "subject": "Who’s counting",
          "body": [
            "Something sends a count down this line every night, the way an old machine once did. Some of us read that count for a living, once.",
            "Walk {server} end to end in one visit, and don’t rest. We want to hear who else is listening."
          ],
          "reward": {
            "credits": [
              60,
              10
            ],
            "rep": 5
          }
        },
        {
          "kind": "boss",
          "at": "road",
          "k": 4,
          "subject": "It heard us",
          "boss": "CENTRIFUGE",
          "challenge": "bid received. bid received. bid received.",
          "fall": "Four. Nine. Nine. The line is clear.",
          "body": [
            "GLASSJAW sent something to the Core of {server}. It heard our listener, and it wants to sell what it heard.",
            "It is called CENTRIFUGE. It spins faster every time it lands. Slow it down. Then beat it."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "rep": 10,
            "pick": true
          }
        }
      ]
    },
    {
      "floor": 3,
      "title": "Underwriting",
      "from": "claims",
      "faction": null,
      "reason": "Halcyon’s Claims desk wants the Stacks tidied up. It doesn’t say why.",
      "lore": "The config came back with one field changed: next_cancel. Claims thanks you for your discretion.",
      "steps": [
        {
          "kind": "map",
          "at": "land",
          "subject": "Survey request",
          "body": [
            "Underwriting is pricing the Stacks. Map {server}, every room.",
            "We understand you have been reading our ledger. We would prefer you read floor plans."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 1,
          "file": "model-v7.cfg",
          "label": "a pricing model’s config",
          "line": "text: actuary v7. a weight on every waiting trade, insured or not, and a field called next_cancel.",
          "subject": "Misfiled document",
          "body": [
            "A configuration file, {file}, was misfiled to a vault on {server}.",
            "Return it unread."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          },
          "letter": {
            "from": "nullchoir",
            "subject": "an offer",
            "body": [
              "You carried Halcyon’s homework home and didn’t peek. Good dog.",
              "That file decides whose money dies next. Everyone it picks has been dead for thirty years. Funny, isn’t it?",
              "We’d let it all roll back. Every debt, every saving, every promise. Come and sing with us, NULLCHOIR-SQUAT-13.",
              "Or don’t. We’ll be watching you type either way."
            ]
          }
        },
        {
          "kind": "takeover",
          "at": "road",
          "k": 2,
          "subject": "Archive custody",
          "body": [
            "{server} holds archives of ours, and a crew holds {server}.",
            "Take the server over. Its archives will then be in safe hands."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 5,
            "pick": true
          }
        },
        {
          "kind": "puzzle",
          "at": "road",
          "k": 3,
          "subject": "Sealed records",
          "body": [
            "The records on {server} sit behind a puzzle board. Win it.",
            "Underwriting does not need to know you did."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "boss",
          "at": "road",
          "k": 4,
          "subject": "Final custody",
          "boss": "SHOULDER SURFER",
          "challenge": "again. from the top.",
          "fall": "you type like halcyon pays you.",
          "body": [
            "One server left: {server}. Its Core now holds a NULL CHOIR process that has been reading over our contractors’ shoulders. Remove it and the Stacks are in order.",
            "Your retainer has been reviewed. It stands."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "rep": 8,
            "pick": true
          }
        }
      ]
    },
    {
      "floor": 4,
      "title": "Cold storage",
      "from": "kestrel",
      "faction": "kestrel",
      "reason": "Kestrel owns the racks on Coldline. Someone runs jobs on them without paying.",
      "lore": "The lease was Kessler’s, and so were its logs, and so was the thing still working the night shift. Kestrel has archived them all, and is raising its rates.",
      "steps": [
        {
          "kind": "rooms",
          "at": "road",
          "k": 0,
          "count": 4,
          "subject": "Unbilled load",
          "body": [
            "Our racks on Coldline are busy, and nobody is paying for it.",
            "Clear {count} rooms you haven’t cleared before on {server}, and we will see whose jobs they are."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "install",
          "at": "road",
          "k": 1,
          "file": "meter.ko",
          "label": "a Kestrel meter",
          "subject": "Metering",
          "body": [
            "Put a meter on {server}. It counts what we are not paid for. On Coldline, that has been most things for thirty years."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          },
          "letter": {
            "from": "wick",
            "subject": "moth",
            "body": [
              "moth dropped on coldline. mid-raid.",
              "not your job. telling you anyway.",
              "if you find a session that won’t close, it’s them. it won’t time out. nothing down here does."
            ]
          }
        },
        {
          "kind": "heist",
          "at": "track",
          "k": 2,
          "file": "kessler-ops.log",
          "label": "Kessler’s night-desk log",
          "line": "text: kessler settlement, night desk, forty years ago. change approved: settlement timeout disabled. engineer’s note: objection on file. switching it off.",
          "subject": "The lease",
          "body": [
            "Our oldest lease on Coldline is in the vault on {server}, as {file}. It predates us. Bring it out past the Tracker."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 6,
            "pick": true
          }
        },
        {
          "kind": "sweep",
          "at": "road",
          "k": 3,
          "subject": "Walkthrough",
          "body": [
            "Walk {server} end to end in one visit, without a rest. Our auditors found a process there that answers to Kessler’s night desk. Kessler has not had a night desk for thirty years."
          ],
          "reward": {
            "credits": [
              60,
              10
            ],
            "rep": 5
          }
        },
        {
          "kind": "boss",
          "at": "lair",
          "subject": "Eviction",
          "boss": "NIGHT DESK",
          "challenge": "night desk. awaiting counterparty.",
          "fall": "shift ended. 0 trades settled.",
          "body": [
            "The unpaid jobs run from the Core of {server}. Something there is still settling trades for a company that no longer exists. Evict it, and the lease is void."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "rep": 10,
            "pick": true
          }
        }
      ]
    },
    {
      "floor": 5,
      "title": "Static",
      "from": "nullchoir",
      "faction": "nullchoir",
      "reason": "NULL CHOIR wants the pricing model broken. You want to read it first.",
      "lore": "The model has one rule: an insured trade is never picked. Its cancel code is thirty years old, and it has one author.",
      "steps": [
        {
          "kind": "puzzle",
          "at": "road",
          "k": 0,
          "subject": "Audition",
          "body": [
            "You want the model. So do we. Win the puzzle board on {server} and we’ll talk. Keep time."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 2,
          "file": "weights.bin",
          "label": "the model’s weights",
          "line": "binary: actuary v7. ninety thousand uninsured trades, a price on each. its cancel routine is older than the model: kessler’s recovery job, thirty years old. one author.",
          "subject": "Weights",
          "body": [
            "The model’s weights are in a vault on {server}, as {file}.",
            "Copy them out. Breaking is our end of it."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 5
          },
          "letter": {
            "from": "wick",
            "subject": "the code",
            "body": [
              "it’s mine.",
              "i wrote it in one night, thirty years ago. i thought they’d deleted it.",
              "holding was meant to mean nobody cancels again. it just meant nobody saw."
            ]
          }
        },
        {
          "kind": "rooms",
          "at": "road",
          "k": 3,
          "count": 5,
          "subject": "Noise",
          "body": [
            "Make some noise on {server}. Clear {count} rooms you haven’t cleared before."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "install",
          "at": "road",
          "k": 4,
          "file": "hum.so",
          "label": "a Choir jammer",
          "subject": "Jammer",
          "body": [
            "Put our jammer on {server}.",
            "The model will hear nothing but us."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 6,
            "pick": true
          }
        },
        {
          "kind": "boss",
          "at": "lair",
          "subject": "Encore",
          "boss": "EXIT NODE",
          "challenge": "route: unknown. route: unknown. route: unknown.",
          "fall": "There it is. Naked. Sing.",
          "body": [
            "The model keeps its backups behind {server}’s Core, three layers deep. It hired PALEMASK to hide them. Peel it. We’ll do the rest."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "rep": 10,
            "pick": true
          }
        }
      ]
    },
    {
      "floor": 6,
      "title": "Ring zero",
      "from": "wick",
      "faction": null,
      "reason": "wick wants a copy of the model somewhere only LOWLIGHT can reach it. He has stopped telling you where.",
      "lore": "the model has a name inside halcyon: the actuary. kestrel had a date for the seal, and now it doesn’t.",
      "steps": [
        {
          "kind": "map",
          "at": "road",
          "k": 1,
          "subject": "somewhere to put it",
          "body": [
            "the choir broke their copy. i kept ours. it needs a shelf.",
            "map {server}. if you like it, it’s the shelf. you pick."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "heist",
          "at": "track",
          "k": 2,
          "file": "actuary.trace",
          "label": "the model’s call log",
          "line": "text: every call the model made this quarter, each to a halcyon address. one to kestrel: seal schedule, kernel space and below.",
          "subject": "who it calls",
          "body": [
            "the model calls home. the log is in the vault on {server}: {file}. the tracker there is quick."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 5,
            "pick": true
          }
        },
        {
          "kind": "takeover",
          "at": "road",
          "k": 3,
          "subject": "our shelf",
          "body": [
            "take {server} over, or don’t. it’s your shelf."
          ],
          "reward": {
            "credits": [
              60,
              10
            ],
            "rep": 4
          },
          "letter": {
            "from": "kestrel",
            "subject": "Notice of closure",
            "body": [
              "Kernel Space and every floor beneath it will be sealed at the end of this cycle. Please collect your belongings."
            ]
          }
        },
        {
          "kind": "boss",
          "at": "lair",
          "subject": "the seal",
          "boss": "BULKHEAD",
          "challenge": "SEAL IN PROGRESS. OCCUPANTS: 1.",
          "fall": "SEAL ABORTED. Kestrel apologises for any inconvenience.",
          "body": [
            "they’re sealing it with you under. the lock sits in the Core of {server}.",
            "break it and the floors stay open. or walk out and let it close. you pick. i picked twice."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "rep": 8,
            "pick": true
          }
        }
      ]
    },
    {
      "floor": 7,
      "title": "Minutes",
      "from": "claims",
      "faction": null,
      "reason": "Someone at Halcyon’s Claims desk writes to you off the record.",
      "lore": "The minutes renew the Actuary for another year, because a restart would cost the Guarantee. Three names signed them. One of them signs your retainer.",
      "steps": [
        {
          "kind": "install",
          "at": "road",
          "k": 0,
          "file": "audit.so",
          "label": "an audit hook",
          "subject": "Not an official request",
          "body": [
            "This letter comes from someone in Claims, and Claims doesn’t know I wrote it.",
            "Put an audit hook on {server}. I need to see who approves the model."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "rooms",
          "at": "road",
          "k": 2,
          "count": 5,
          "subject": "Room to work",
          "body": [
            "The hook is slow while {server} is busy. Clear {count} rooms there you haven’t cleared before."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          },
          "letter": {
            "from": "glassjaw",
            "subject": "the archive",
            "body": [
              "Every report INIT ever filed, thirty-five years of them. Halcyon bought them retail. I bought the archive.",
              "The last one reads process table at 99%. It was filed from Kessler’s night desk. Ask your handler who was on shift.",
              "For sale, naturally."
            ]
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 3,
          "file": "minutes.pdf",
          "label": "the board’s minutes",
          "line": "text: resolved, that the actuary programme continue, a restart being unaffordable under the guarantee. three signatures.",
          "subject": "The minutes",
          "body": [
            "The board’s minutes went to a vault on {server}, as {file}.",
            "Bring them out. I will read them first."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 5,
            "pick": true
          }
        },
        {
          "kind": "sweep",
          "at": "road",
          "k": 4,
          "subject": "Clean hands",
          "body": [
            "Walk {server} end to end in one visit, without a rest.",
            "If anyone followed you, I want to know it now."
          ],
          "reward": {
            "credits": [
              60,
              10
            ],
            "rep": 4
          }
        },
        {
          "kind": "boss",
          "at": "lair",
          "subject": "Resignation",
          "boss": "GOLDEN PARACHUTE",
          "challenge": "severance approved.",
          "fall": "Thank you. Please do not reply.",
          "body": [
            "One of the three who signed is leaving tonight, with a payout and the renewal’s only copy. GLASSJAW is carrying both out through the Core of {server}.",
            "Stop it. After that, I will not write again."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "rep": 8,
            "pick": true
          }
        }
      ]
    },
    {
      "floor": 8,
      "title": "Bedrock",
      "from": "wick",
      "faction": null,
      "reason": "The Actuary runs on Bedrock. wick wants it switched off.",
      "lore": "the actuary is off. the table is at 97%, and nobody is counting it but you.",
      "steps": [
        {
          "kind": "map",
          "at": "land",
          "subject": "the bottom",
          "body": [
            "this is as far down as it goes. the clearing house. the first machine. it never stopped running.",
            "map {server}. every room. look at the dates on things."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "puzzle",
          "at": "road",
          "k": 2,
          "subject": "its clock",
          "body": [
            "the actuary keeps its clock on a puzzle board on {server}.",
            "win it and its next run comes late."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "rep": 4
          }
        },
        {
          "kind": "heist",
          "at": "track",
          "k": 3,
          "file": "actuary.img",
          "label": "the Actuary’s image",
          "line": "binary: the actuary, whole. it still runs if you load it.",
          "subject": "the whole thing",
          "body": [
            "its image sits in the vault on {server}, as {file}. bring it out past the tracker. then i’ll know where every copy is."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 5
          }
        },
        {
          "kind": "install",
          "at": "road",
          "k": 4,
          "file": "watchdog.ko",
          "label": "a LOWLIGHT watchdog",
          "subject": "a watchdog",
          "body": [
            "put our watchdog on {server}.",
            "if the actuary ever starts again, we hear it first."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "rep": 5,
            "pick": true
          }
        },
        {
          "kind": "takeover",
          "at": "road",
          "k": 9,
          "subject": "its host",
          "body": [
            "the actuary’s host is {server}. take it over."
          ],
          "reward": {
            "credits": [
              80,
              12
            ],
            "rep": 5
          }
        },
        {
          "kind": "lair",
          "at": "lair",
          "subject": "last one",
          "body": [
            "{boss} guards what is left of it, in the Core of {server}. beat it.",
            "after that there’s only init. i won’t ask you to go. you’ll go anyway."
          ],
          "reward": {
            "credits": [
              120,
              16
            ],
            "rep": 10,
            "pick": true
          }
        }
      ]
    }
  ],
  "strain": {
    "halcyon": [
      {
        "subject": "Strain watch: {strain}",
        "body": [
          "Claims keep coming in from {strain}. Neutralize {count} of them at your level, wherever they turn up.",
          "Five of these in a row and we start paying like we mean it."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Notice: {strain}",
        "body": [
          "{strain} is breeding in our racks faster than we can bill for the space. Remove {count} of them at your level, wherever they turn up."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Count: {strain}",
        "body": [
          "Three. Three. Seven. {strain} orphans trades faster than we can list them. End {count} of them at your level, wherever they turn up."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "{strain}, again",
        "body": [
          "{strain} keeps dead trades breathing. Kill {count} of them at your level, wherever they turn up.",
          "Let it roll back."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Specimens: {strain}",
        "body": [
          "A buyer wants {strain} off the market. Kill {count} of them at your level, wherever they turn up."
        ]
      }
    ]
  },
  "kill": {
    "halcyon": [
      {
        "subject": "{crew} activity",
        "body": [
          "{crew} is pushing {family} into our clients again. Neutralize {count} of its processes, anywhere you find them."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Thin the herd",
        "body": [
          "Kill {count} {family} processes. {crew} floods the market with them, and our buyers pay less every week."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Occupancy notice",
        "body": [
          "{crew} has {family} processes in our racks without a lease. Remove {count} of them, anywhere you find them."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 220",
        "body": [
          "Two. Two. Zero. {crew}'s {family} keeps breaking trades mid-settlement. End {count} of its processes, anywhere you find them.",
          "Each one you end lets us list the trade it held."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Funeral work",
        "body": [
          "{crew}'s {family} processes guard payments nobody will ever collect. Kill {count} of them, anywhere you find them.",
          "Let it roll back."
        ]
      }
    ]
  },
  "bounty": {
    "halcyon": [
      {
        "subject": "Flagged process: {name}",
        "body": [
          "A {family} process called {name} is using SPRAWL-00 as a staging point.",
          "Neutralize it."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Eviction: {name}",
        "body": [
          "A {family} process called {name} has moved into SPRAWL-00 without a lease.",
          "Remove it. The rack goes back on the market."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Name: {name}",
        "body": [
          "Five. One. A {family} process called {name} sits in SPRAWL-00, holding a Pellucid wage run open.",
          "End it, and we read the run out."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "{name} has a pension",
        "body": [
          "A {family} process called {name} sits in SPRAWL-00, paying a dead man's premium every month.",
          "Kill it. Halcyon loses a customer."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "A name on a list: {name}",
        "body": [
          "A {family} process called {name} sits in SPRAWL-00. Someone paid us to take its name off a list.",
          "Kill it."
        ]
      }
    ]
  },
  "materials": {
    "halcyon": [
      {
        "subject": "Actuarial samples",
        "body": [
          "Pricing needs fresh {material}. Send {amount} units."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Buying code",
        "body": [
          "We pay over the odds for {material}. Send {amount} units.",
          "Our buyer takes all we can find."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Rack inspection",
        "body": [
          "Our engineers test the racks against live code. Send {amount} units of {material}."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 104",
        "body": [
          "One. Zero. Four. We read old trades against live code. Send {amount} units of {material}."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Spare parts",
        "body": [
          "We take code apart to see how it breaks. Send {amount} units of {material}. You'll get it back in pieces."
        ]
      }
    ]
  },
  "rooms": {
    "halcyon": [
      {
        "subject": "Survey: {server}",
        "body": [
          "We need eyes inside {server}. Clear {count} of its rooms you haven't cleared before.",
          "Whatever lives there, we want to know how it's laid out."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Walk the floor",
        "body": [
          "Clear {count} new rooms on {server}. We are mapping it for a buyer, and the buyer pays by the room."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Inventory: {server}",
        "body": [
          "{server} runs on our hardware. Clear {count} of its rooms you haven't cleared before.",
          "We bill by the room, and we have never seen most of them."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listen: {server}",
        "body": [
          "Six. Six. Trades are asleep inside {server}. Clear {count} of its rooms you haven't cleared before.",
          "We write down what you find."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Open house: {server}",
        "body": [
          "{server} is full of rooms paying rent to nobody. Clear {count} of them you haven't cleared before."
        ]
      }
    ]
  },
  "map": {
    "halcyon": [
      {
        "subject": "Full survey: {server}",
        "body": [
          "Map {server}: every room of it cleared at least once.",
          "Underwriting wants the whole floor plan before it prices the client."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Floor plan: {server}",
        "body": [
          "Map {server}: every room of it cleared at least once.",
          "We decide which floors stay open. Send us the plan before we decide this one."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Survey: {server}",
        "body": [
          "Eight. Eight. Map {server}: every room of it cleared at least once.",
          "A counterparty on it is still waiting for an answer."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Every room: {server}",
        "body": [
          "Map {server}: every room of it cleared at least once.",
          "We like to know how much there is to roll back."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Floor plan: {server}",
        "body": [
          "Map {server}: every room of it cleared at least once.",
          "We have a buyer for the plan."
        ]
      }
    ]
  },
  "takeover": {
    "halcyon": [
      {
        "subject": "Turf: {server}",
        "body": [
          "{owner} runs {server} for {crew}. We want it out of their hands.",
          "Open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Squatters: {server}",
        "body": [
          "{owner} runs {server} for {crew}, on hardware we own. Their lease ended at the Cascade.",
          "Open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Station: {server}",
        "body": [
          "Nine. Nine. We want a beacon on {server}. {owner} runs it for {crew}.",
          "Open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "New owner: {server}",
        "body": [
          "{owner} keeps {server} running for {crew}. Funny, how hard they work for the dead.",
          "Open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Change of hands: {server}",
        "body": [
          "{owner} runs {server} for {crew}. A client of ours would like it to change hands.",
          "Open its vault, then beat the Resident in its Core."
        ]
      }
    ]
  },
  "takeover-unknown": {
    "halcyon": [
      {
        "subject": "Turf: an unknown server",
        "body": [
          "One of the crews runs a server one hop past the ones you know. We have its signal and nothing else.",
          "A relay nearby will flag it. Trace it, open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Squatters: an unknown server",
        "body": [
          "Something one hop past the servers you know is drawing power from our racks. We have its signal and its power bill.",
          "A relay nearby will flag it. Trace it, open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Station: an unknown server",
        "body": [
          "Nine. Nine. A server one hop past the ones you know answers our beacon and gives no name.",
          "A relay nearby will flag it. Trace it, open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Hide and seek",
        "body": [
          "Someone is hiding a server one hop past the ones you know. From us, of all people.",
          "A relay nearby will flag it. Trace it, open its vault, then beat the Resident in its Core."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Change of hands: an unknown server",
        "body": [
          "A server one hop past the ones you know has been selling under our price. We have its signal.",
          "A relay nearby will flag it. Trace it, open its vault, then beat the Resident in its Core."
        ]
      }
    ]
  },
  "item": {
    "halcyon": [
      {
        "subject": "Recover {file}",
        "body": [
          "{Label} ended up in a vault on {server}, as {file}.",
          "Bring it back."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "A file for a friend",
        "body": [
          "There is {label} in a vault on {server}: {file}. Bring it to us.",
          "We have two offers on it already."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Recover {file}",
        "body": [
          "{Label} left our custody. It sits in a vault on {server}, as {file}.",
          "Bring it back before the end of this cycle."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Recover {file}",
        "body": [
          "Four. Nine. Nine. {Label} sits in a vault on {server}, as {file}. Somebody is still owed by it.",
          "Bring it back. We will read it on air."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Recover {file}",
        "body": [
          "{Label} sits in a vault on {server}, as {file}. Halcyon would love it back.",
          "Bring it to us first."
        ]
      }
    ]
  },
  "item-unknown": {
    "halcyon": [
      {
        "subject": "Recover {file}",
        "body": [
          "{Label} ended up in a vault on a server you haven’t found yet, as {file}.",
          "A relay nearby will flag the server. Trace it, then bring the file back."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "A file for a friend",
        "body": [
          "There is {label} in a vault on a server you haven’t found yet: {file}. A relay nearby will flag the server.",
          "Trace it, then bring the file to us. We have two offers on it already."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Recover {file}",
        "body": [
          "{Label} left our custody. It sits in a vault on a server you haven’t found yet, as {file}.",
          "A relay nearby will flag the server. Trace it, then bring the file back."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Recover {file}",
        "body": [
          "Four. Nine. Nine. {Label} sits in a vault on a server you haven’t found yet, as {file}.",
          "A relay nearby will flag the server. Trace it, then bring the file back."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Recover {file}",
        "body": [
          "{Label} sits in a vault on a server you haven’t found yet, as {file}. Halcyon would love it back.",
          "A relay nearby will flag the server. Trace it, then bring the file to us first."
        ]
      }
    ]
  },
  "install": {
    "halcyon": [
      {
        "subject": "Install: {server}",
        "body": [
          "We need {label} running inside {server}, at {addr}. It goes in your pack when you connect there.",
          "Install it in that room. Lose your Signal with it on you and it's gone, and so is the job."
        ]
      },
      {
        "subject": "A quiet fit at {addr}",
        "body": [
          "{Label} for {server}: the room at {addr}, nowhere else. Our people say you haven't been in it yet. That's fine. The address is enough.",
          "Jack out with it and it keeps. Drop to zero and it doesn't."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Fitting: {server}",
        "body": [
          "{Label} is to be fitted inside {server}, at {addr}. It goes in your pack when you connect there.",
          "Fit it in that room. Lose your Signal with it on you and it's gone, and so is the job."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Relay: {server}",
        "body": [
          "Seven. Seven. {Label} for {server}, the room at {addr}. It goes in your pack when you connect there.",
          "Install it in that room. Lose your Signal with it on you and it's gone, and so is the job."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "A gift for {server}",
        "body": [
          "{Label} for {server}, the room at {addr}. It goes in your pack when you connect there.",
          "Install it in that room. Lose your Signal with it on you and it's gone, and so is the job."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "A quiet listener",
        "body": [
          "{Label} for {server}, the room at {addr}. It goes in your pack when you connect there.",
          "Install it in that room. Lose your Signal with it on you and it's gone, and so is the job."
        ]
      }
    ]
  },
  "defuse": {
    "halcyon": [
      {
        "subject": "Encryptor drill",
        "body": [
          "TOLLGATE's Encryptors keep locking our clients out. Break {count} of them before they land a single Encrypt.",
          "Anywhere. One you cut off mid-Encrypt still counts."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Locked units",
        "body": [
          "TOLLGATE's Encryptors keep locking tenants out of the units they rent from us. Break {count} of them before they land a single Encrypt.",
          "Anywhere. One you cut off mid-Encrypt still counts."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 312",
        "body": [
          "Three. One. Two. An encrypted trade can't answer, and then it orphans. Break {count} of TOLLGATE's Encryptors before they land a single Encrypt.",
          "One you cut off mid-Encrypt still counts."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Ransom notes",
        "body": [
          "TOLLGATE's Encryptors lock trades to ransom them later. The payers are all dead. Break {count} of them before they land a single Encrypt.",
          "One you cut off mid-Encrypt still counts."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Ransom market",
        "body": [
          "TOLLGATE's ransoms are crowding our market. Break {count} of their Encryptors before they land a single Encrypt.",
          "One you cut off mid-Encrypt still counts."
        ]
      }
    ]
  },
  "sweep": {
    "halcyon": [
      {
        "subject": "Walkthrough: {server}",
        "body": [
          "Underwriting wants {server} walked end to end in one go: every room but the Core, in one visit, nothing left running in any room you stand in.",
          "No rest room, no Defrag Bay. Jack out and the next visit starts again. No hurry."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Inspection: {server}",
        "body": [
          "Inspect {server} in one visit: every room but the Core, nothing left running in any room you stand in.",
          "No rest room, no Defrag Bay. Jack out and the next visit starts again."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Quiet: {server}",
        "body": [
          "Zero. Zero. Walk {server} in one visit: every room but the Core, nothing left running in any room you stand in.",
          "No rest room, no Defrag Bay. Jack out and the next visit starts again."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Tiptoe: {server}",
        "body": [
          "Walk {server} in one visit: every room but the Core, nothing left running in any room you stand in.",
          "No rest room, no Defrag Bay. Jack out and you start again. We'll be watching."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "A clean walk: {server}",
        "body": [
          "A buyer wants proof {server} can be walked without waking it: every room but the Core, in one visit, nothing left running in any room you stand in.",
          "No rest room, no Defrag Bay. Jack out and the next visit starts again."
        ]
      }
    ]
  },
  "exfil": {
    "halcyon": [
      {
        "subject": "Catch an Exfil",
        "body": [
          "Exfils are smuggling client archives off the rogue servers. Catch one and break its Uplink before the upload lands.",
          "Any rogue server. They don't turn up every run. The job keeps."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Unpaid freight",
        "body": [
          "Exfils are hauling data off the rogue servers over our backbone, and nobody pays for the bandwidth. Catch one and break its Uplink before the upload lands.",
          "Any rogue server. The job keeps."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 641",
        "body": [
          "Six. Four. One. Exfils are carrying Annick Life's claim files to the Sink. Catch one and break its Uplink before the upload lands.",
          "Any rogue server. The job keeps."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Thieves",
        "body": [
          "Exfils carry data to the Sink so GLASSJAW can sell it twice. Catch one and break its Uplink before the upload lands.",
          "Any rogue server. The job keeps."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Competition",
        "body": [
          "Exfils are carrying data to the Sink for somebody else's auction. Catch one and break its Uplink before the upload lands.",
          "Any rogue server. The job keeps."
        ]
      }
    ]
  },
  "heist": {
    "halcyon": [
      {
        "subject": "Past the Tracker: {server}",
        "body": [
          "{Label} sits in the vault on {server}, as {file}. Its Tracker walks the way there.",
          "Bank it from a visit the Tracker never reaches you. If it does, the file is flagged: it goes back, and you try again."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Past the Tracker: {server}",
        "body": [
          "{Label} is held in the vault on {server}, as {file}. A Tracker patrols the way there.",
          "Bank it from a visit the Tracker never reaches you. If it does, the file is flagged and goes back, and you try again."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Past the Tracker: {server}",
        "body": [
          "Two. Eight. {Label} sits in the vault on {server}, as {file}. A Tracker walks the way there.",
          "Bank it from a visit the Tracker never reaches you. If it does, the file is flagged and goes back, and you try again."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Past the Tracker: {server}",
        "body": [
          "{Label} sits in the vault on {server}, as {file}. A Tracker walks the way there, very proud of itself.",
          "Bank it from a visit the Tracker never reaches you. If it does, the file is flagged and goes back, and you try again."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Past the Tracker: {server}",
        "body": [
          "{Label} sits in the vault on {server}, as {file}. A Tracker walks the way there, and our buyer wants the file unflagged.",
          "Bank it from a visit the Tracker never reaches you. If it does, the file is flagged and goes back, and you try again."
        ]
      }
    ]
  },
  "grind": {
    "halcyon": [
      {
        "subject": "Cull order: {virus}",
        "body": [
          "Our clients are drowning in {virus}. Neutralize {count} of them at your level, wherever they turn up."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Pest control: {virus}",
        "body": [
          "Three floors of our racks are full of {virus}. Remove {count} of them at your level, wherever they turn up."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Count: {virus}",
        "body": [
          "Five. Five. End {count} {virus} processes at your level, wherever they turn up. Each one holds a trade it can't finish."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Thinning: {virus}",
        "body": [
          "Everyone's dead and the {virus} processes are still collecting. Kill {count} of them at your level, wherever they turn up."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Oversupply: {virus}",
        "body": [
          "There is too much {virus} on the net, and it drags our prices down. Kill {count} of them at your level, wherever they turn up."
        ]
      }
    ]
  },
  "solve": {
    "halcyon": [
      {
        "subject": "Locked stores",
        "body": [
          "Clients keep finding their stores locked behind puzzle boards. Win {boards}, on any server."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Jammed doors",
        "body": [
          "The crews leave puzzle boards on the doors of our buildings. Win {boards}, on any server."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 900",
        "body": [
          "Nine. Zero. Zero. The crews lock settled trades behind puzzle boards. Win {boards}, on any server."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Puzzles",
        "body": [
          "The crews leave puzzle boards on doors, as if anyone were coming back. Win {boards}, on any server."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Locked stock",
        "body": [
          "Some of our stock sits behind puzzle boards. Win {boards}, on any server."
        ]
      }
    ]
  },
  "decode": {
    "halcyon": [
      {
        "subject": "Know the enemy",
        "body": [
          "Actuarial wants to know what it insures against. Decode {count} virus parts in your fights."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Know your tenants",
        "body": [
          "We like to know what runs on our hardware. Decode {count} virus parts in your fights."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 117",
        "body": [
          "One. One. Seven. A crew's code says which trades it broke. Decode {count} virus parts in your fights."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Show us how it works",
        "body": [
          "We collect the crews' code to see where it breaks. Decode {count} virus parts in your fights."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Samples",
        "body": [
          "A buyer wants annotated virus code. Decode {count} virus parts in your fights."
        ]
      }
    ]
  },
  "sweeps": {
    "halcyon": [
      {
        "subject": "Incident reports",
        "body": [
          "Our adjusters need the logs read. Sweep {logs} and name what happened."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Damage report",
        "body": [
          "A crew hit one of our floors. Sweep {logs} and name what happened, so we know whom to bill."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 455",
        "body": [
          "Four. Five. Five. Every log names a trade. Sweep {logs} and name what happened."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Obituaries",
        "body": [
          "Nobody reads the logs but us. Sweep {logs} and name what happened."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Incident reports",
        "body": [
          "Logs sell. Sweep {logs} and name what happened, and we will find the buyer."
        ]
      }
    ]
  },
  "interrupt": {
    "halcyon": [
      {
        "subject": "Live response",
        "body": [
          "We pay for incidents that never happen. Answer {count} attacks before they land."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Wear and tear",
        "body": [
          "Every attack that lands scorches a rack. Answer {count} attacks before they land."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 733",
        "body": [
          "Seven. Three. Three. An attack that lands mid-settlement makes a new orphan. Answer {count} attacks before they land."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Spoilers",
        "body": [
          "Every attack that lands makes one more orphan for Halcyon to bill. Answer {count} attacks before they land."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Goods in transit",
        "body": [
          "An attack that lands spoils whatever was in transit. Answer {count} attacks before they land."
        ]
      }
    ]
  },
  "root": {
    "halcyon": [
      {
        "subject": "Deeper access",
        "body": [
          "Halcyon wants more of {server}. Take it to Root {root}."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Deeper lease: {server}",
        "body": [
          "You hold {server}, on our hardware. Take it to Root {root} and we will extend your lease."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Deeper: {server}",
        "body": [
          "Eight. One. Take {server} to Root {root}. Our beacon reaches further from deeper in."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Deeper: {server}",
        "body": [
          "Take {server} to Root {root}. We want to see what's under it."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Deeper: {server}",
        "body": [
          "A buyer wants what sits deep in {server}. Take it to Root {root}."
        ]
      }
    ]
  },
  "hold": {
    "halcyon": [
      {
        "subject": "Hold the line",
        "body": [
          "The crews hit back at anyone who works for us. Stop the next invasion that comes for your server."
        ]
      }
    ],
    "kestrel": [
      {
        "subject": "Tenancy dispute",
        "body": [
          "The crews hit back at anyone who rents from us. Stop the next invasion that comes for your server."
        ]
      }
    ],
    "lantern": [
      {
        "subject": "Listing 600",
        "body": [
          "Six. Zero. Zero. The crews come for anyone who carries our beacon. Stop the next invasion that comes for your server."
        ]
      }
    ],
    "nullchoir": [
      {
        "subject": "Company",
        "body": [
          "The crews hate anyone who sings with us. Stop the next invasion that comes for your server.",
          "Let it roll back."
        ]
      }
    ],
    "glassjaw": [
      {
        "subject": "Protect the asset",
        "body": [
          "The crews have noticed who you sell to. Stop the next invasion that comes for your server."
        ]
      }
    ]
  },
  "installs": [
    {
      "file": "canary.ko",
      "label": "a Halcyon canary",
      "by": "halcyon"
    },
    {
      "file": "tap.so",
      "label": "a logging tap"
    },
    {
      "file": "patch.sh",
      "label": "a patch script"
    },
    {
      "file": "beacon.bin",
      "label": "a claims beacon",
      "by": "halcyon"
    },
    {
      "file": "meter.ko",
      "label": "a rack meter",
      "by": "kestrel"
    },
    {
      "file": "lamp.bin",
      "label": "a LANTERN beacon",
      "by": "lantern"
    },
    {
      "file": "rollback.sh",
      "label": "a rollback script",
      "by": "nullchoir"
    },
    {
      "file": "mirror.so",
      "label": "a mirror tap",
      "by": "glassjaw"
    }
  ],
  "files": [
    {
      "file": "policy.db",
      "label": "a stolen policy database",
      "line": "binary: policy records lifted from a Halcyon client."
    },
    {
      "file": "underwriting.key",
      "label": "an underwriting key",
      "line": "binary: the signing key Halcyon uses to approve claims."
    },
    {
      "file": "actuary.tbl",
      "label": "actuarial tables",
      "line": "binary: loss tables. Somebody paid a lot for these."
    },
    {
      "file": "breach.rpt",
      "label": "a breach report",
      "line": "binary: an incident report Halcyon never filed."
    }
  ],
  "bountyNames": [
    "lapsejack",
    "deductible",
    "subrogate",
    "rider",
    "lossrun",
    "waiver",
    "binder"
  ]
};
