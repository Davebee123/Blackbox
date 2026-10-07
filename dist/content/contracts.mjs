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
          "We pay over the odds for {material}. {amount} units.",
          "Halcyon will not like it. That is why it pays."
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
          "Get past its guard, open its vault, and beat the Resident in /core."
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
          "A relay nearby will flag it. Trace it, open its vault, then beat the Resident in /core."
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
