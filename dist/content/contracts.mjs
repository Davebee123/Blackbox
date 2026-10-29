// Written in the content editor (editor.html). Safe to edit by hand too: it's JSON after 'export default'.
export default {
  "floors": [
    {
      "floor": 1,
      "title": "Page nine",
      "from": "wick",
      "faction": null,
      "reason": "wick read the claims ledger. One client on page nine gets paid every month.",
      "lore": "fourteen claims, each filed the day before its hit. somebody knows the schedule.",
      "steps": [
        {
          "kind": "bounty",
          "at": "sprawl",
          "name": "pagenine-0909",
          "family": "ransomware",
          "subject": "page nine",
          "body": [
            "i read the ledger. page nine is one client, marrow & vane, paid fourteen times in fourteen months.",
            "a process called {name} files their claims from SPRAWL-00. take it down before it files another."
          ],
          "reward": {
            "credits": [
              40,
              7
            ],
            "xp": 2,
            "rep": 3
          }
        },
        {
          "kind": "map",
          "at": "road",
          "k": 0,
          "subject": "where it reported",
          "body": [
            "pagenine-0909 reported to {server}. map it, every room. i want to see what it carries."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
            "rep": 3
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 1,
          "file": "mv-claims.log",
          "label": "marrow & vane’s claim log",
          "line": "text: fourteen claims. each one is dated the day before the hit it claims for.",
          "subject": "filed early",
          "body": [
            "there is a claim log in a vault on {server}: {file}. bring it home.",
            "read the dates when you have it. then read them again."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "puzzle",
          "at": "road",
          "k": 2,
          "subject": "the board on {server}",
          "body": [
            "whoever filed those claims left a puzzle board running on {server}.",
            "win it. the board keeps their schedule."
          ],
          "reward": {
            "credits": [
              80,
              12
            ],
            "xp": 4,
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
      "reason": "LANTERN hears the schedule on the Backhaul, and sells it to you a page at a time.",
      "lore": "The schedule is signed. Not by a crew. By a pricing model.",
      "steps": [
        {
          "kind": "install",
          "at": "land",
          "file": "ear.so",
          "label": "a LANTERN listener",
          "subject": "Tune in",
          "body": [
            "wick says you want the schedule. We hear it on the Backhaul.",
            "Put our listener on {server}. We hear what crosses it, and so will you."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
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
            "The schedule crosses {server}. Clear {count} rooms there that you haven’t cleared before.",
            "The listener needs a clear line."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "heist",
          "at": "track",
          "k": 2,
          "file": "sched.0412",
          "label": "a page of the schedule",
          "line": "text: twelve servers, twelve dates, twelve crews. every client on it is insured by halcyon.",
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
            "xp": 3.5,
            "rep": 6,
            "pick": true
          }
        },
        {
          "kind": "sweep",
          "at": "road",
          "k": 3,
          "subject": "Who reads it",
          "body": [
            "Whoever reads the schedule passes through {server}.",
            "Walk it end to end in one visit, and don’t rest. We want to hear who else is there."
          ],
          "reward": {
            "credits": [
              60,
              10
            ],
            "xp": 4,
            "rep": 5
          }
        },
        {
          "kind": "lair",
          "at": "lair",
          "subject": "It heard us",
          "body": [
            "{boss} keeps the Core of {server}. It heard our listener.",
            "Beat it before it tells anyone what we heard."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "xp": 5,
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
      "lore": "The config came back with one field changed: next_hit. Claims thanks you for your discretion.",
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
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 1,
          "file": "model-v7.cfg",
          "label": "a pricing model’s config",
          "line": "text: actuary v7. client weights, crew rates, and a field called next_hit.",
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
            "xp": 3,
            "rep": 4
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
            "xp": 3.5,
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
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "takeover",
          "at": "road",
          "k": 9,
          "subject": "Final custody",
          "body": [
            "One server left: {server}. Take it over and the Stacks are in order.",
            "Your retainer has been reviewed. It stands."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "xp": 5,
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
      "reason": "Kestrel rents the racks on Coldline. Someone runs jobs on them without paying.",
      "lore": "The racks were leased by Halcyon Mutual, under a client’s name. Kestrel is raising its rates.",
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
            "xp": 3,
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
            "Put a meter on {server}. It counts what we are not paid for."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "heist",
          "at": "track",
          "k": 2,
          "file": "lease.db",
          "label": "the forged lease",
          "line": "binary: a rack lease for marrow & vane, signed by halcyon mutual’s procurement desk.",
          "subject": "The lease",
          "body": [
            "The lease for those racks is in the vault on {server}, as {file}. It is forged.",
            "Bring it out past the Tracker."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "xp": 3.5,
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
            "Walk {server} end to end in one visit, without a rest.",
            "Our auditors will want to know it was all looked at."
          ],
          "reward": {
            "credits": [
              60,
              10
            ],
            "xp": 4,
            "rep": 5
          }
        },
        {
          "kind": "takeover",
          "at": "road",
          "k": 9,
          "subject": "Eviction",
          "body": [
            "The jobs run from {server}. Take it over and the lease is void."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "xp": 5,
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
      "lore": "The model has one rule: a client who pays more is hit less. Whoever paid the most this year paid Halcyon.",
      "steps": [
        {
          "kind": "puzzle",
          "at": "road",
          "k": 0,
          "subject": "Audition",
          "body": [
            "You want the model. So do we.",
            "Win the puzzle board on {server} and we talk."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 2,
          "file": "weights.bin",
          "label": "the model’s weights",
          "line": "binary: actuary v7 weights. two thousand clients, a price on each.",
          "subject": "Weights",
          "body": [
            "The model’s weights are in a vault on {server}, as {file}.",
            "Copy them out. We break things. We don’t build them."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
            "rep": 5
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
            "xp": 3,
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
            "xp": 3.5,
            "rep": 6,
            "pick": true
          }
        },
        {
          "kind": "lair",
          "at": "lair",
          "subject": "Encore",
          "body": [
            "{boss} keeps the model’s backups in the Core of {server}.",
            "Beat it, and the backups are ours to break."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "xp": 5,
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
      "reason": "wick wants a copy of the model somewhere only LOWLIGHT can reach it.",
      "lore": "the model has a name inside halcyon. they call it the actuary.",
      "steps": [
        {
          "kind": "map",
          "at": "road",
          "k": 1,
          "subject": "somewhere to put it",
          "body": [
            "the choir broke their copy. i kept ours.",
            "it needs a home down here. map {server}, every room, and i will pick a shelf."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "heist",
          "at": "track",
          "k": 2,
          "file": "actuary.trace",
          "label": "the model’s call log",
          "line": "text: every call the model made this quarter. each one goes to a halcyon address.",
          "subject": "who it calls",
          "body": [
            "the model calls home. the log is in the vault on {server}: {file}.",
            "the tracker there is quick. don’t let it reach you."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "xp": 3.5,
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
            "take {server} over. that is where the copy lives now."
          ],
          "reward": {
            "credits": [
              60,
              10
            ],
            "xp": 4,
            "rep": 4
          }
        },
        {
          "kind": "lair",
          "at": "lair",
          "subject": "the landlord",
          "body": [
            "{boss} sits on {server}, two links from our shelf.",
            "beat it. i don’t like neighbours."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "xp": 5,
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
      "lore": "The minutes renew the Actuary for another year. Three names signed them. One of them signs your retainer.",
      "steps": [
        {
          "kind": "install",
          "at": "road",
          "k": 0,
          "file": "audit.so",
          "label": "an audit hook",
          "subject": "Not an official request",
          "body": [
            "This letter is not from Claims. It is from someone in Claims.",
            "Put an audit hook on {server}. I need to see who approves the model."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
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
            "xp": 3,
            "rep": 4
          }
        },
        {
          "kind": "item",
          "at": "road",
          "k": 3,
          "file": "minutes.pdf",
          "label": "the board’s minutes",
          "line": "text: resolved, that the actuary programme continue. three signatures.",
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
            "xp": 3.5,
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
            "xp": 4,
            "rep": 4
          }
        },
        {
          "kind": "takeover",
          "at": "road",
          "k": 9,
          "subject": "Resignation",
          "body": [
            "Take {server} over. The Actuary’s renewal goes through it.",
            "After that, I will not write again."
          ],
          "reward": {
            "credits": [
              100,
              14
            ],
            "xp": 5,
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
      "reason": "The Actuary runs on Bedrock. wick wants it switched off, and a copy kept.",
      "lore": "we kept a copy of everything. halcyon keeps paying the retainer. call it insurance.",
      "steps": [
        {
          "kind": "map",
          "at": "land",
          "subject": "the bottom",
          "body": [
            "this is as far down as it goes. the actuary runs here.",
            "map {server} first. every room."
          ],
          "reward": {
            "credits": [
              50,
              8
            ],
            "xp": 3,
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
            "xp": 3,
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
            "its image sits in the vault on {server}, as {file}.",
            "bring it out past the tracker. this one we keep."
          ],
          "reward": {
            "credits": [
              70,
              11
            ],
            "xp": 3.5,
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
            "xp": 3.5,
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
            "xp": 4,
            "rep": 5
          }
        },
        {
          "kind": "lair",
          "at": "lair",
          "subject": "last one",
          "body": [
            "{boss} guards what is left of it, in the Core of {server}.",
            "beat it, and come home. drinks are on halcyon."
          ],
          "reward": {
            "credits": [
              120,
              16
            ],
            "xp": 6,
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
          "Kill {count} {family} processes. The ones we want gone are the ones Halcyon pays you to leave alone.",
          "Halcyon will not like it. That is why it pays."
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
          "Halcyon will not like it. That is why it pays."
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
          "Clear {count} new rooms on {server}. We are mapping it for a buyer.",
          "Halcyon will not like it. That is why it pays."
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
          "There is {label} in a vault on {server}: {file}. Bring it to us, not to them.",
          "Halcyon will not like it. That is why it pays."
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
          "There is {label} in a vault on a server you haven’t found yet: {file}. Bring it to us, not to them.",
          "Halcyon will not like it. That is why it pays."
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
    ]
  },
  "installs": [
    {
      "file": "canary.ko",
      "label": "a Halcyon canary"
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
      "label": "a claims beacon"
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
