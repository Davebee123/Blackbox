// Written in the content editor (editor.html). Safe to edit by hand too: it's JSON after 'export default'.
export default {
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
  "grind": {
    "halcyon": [
      {
        "subject": "Cull order: {virus}",
        "body": [
          "Our clients are drowning in {virus}. Neutralize {count} of them at your level, wherever they turn up."
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
