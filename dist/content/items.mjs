// Written in the content editor (editor.html). Safe to edit by hand too: it's JSON after 'export default'.
export default {
  "uniques": [
    {
      "id": "wicks-old-toolkit",
      "name": "wick's Old Toolkit",
      "base": "proof-of-concept",
      "level": 1,
      "primary": {
        "damage": [
          5,
          6
        ],
        "signal": 10
      },
      "sources": [
        {
          "kind": "story",
          "id": "claimjack"
        }
      ],
      "flavour": "Comments in three languages. None of them polite."
    },
    {
      "id": "neighbours-wifi",
      "name": "Neighbour's Wi-Fi",
      "base": "open-proxy",
      "level": 2,
      "primary": {
        "signal": 40,
        "reduction": 2
      },
      "secondary": {
        "scavenge": 10
      },
      "sources": [
        {
          "kind": "sprawl"
        }
      ],
      "flavour": "Password was on a sticky note in a photo they posted."
    },
    {
      "id": "boot-loop",
      "name": "Boot Loop",
      "base": "reverse-shell",
      "level": 3,
      "primary": {
        "signal": 22,
        "regen": 1
      },
      "secondary": {
        "crit": 4
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 1
        }
      ],
      "flavour": "Dies, comes back, dies, comes back."
    },
    {
      "id": "duckyscript",
      "name": "DuckyScript",
      "base": "one-liner",
      "level": 4,
      "primary": {
        "damage": 5,
        "signal": 16
      },
      "secondary": {
        "crit": 5
      },
      "sources": [
        {
          "kind": "guard",
          "id": "watchdog"
        }
      ],
      "flavour": "Types faster than anyone watching."
    },
    {
      "id": "logger-spool",
      "name": "Logger Spool",
      "base": "weaponized-exploit",
      "level": 5,
      "primary": {
        "damage": [
          12,
          15
        ]
      },
      "secondary": {
        "sync": 5
      },
      "effect": {
        "when": "hit",
        "if": "synced",
        "do": "damage%",
        "value": 25
      },
      "sources": [
        {
          "kind": "strain",
          "id": "keylogger"
        }
      ],
      "flavour": "Every keystroke, played back at the worst moment."
    },
    {
      "id": "cryptominer",
      "name": "Cryptominer",
      "base": "socks-tunnel",
      "level": 5,
      "primary": {
        "signal": 60,
        "reduction": 1
      },
      "secondary": {
        "clock": 12
      },
      "downside": {
        "accuracy": -5
      },
      "effect": {
        "when": "break",
        "do": "refund",
        "value": 1
      },
      "sources": [
        {
          "kind": "strain",
          "id": "hashrat"
        }
      ],
      "flavour": "Someone else's cycles, your coin."
    },
    {
      "id": "hotfix",
      "name": "Hotfix",
      "base": "tty-upgrade",
      "level": 5,
      "primary": {
        "signal": 30,
        "regen": 2
      },
      "effect": {
        "when": "always",
        "if": "below-half",
        "do": "stat-x2",
        "stat": "regen"
      },
      "sources": [
        {
          "kind": "strain",
          "id": "patchwork"
        }
      ],
      "flavour": "Pushed to production. Prayed over."
    },
    {
      "id": "flood-ramp",
      "name": "Flood Ramp",
      "base": "cron-job",
      "level": 6,
      "primary": {
        "damage": 6,
        "signal": 24
      },
      "secondary": {
        "payload": 2
      },
      "effect": {
        "when": "custom",
        "do": "burn-grow",
        "value": 1,
        "cap": 4
      },
      "sources": [
        {
          "kind": "strain",
          "id": "floodgate"
        }
      ],
      "flavour": "Starts as a trickle."
    },
    {
      "id": "shade-filter",
      "name": "Shade Filter",
      "base": "tty-upgrade",
      "level": 6,
      "primary": {
        "signal": 30,
        "regen": 1
      },
      "secondary": {
        "evasion": 4
      },
      "effect": {
        "when": "always",
        "if": "even-cycle",
        "do": "stat-x2",
        "stat": "evasion"
      },
      "sources": [
        {
          "kind": "strain",
          "id": "flicker"
        }
      ],
      "flavour": "Now you see me."
    },
    {
      "id": "ransom-note",
      "name": "Ransom Note",
      "base": "weaponized-exploit",
      "level": 7,
      "primary": {
        "damage": [
          13,
          16
        ]
      },
      "secondary": {
        "crit": 4
      },
      "effect": {
        "when": "hit",
        "if": "target-winding",
        "do": "damage%",
        "value": 40
      },
      "sources": [
        {
          "kind": "strain",
          "id": "extortion"
        }
      ],
      "flavour": "Pay up, or I hit first."
    },
    {
      "id": "leech-hook",
      "name": "Leech Hook",
      "base": "weaponized-exploit",
      "level": 8,
      "primary": {
        "damage": [
          13,
          17
        ]
      },
      "secondary": {
        "leech": 2
      },
      "downside": {
        "reduction": -1
      },
      "effect": {
        "when": "crit",
        "do": "leech-x",
        "value": 3
      },
      "sources": [
        {
          "kind": "strain",
          "id": "leech"
        }
      ],
      "flavour": "Bites, holds, drinks."
    },
    {
      "id": "watchdog-whitelist",
      "name": "Watchdog Whitelist",
      "base": "socks-tunnel",
      "level": 8,
      "primary": {
        "signal": 65,
        "reduction": 2
      },
      "effect": {
        "when": "struck",
        "do": "halve",
        "limit": "fight"
      },
      "sources": [
        {
          "kind": "guard",
          "id": "watchdog"
        }
      ],
      "flavour": "Your hash, on the allow list. Don't ask how."
    },
    {
      "id": "brick-key",
      "name": "Brick Key",
      "base": "exploit-chain",
      "level": 11,
      "primary": {
        "damage": [
          20,
          25
        ]
      },
      "secondary": {
        "crit": 5
      },
      "effect": {
        "when": "hit",
        "if": "target-below-half",
        "do": "damage%",
        "value": 50
      },
      "sources": [
        {
          "kind": "strain",
          "id": "bricker"
        }
      ],
      "flavour": "Finishes what it starts."
    },
    {
      "id": "echo-chamber",
      "name": "Echo Chamber",
      "base": "dropper",
      "level": 11,
      "primary": {
        "damage": 8,
        "signal": 36
      },
      "secondary": {
        "echo": 10
      },
      "effect": {
        "when": "custom",
        "do": "echo-full"
      },
      "sources": [
        {
          "kind": "strain",
          "id": "echo"
        }
      ],
      "flavour": "Everything you say, said again."
    },
    {
      "id": "hive-mind",
      "name": "Hive Mind",
      "base": "dropper",
      "level": 12,
      "primary": {
        "damage": 8,
        "signal": 38
      },
      "secondary": {
        "payload": 3
      },
      "downside": {
        "signal": -10
      },
      "effect": {
        "when": "custom",
        "do": "dot%",
        "value": 25
      },
      "sources": [
        {
          "kind": "strain",
          "id": "overrun"
        }
      ],
      "flavour": "Many hands. One thought."
    },
    {
      "id": "cell-key",
      "name": "Cell Key",
      "base": "exploit-chain",
      "level": 13,
      "primary": {
        "damage": [
          21,
          27
        ]
      },
      "secondary": {
        "critDamage": 6
      },
      "effect": {
        "when": "start",
        "do": "force-crit"
      },
      "sources": [
        {
          "kind": "strain",
          "id": "sleeper"
        }
      ],
      "flavour": "Wakes it up the hard way."
    },
    {
      "id": "gate-bypass",
      "name": "Gate Bypass",
      "base": "vpn-cascade",
      "level": 14,
      "primary": {
        "signal": 95,
        "reduction": 3
      },
      "effect": {
        "when": "start",
        "do": "chit"
      },
      "sources": [
        {
          "kind": "guard",
          "id": "bouncer"
        }
      ],
      "flavour": "The bouncer never saw you."
    },
    {
      "id": "trace-loop",
      "name": "Trace Loop",
      "base": "root-shell",
      "level": 14,
      "primary": {
        "signal": 48,
        "regen": 2
      },
      "secondary": {
        "accuracy": 5
      },
      "effect": {
        "when": "hit",
        "do": "damage+",
        "value": 1,
        "scale": "cycles",
        "cap": 10
      },
      "sources": [
        {
          "kind": "guard",
          "id": "tracer"
        }
      ],
      "flavour": "The longer it watches, the more it learns."
    },
    {
      "id": "cold-boot",
      "name": "Cold Boot",
      "base": "root-shell",
      "level": 16,
      "primary": {
        "signal": 52,
        "regen": 2
      },
      "secondary": {
        "sanitize": 8
      },
      "effect": {
        "when": "struck",
        "if": "below-20",
        "do": "restore%",
        "value": 30,
        "limit": "run"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 2
        }
      ],
      "flavour": "Pull the plug. Start clean."
    },
    {
      "id": "shredder-routine",
      "name": "Shredder Routine",
      "base": "zero-click",
      "level": 18,
      "primary": {
        "damage": [
          29,
          36
        ]
      },
      "secondary": {
        "crit": 6
      },
      "downside": {
        "reduction": -1
      },
      "effect": {
        "when": "hit",
        "if": "target-bare",
        "do": "damage%",
        "value": 30
      },
      "sources": [
        {
          "kind": "guard",
          "id": "shredder"
        }
      ],
      "flavour": "Nothing left to recover."
    },
    {
      "id": "tollgate-token",
      "name": "TOLLGATE Token",
      "base": "implant",
      "level": 22,
      "primary": {
        "damage": 8,
        "signal": 45
      },
      "secondary": {
        "sanitize": 8
      },
      "effect": {
        "when": "custom",
        "do": "encrypt-half"
      },
      "sources": [
        {
          "kind": "contract",
          "id": "takeover",
          "crew": "ransomware"
        }
      ],
      "flavour": "Every toll paid, every lock opened."
    },
    {
      "id": "swarmline-swarm-key",
      "name": "SWARMLINE Swarm Key",
      "base": "loader",
      "level": 22,
      "primary": {
        "damage": 13,
        "signal": 55
      },
      "secondary": {
        "sync": 6
      },
      "effect": {
        "when": "custom",
        "do": "sync-wide"
      },
      "sources": [
        {
          "kind": "contract",
          "id": "takeover",
          "crew": "worm"
        }
      ],
      "flavour": "A thousand nodes keeping time."
    },
    {
      "id": "palemask",
      "name": "PALEMASK",
      "base": "restricted-shell-escape",
      "level": 22,
      "primary": {
        "signal": 70,
        "regen": 3
      },
      "secondary": {
        "evasion": 5
      },
      "effect": {
        "when": "custom",
        "do": "blind-short"
      },
      "sources": [
        {
          "kind": "contract",
          "id": "takeover",
          "crew": "ghostroot"
        }
      ],
      "flavour": "Wear the face. See what they see."
    },
    {
      "id": "lowlight-badge",
      "name": "LOWLIGHT Badge",
      "base": "implant",
      "level": 22,
      "primary": {
        "damage": 10,
        "signal": 40
      },
      "secondary": {
        "crit": 5
      },
      "effect": {
        "when": "hit",
        "do": "damage%",
        "value": 5,
        "scale": "contracts"
      },
      "sources": [
        {
          "kind": "story",
          "id": "contractor"
        }
      ],
      "flavour": "Crew first. Always."
    },
    {
      "id": "underwriters-seal",
      "name": "Underwriter's Seal",
      "base": "onion-circuit",
      "level": 24,
      "primary": {
        "signal": 150,
        "reduction": 4
      },
      "effect": {
        "when": "struck",
        "do": "crit-normal",
        "limit": "fight"
      },
      "sources": [
        {
          "kind": "store"
        }
      ],
      "flavour": "Coverage confirmed. Terms apply."
    },
    {
      "id": "glassjaw-sucker-punch",
      "name": "GLASSJAW Sucker Punch",
      "base": "zero-click",
      "level": 24,
      "primary": {
        "damage": [
          42,
          50
        ]
      },
      "downside": {
        "reduction": -2,
        "signal": -15
      },
      "sources": [
        {
          "kind": "contract",
          "id": "glassjaw"
        }
      ],
      "flavour": "Hit first. Don't stick around."
    },
    {
      "id": "black-ledger",
      "name": "Black Ledger",
      "base": "implant",
      "level": 26,
      "primary": {
        "damage": 12,
        "signal": 50
      },
      "secondary": {
        "critDamage": 6
      },
      "effect": {
        "when": "hit",
        "do": "crit%",
        "value": 3,
        "scale": "broken"
      },
      "sources": [
        {
          "kind": "story",
          "id": "ledger"
        }
      ],
      "flavour": "Fourteen months of payouts. You read it."
    },
    {
      "id": "deadmans-switch",
      "name": "Deadman's Switch",
      "base": "mixnet",
      "level": 28,
      "primary": {
        "signal": 180,
        "reduction": 5
      },
      "effect": {
        "when": "disconnect",
        "do": "jackout",
        "limit": "cooldown",
        "cooldown": 90
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 3
        }
      ],
      "flavour": "If I go down, I'm taking my bag."
    },
    {
      "id": "zero-cool",
      "name": "Zero Cool",
      "base": "wormable",
      "level": 30,
      "primary": {
        "damage": [
          46,
          56
        ]
      },
      "secondary": {
        "crit": 8
      },
      "effect": {
        "when": "break",
        "if": "crit",
        "do": "refund-skill"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 3
        }
      ],
      "flavour": "Hack the planet."
    },
    {
      "id": "ouroboros-loop",
      "name": "Ouroboros Loop",
      "base": "ghost-shell",
      "level": 32,
      "primary": {
        "signal": 90,
        "regen": 4
      },
      "secondary": {
        "clock": 12
      },
      "downside": {
        "regen": -2
      },
      "effect": {
        "when": "always",
        "if": "below-half",
        "do": "stat-x2",
        "stat": "clock"
      },
      "sources": [
        {
          "kind": "rogue",
          "id": "gauntlet",
          "layer": 3
        }
      ],
      "flavour": "The end feeds the beginning."
    },
    {
      "id": "crown-packet",
      "name": "Crown Packet",
      "base": "proof-of-concept",
      "level": 3,
      "primary": {
        "damage": [
          7,
          8
        ]
      },
      "effect": {
        "when": "hit",
        "if": "target-winding",
        "do": "damage%",
        "value": 30
      },
      "sources": [
        {
          "kind": "boss",
          "id": "relayking"
        }
      ],
      "flavour": "It still thinks it decides where everything goes."
    },
    {
      "id": "hop-limit",
      "name": "Hop Limit",
      "base": "reverse-shell",
      "level": 3,
      "primary": {
        "signal": 16,
        "regen": 0.7
      },
      "effect": {
        "when": "struck",
        "do": "restore%",
        "value": 3
      },
      "sources": [
        {
          "kind": "boss",
          "id": "relayking"
        }
      ],
      "flavour": "Every hop costs it something. Not you."
    },
    {
      "id": "squatters-rights",
      "name": "Squatter's Rights",
      "base": "open-proxy",
      "level": 4,
      "primary": {
        "signal": 32,
        "reduction": 1
      },
      "effect": {
        "when": "start",
        "do": "chit"
      },
      "sources": [
        {
          "kind": "boss",
          "id": "resident"
        }
      ],
      "flavour": "It lived here first. Now you do."
    },
    {
      "id": "eviction-notice",
      "name": "Eviction Notice",
      "base": "proof-of-concept",
      "level": 4,
      "primary": {
        "damage": [
          8,
          9
        ]
      },
      "secondary": {
        "crit": 3
      },
      "effect": {
        "when": "break",
        "do": "refund",
        "value": 1
      },
      "sources": [
        {
          "kind": "boss",
          "id": "resident"
        }
      ],
      "flavour": "Thirty days. Or thirty cycles."
    },
    {
      "id": "lien",
      "name": "Lien",
      "base": "cron-job",
      "level": 8,
      "primary": {
        "damage": 4,
        "signal": 20
      },
      "effect": {
        "when": "hit",
        "if": "target-bare",
        "do": "damage+",
        "value": 6
      },
      "sources": [
        {
          "kind": "boss",
          "id": "repoman"
        }
      ],
      "flavour": "Everything it touches already belongs to someone."
    },
    {
      "id": "repossessed-key",
      "name": "Repossessed Key",
      "base": "tty-upgrade",
      "level": 8,
      "primary": {
        "signal": 26,
        "regen": 1.2
      },
      "effect": {
        "when": "custom",
        "do": "encrypt-half"
      },
      "sources": [
        {
          "kind": "boss",
          "id": "repoman"
        }
      ],
      "flavour": "He took it back. You took it back again."
    },
    {
      "id": "choirboy",
      "name": "Choirboy",
      "base": "socks-tunnel",
      "level": 10,
      "primary": {
        "signal": 55,
        "reduction": 2
      },
      "effect": {
        "when": "custom",
        "do": "blind-short"
      },
      "sources": [
        {
          "kind": "boss",
          "id": "choir"
        }
      ],
      "flavour": "Sings on key. Never on cue."
    },
    {
      "id": "hollow-note",
      "name": "Hollow Note",
      "base": "weaponized-exploit",
      "level": 10,
      "primary": {
        "damage": [
          12,
          15
        ]
      },
      "effect": {
        "when": "hit",
        "if": "odd-cycle",
        "do": "damage%",
        "value": 30
      },
      "sources": [
        {
          "kind": "boss",
          "id": "choir"
        }
      ],
      "flavour": "Hit on the off-beat, where the echo isn't."
    }
  ]
};
