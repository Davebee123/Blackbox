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
        "Halcyon Mutual insures half the servers on this net. Rival crews keep hitting its clients, and every hit is a claim Halcyon has to pay.",
        "So Halcyon pays crews like us to hit back. It calls that risk reduction, and it never asks how we do it.",
        "Keep your own box standing and the retainer keeps coming. Get breached and they start asking questions.",
        "First job: SPRAWL-00 is crawling with stray processes. Kill three of them."
      ],
      "job": {
        "type": "kill",
        "where": "sprawl",
        "family": null,
        "count": 3
      },
      "reward": {
        "credits": 60,
        "indemnity": 1,
        "standing": 3,
        "xp": 1
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
        "indemnity": 1,
        "standing": 3,
        "xp": 1
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
        "indemnity": 2,
        "standing": 3,
        "xp": 2
      }
    },
    {
      "id": "turf",
      "from": "claims",
      "subject": "Turf reassignment",
      "body": [
        "The crews you have been tracing run servers on our clients’ networks. We would like one of them to change hands.",
        "Pick any server you have traced, get past its guard and open its vault. How you find the key is your business.",
        "We will send you a relay when it is done. Put it on the server you take."
      ],
      "job": {
        "type": "takeover",
        "any": true
      },
      "reward": {
        "credits": 150,
        "indemnity": 3,
        "standing": 4,
        "xp": 3,
        "blueprint": true,
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
        "Put your relay up on it and listen. When the relay flags the signal, hunt the server down: kill what it sends, read the relay’s logs.",
        "Then pull the ledger out of its vault, bank it, and send it back through Mail. Do not read it. (Read it.)"
      ],
      "job": {
        "type": "item",
        "near": "took",
        "family": "ghostroot",
        "file": "claims.db",
        "label": "Halcyon’s claims ledger",
        "text": [
          "binary: Halcyon Mutual’s claims ledger. Fourteen months of payouts, every client named.",
          "pull it and bank it, then deliver it from Mail."
        ]
      },
      "reward": {
        "credits": 150,
        "indemnity": 4,
        "standing": 4,
        "xp": 3,
        "daemon": true
      }
    },
    {
      "id": "contractor",
      "from": "claims",
      "subject": "Contractor status",
      "body": [
        "Your probation is over. LOWLIGHT stays your crew, but we will send work to you directly from now on.",
        "Our board carries up to five offers at a time. Take up to three; drop any you like, and nothing is held against you.",
        "Contracts pay credits and Indemnity. Indemnity is only good at our store, where you will also find relays.",
        "Your retainer grows with your standing. A breach on your own server costs standing, and so does working for our competitors."
      ],
      "opensBoard": true
    }
  ]
};
