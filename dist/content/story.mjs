// Written in the content editor (editor.html). Safe to edit by hand too: it's JSON after 'export default'.
export default {
  "contacts": {
    "wick": "wick · LOWLIGHT",
    "claims": "Halcyon Mutual · Claims",
    "glassjaw": "GLASSJAW"
  },
  "beats": [
    {
      "id": "welcome",
      "from": "wick",
      "subject": "you're in. mostly.",
      "body": [
        "Welcome to LOWLIGHT, initiate.",
        "Halcyon Mutual insures a large share of servers on this net. Rival crews keep hitting its clients, and every hit is a claim Halcyon has to pay.",
        "So Halcyon pays crews like us to hit back. It calls that \"risk reduction.\" I call it money for my weekly ramen down the street.",
        "Keep Halcyon happy and you get paid. It's really that simple.",
        "Speaking of simple, your first job shouldn't take long:",
        "SPRAWL-00 is a rogue server crawling with stray processes. Delete three of them.",
        "Don't mind the other runners, but sometimes sharing is caring."
      ],
      "job": {
        "type": "kill",
        "where": "sprawl",
        "family": null,
        "count": 3
      },
      "reward": {
        "credits": 60,
        "standing": 3
      }
    },
    {
      "id": "samples",
      "from": "claims",
      "subject": "Sample request",
      "body": [
        "LOWLIGHT says you are reliable. Our actuaries need live worm code to price next quarter’s policies.",
        "Send two units. Your retainer is paid every thirty minutes for as long as your standing holds."
      ],
      "job": {
        "type": "materials",
        "material": "worm",
        "amount": 2
      },
      "reward": {
        "credits": 80,
        "standing": 3
      }
    },
    {
      "id": "claimjack",
      "from": "wick",
      "subject": "a name on the list",
      "body": [
        "Halcyon flagged one process by name: {name}. It hops from the Sprawl into their clients’ mail servers.",
        "It is sitting in {room}, and it is tougher than the strays. Take it out."
      ],
      "job": {
        "type": "bounty",
        "family": "ransomware",
        "name": "claimjack-0412",
        "room": "/var/log",
        "grade": 2,
        "maxLevel": 4,
        "plus": 1,
        "calm": true
      },
      "boardAfterHour": true,
      "reward": {
        "item": "wicks-old-toolkit",
        "credits": 100,
        "standing": 3
      }
    },
    {
      "id": "turf",
      "from": "claims",
      "subject": "Turf reassignment",
      "body": [
        "The crews you have been tracing run servers on our clients’ networks. We would like one of them to change hands.",
        "Pick any server you have traced, open its vault, and beat the Resident in its Core. How you get the key is your business.",
        "We will send you a relay when it is done. Put it on the server you take."
      ],
      "job": {
        "type": "takeover",
        "any": true
      },
      "reward": {
        "credits": 250,
        "standing": 4,
        "relay": 1
      },
      "boardAfterHour": true,
      "opensBoard": true
    },
    {
      "id": "ledger",
      "from": "wick",
      "subject": "the ledger",
      "body": [
        "Somebody lifted Halcyon’s claims ledger, {file}. Its signal was last seen close to a server you control.",
        "Put your relay up on it and listen. When the relay flags the signal, hunt the server down. Kill what it sends, and read the relay’s logs.",
        "Then pull the ledger out of its vault, bank it, and send it back through Mail. Do not read it. (Read it.)"
      ],
      "job": {
        "type": "item",
        "near": "took",
        "family": "ghostroot",
        "file": "claims.db",
        "label": "Halcyon’s claims ledger",
        "text": [
          "binary: Halcyon Mutual’s claims ledger. Premiums collected this month on 4,112 accounts. 3,960 of the holders are dead.",
          "pull it and bank it, then deliver it from Mail."
        ]
      },
      "reward": {
        "credits": 150,
        "standing": 4,
        "drop": true
      }
    },
    {
      "id": "contractor",
      "from": "claims",
      "subject": "Contractor status",
      "body": [
        "Your probation is over. LOWLIGHT stays your crew, but we will send work to you directly from now on.",
        "Our board carries up to five offers at a time. Take up to three, and drop any you like. Nothing is held against you.",
        "Contracts pay credits. Spend them at our store, where you will find relays, and our own protocols for those we trust.",
        "Your retainer grows with your standing. A breach on your own server costs standing, and so does working for our competitors."
      ],
      "opensBoard": true
    },
    {
      "id": "badge",
      "from": "wick",
      "subject": "crew colours",
      "when": {
        "level": 22
      },
      "body": [
        "you have been carrying LOWLIGHT's name around for a while. time you wore it.",
        "take one more server for the crew. any one you have traced: vault, core, the usual.",
        "do that and the badge is yours. the old toolkit’s coming back too. rebuilt. don’t try to scrap it. you can’t."
      ],
      "job": {
        "type": "takeover",
        "any": true
      },
      "reward": {
        "credits": 400,
        "standing": 4,
        "item": "lowlight-badge",
        "items": ["wicks-old-toolkit"]
      }
    }
  ]
};
