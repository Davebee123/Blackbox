// Written in the content editor (editor.html). Safe to edit by hand too: it's JSON after 'export default'.
export default {
  "uniques": [
    {
      "id": "wicks-old-toolkit",
      "name": "wick's Old Toolkit",
      "set": "lowlight",
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
        "regen": 5
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
        "regen": 10
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
        "regen": 5
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
        "payload": 2
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
        "regen": 10
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
        "regen": 10
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
        "regen": 15
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
      "set": "lowlight",
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
        "regen": 20
      },
      "secondary": {
        "clock": 12
      },
      "downside": {
        "regen": -10
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
        "regen": 3.5
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
        "regen": 6
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
    },
    {
      "id": "tracking-pixel",
      "name": "Tracking Pixel",
      "base": "one-liner",
      "level": 3,
      "lean": "phantom",
      "primary": {
        "damage": 2,
        "signal": 10
      },
      "secondary": {
        "accuracy": 3
      },
      "effect": {
        "when": "hit",
        "if": "target-tagged",
        "do": "damage%",
        "value": 25
      },
      "sources": [
        {
          "kind": "sprawl"
        },
        {
          "kind": "vault",
          "layer": 1
        }
      ],
      "flavour": "One transparent pixel. It sees everything."
    },
    {
      "id": "slow-drip",
      "name": "Slow Drip",
      "base": "proof-of-concept",
      "level": 4,
      "lean": "payload",
      "primary": {
        "damage": [
          7,
          8
        ]
      },
      "effect": {
        "when": "hit",
        "if": "target-burning",
        "do": "crit%",
        "value": 15
      },
      "sources": [
        {
          "kind": "sprawl"
        },
        {
          "kind": "rogue"
        }
      ],
      "flavour": "Nobody notices a leak until the floor gives."
    },
    {
      "id": "spearphish",
      "name": "Spearphish",
      "base": "weaponized-exploit",
      "level": 7,
      "lean": "phantom",
      "primary": {
        "damage": [
          11,
          13
        ]
      },
      "secondary": {
        "crit": 3
      },
      "effect": {
        "when": "always",
        "do": "skill-cd",
        "skill": "tag",
        "value": 1
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 2
        },
        {
          "kind": "rogue"
        }
      ],
      "flavour": "Addressed to them by name. They always open it."
    },
    {
      "id": "jackhammer",
      "name": "Jackhammer",
      "base": "weaponized-exploit",
      "level": 5,
      "lean": "demolitionist",
      "primary": {
        "damage": [
          11,
          13
        ]
      },
      "effect": {
        "when": "always",
        "do": "skill-cd",
        "skill": "flood",
        "value": 1
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 1
        },
        {
          "kind": "rogue"
        }
      ],
      "flavour": "Subtlety is a setting. It's turned off."
    },
    {
      "id": "shrapnel",
      "name": "Shrapnel",
      "base": "cron-job",
      "level": 8,
      "lean": "overclocker",
      "primary": {
        "damage": 4,
        "signal": 18
      },
      "effect": {
        "when": "break",
        "do": "heal",
        "value": 6
      },
      "sources": [
        {
          "kind": "sprawl"
        },
        {
          "kind": "rogue"
        }
      ],
      "flavour": "What's left of them patches what's left of you."
    },
    {
      "id": "uptime-sla",
      "name": "Uptime SLA",
      "base": "socks-tunnel",
      "level": 6,
      "lean": "warden",
      "primary": {
        "signal": 48,
        "reduction": 1
      },
      "effect": {
        "when": "struck",
        "if": "below-half",
        "do": "restore%",
        "value": 8,
        "limit": "fight"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 1
        },
        {
          "kind": "rogue"
        }
      ],
      "flavour": "Five nines. You are the nines."
    },
    {
      "id": "hot-patch",
      "name": "Hot Patch",
      "base": "reverse-shell",
      "level": 4,
      "lean": "sysop",
      "primary": {
        "signal": 14,
        "regen": 3
      },
      "effect": {
        "when": "always",
        "do": "skill-cd",
        "skill": "patch",
        "value": 1
      },
      "sources": [
        {
          "kind": "sprawl"
        }
      ],
      "flavour": "Applied live. Reboot is for cowards."
    },
    {
      "id": "thread-pool",
      "name": "Thread Pool",
      "base": "cron-job",
      "level": 5,
      "lean": "herder",
      "primary": {
        "damage": 3,
        "signal": 18
      },
      "effect": {
        "when": "custom",
        "do": "dot%",
        "value": 15
      },
      "sources": [
        {
          "kind": "sprawl"
        },
        {
          "kind": "vault",
          "layer": 1
        }
      ],
      "flavour": "Workers waiting. Always one more."
    },
    {
      "id": "fork-handle",
      "name": "Fork Handle",
      "base": "tty-upgrade",
      "level": 9,
      "lean": "hijacker",
      "primary": {
        "signal": 26,
        "regen": 5
      },
      "effect": {
        "when": "always",
        "do": "skill-cd",
        "skill": "botnet",
        "value": 1
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 2
        },
        {
          "kind": "rogue"
        }
      ],
      "flavour": "Four candles. Four thousand processes."
    },
    {
      "id": "foremans-lanyard",
      "name": "Foreman's Lanyard",
      "base": "socks-tunnel",
      "level": 7,
      "primary": {
        "signal": 46,
        "reduction": 1
      },
      "effect": {
        "when": "struck",
        "if": "below-half",
        "do": "halve",
        "limit": "fight"
      },
      "sources": [
        {
          "kind": "boss",
          "id": "foreman"
        }
      ],
      "flavour": "Badge in. Nobody checks the photo."
    },
    {
      "id": "overtime",
      "name": "Overtime",
      "base": "cron-job",
      "level": 7,
      "primary": {
        "damage": 4,
        "signal": 18
      },
      "effect": {
        "when": "hit",
        "do": "damage%",
        "value": 2,
        "scale": "cycles",
        "cap": 30
      },
      "sources": [
        {
          "kind": "boss",
          "id": "foreman"
        }
      ],
      "flavour": "The longer the shift, the worse it gets for them."
    },
    {
      "id": "thermal-paste",
      "name": "Thermal Paste",
      "base": "weaponized-exploit",
      "level": 8,
      "primary": {
        "damage": [
          11,
          14
        ]
      },
      "effect": {
        "when": "hit",
        "if": "target-tagged",
        "do": "crit%",
        "value": 20
      },
      "sources": [
        {
          "kind": "boss",
          "id": "heatsink"
        }
      ],
      "flavour": "A thin layer, exactly where the heat goes."
    },
    {
      "id": "fan-curve",
      "name": "Fan Curve",
      "base": "tty-upgrade",
      "level": 8,
      "primary": {
        "signal": 24,
        "regen": 6
      },
      "effect": {
        "when": "custom",
        "do": "burn-grow",
        "value": 2
      },
      "sources": [
        {
          "kind": "boss",
          "id": "heatsink"
        }
      ],
      "flavour": "Spins up when it gets hot. It always gets hot."
    },
    {
      "id": "cold-wallet",
      "name": "Cold Wallet",
      "base": "socks-tunnel",
      "level": 9,
      "primary": {
        "signal": 50,
        "reduction": 2
      },
      "effect": {
        "when": "struck",
        "do": "crit-normal"
      },
      "sources": [
        {
          "kind": "boss",
          "id": "coldwallet"
        }
      ],
      "flavour": "Offline. Unhackable. Until now."
    },
    {
      "id": "air-gap",
      "name": "Air Gap",
      "base": "tty-upgrade",
      "level": 9,
      "primary": {
        "signal": 26,
        "regen": 5
      },
      "secondary": {
        "evasion": 4
      },
      "effect": {
        "when": "start",
        "do": "chit"
      },
      "sources": [
        {
          "kind": "boss",
          "id": "coldwallet"
        }
      ],
      "flavour": "Nothing touches it. Nothing touches you."
    },
    {
      "id": "hashboard",
      "name": "Hashboard",
      "base": "cron-job",
      "level": 7,
      "primary": {
        "damage": 5,
        "signal": 16
      },
      "effect": {
        "when": "break",
        "do": "refund-skill"
      },
      "sources": [
        {
          "kind": "farm"
        }
      ],
      "flavour": "Pulled warm out of a dead rig. Still hashing."
    },
    {
      "id": "dead-pool",
      "name": "Dead Pool",
      "base": "weaponized-exploit",
      "level": 8,
      "primary": {
        "damage": [
          12,
          15
        ]
      },
      "effect": {
        "when": "hit",
        "if": "target-below-half",
        "do": "damage%",
        "value": 30
      },
      "sources": [
        {
          "kind": "farm"
        }
      ],
      "flavour": "The mining pool paid out to nobody for a year. It pays you now."
    },
    {
      "id": "tripwire",
      "name": "Tripwire",
      "base": "reverse-shell",
      "level": 6,
      "primary": {
        "signal": 18,
        "regen": 4
      },
      "secondary": {
        "evasion": 3
      },
      "effect": {
        "when": "struck",
        "do": "halve",
        "limit": "fight"
      },
      "sources": [
        {
          "kind": "invasion"
        }
      ],
      "flavour": "It goes off before they know it is there."
    },
    {
      "id": "honeynet",
      "name": "Honeynet",
      "base": "dropper",
      "level": 14,
      "primary": {
        "damage": 6,
        "signal": 28,
        "payload": 3
      },
      "secondary": {
        "crit": 4
      },
      "effect": {
        "when": "crit",
        "do": "heal",
        "value": 6
      },
      "sources": [
        {
          "kind": "invasion"
        }
      ],
      "flavour": "Every box on it is bait, and every one of them is listening."
    },
    {
      "id": "sinkhole",
      "name": "Sinkhole",
      "base": "zero-click",
      "level": 24,
      "primary": {
        "damage": [
          22,
          28
        ]
      },
      "secondary": {
        "accuracy": 4
      },
      "effect": {
        "when": "break",
        "do": "refund",
        "value": 2
      },
      "sources": [
        {
          "kind": "invasion"
        }
      ],
      "flavour": "Point their traffic at nothing and watch it fall in."
    },
    {
      "id": "rowhammer",
      "name": "Rowhammer",
      "base": "zero-click",
      "level": 18,
      "lean": "breaker",
      "primary": {
        "damage": [
          22,
          28
        ]
      },
      "secondary": {
        "crit": 3
      },
      "effect": {
        "when": "custom",
        "do": "patch-slow",
        "value": 3
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 3
        },
        {
          "kind": "rogue",
          "layer": 3
        }
      ],
      "flavour": "Hammer one row hard enough and the next one gives."
    },
    {
      "id": "ctrl-c",
      "name": "Ctrl-C",
      "base": "loader",
      "level": 20,
      "primary": {
        "damage": 9,
        "signal": 40,
        "payload": 4
      },
      "secondary": {
        "clock": 6
      },
      "effect": {
        "when": "answer",
        "do": "refund",
        "value": 2
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 3
        },
        {
          "kind": "guard",
          "id": "tracer"
        }
      ],
      "flavour": "The oldest interrupt there is."
    },
    {
      "id": "slammer",
      "name": "Slammer",
      "base": "loader",
      "level": 22,
      "lean": "payload",
      "primary": {
        "damage": 9,
        "signal": 40,
        "payload": 5.2
      },
      "effect": {
        "when": "custom",
        "do": "burn-jump"
      },
      "sources": [
        {
          "kind": "rogue",
          "layer": 3
        },
        {
          "kind": "vault",
          "layer": 3
        }
      ],
      "flavour": "376 bytes. Ten minutes. Everyone."
    },
    {
      "id": "log4shell",
      "name": "Log4Shell",
      "base": "zero-click",
      "level": 24,
      "lean": "demolitionist",
      "primary": {
        "damage": [
          22,
          28
        ]
      },
      "secondary": {
        "accuracy": 3
      },
      "effect": {
        "when": "break",
        "do": "break-hit",
        "value": 22
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 3
        },
        {
          "kind": "guard",
          "id": "shredder"
        }
      ],
      "flavour": "It was only ever meant to write a log line."
    },
    {
      "id": "spectre",
      "name": "Spectre",
      "base": "restricted-shell-escape",
      "level": 26,
      "primary": {
        "signal": 50,
        "regen": 10,
        "restore": 24
      },
      "secondary": {
        "evasion": 3
      },
      "downside": {
        "regen": -5
      },
      "effect": {
        "when": "always",
        "do": "tell-hits"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 3
        },
        {
          "kind": "rogue",
          "layer": 3
        }
      ],
      "flavour": "It read what it was never meant to, before anything checked."
    },
    {
      "id": "bulletproof-host",
      "name": "Bulletproof Host",
      "base": "mixnet",
      "level": 28,
      "lean": "bastion",
      "primary": {
        "signal": 140,
        "reduction": 4
      },
      "effect": {
        "when": "always",
        "if": "any-tell",
        "do": "stat-x2",
        "stat": "reduction"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 4
        },
        {
          "kind": "rogue",
          "layer": 3
        }
      ],
      "flavour": "Abuse reports go to a fax machine in a basement."
    },
    {
      "id": "hot-reload",
      "name": "Hot Reload",
      "base": "implant",
      "level": 30,
      "lean": "overclocker",
      "primary": {
        "damage": 8,
        "signal": 40
      },
      "secondary": {
        "crit": 4
      },
      "downside": {
        "signal": -10
      },
      "effect": {
        "when": "crit",
        "do": "refund-skill"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 4
        },
        {
          "kind": "rogue",
          "layer": 4
        }
      ],
      "flavour": "Swap the code while it runs. Nobody restarts anything."
    },
    {
      "id": "interrupt-vector",
      "name": "Interrupt Vector",
      "base": "polymorphic-engine",
      "level": 32,
      "lean": "warden",
      "primary": {
        "damage": 13,
        "signal": 55,
        "payload": 5.9
      },
      "secondary": {
        "reduction": 2
      },
      "effect": {
        "when": "answer",
        "do": "shield",
        "value": 30
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 4
        },
        {
          "kind": "guard",
          "id": "bouncer"
        }
      ],
      "flavour": "Every handler you ever wrote, pointed at one address."
    },
    {
      "id": "blue-pill",
      "name": "Blue Pill",
      "base": "ghost-shell",
      "level": 34,
      "primary": {
        "signal": 70,
        "regen": 15,
        "restore": 30
      },
      "secondary": {
        "sanitize": 8
      },
      "effect": {
        "when": "struck",
        "if": "charged",
        "do": "halve"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 4
        },
        {
          "kind": "rogue",
          "layer": 4
        }
      ],
      "flavour": "The machine runs inside something it cannot see."
    },
    {
      "id": "shellshock",
      "name": "Shellshock",
      "base": "wormable",
      "level": 38,
      "lean": "breaker",
      "primary": {
        "damage": [
          32,
          40
        ]
      },
      "downside": {
        "crit": -3
      },
      "effect": {
        "when": "hit",
        "do": "shatter"
      },
      "sources": [
        {
          "kind": "vault",
          "layer": 4
        },
        {
          "kind": "rogue",
          "layer": 4
        }
      ],
      "flavour": "Bash would run anything you put after the function."
    },
    {
      "id": "null-byte",
      "name": "Null Byte",
      "base": "weaponized-exploit",
      "level": 5,
      "primary": {
        "damage": [
          10,
          13
        ]
      },
      "secondary": {
        "crit": 3
      },
      "effect": {
        "when": "hit",
        "if": "target-open",
        "do": "damage%",
        "value": 35
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "One zero in the right place, and the string ends."
    },
    {
      "id": "canary-token",
      "name": "Canary Token",
      "base": "tty-upgrade",
      "level": 6,
      "primary": {
        "signal": 24,
        "regen": 5
      },
      "secondary": {
        "sync": 3
      },
      "effect": {
        "when": "custom",
        "do": "warn-early",
        "value": 1
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Somebody touched it. You heard."
    },
    {
      "id": "ping-of-death",
      "name": "Ping of Death",
      "base": "cron-job",
      "level": 7,
      "primary": {
        "damage": 4,
        "signal": 18
      },
      "effect": {
        "when": "answer",
        "do": "read-hit",
        "value": 10
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "One packet, far too large to be polite."
    },
    {
      "id": "lockpick",
      "name": "Lockpick",
      "base": "cron-job",
      "level": 8,
      "primary": {
        "damage": 4,
        "signal": 18
      },
      "secondary": {
        "accuracy": 3
      },
      "effect": {
        "when": "custom",
        "do": "lock-crush",
        "value": 100
      },
      "sources": [
        {
          "kind": "native",
          "tag": "ransomware"
        }
      ],
      "flavour": "Tension wrench, rake, patience."
    },
    {
      "id": "reflector",
      "name": "Reflector",
      "base": "tty-upgrade",
      "level": 9,
      "primary": {
        "signal": 26,
        "regen": 5
      },
      "effect": {
        "when": "custom",
        "do": "mimic-turn",
        "value": 50
      },
      "sources": [
        {
          "kind": "native",
          "tag": "ghostroot"
        }
      ],
      "flavour": "It wanted to copy you. It got a copy of itself."
    },
    {
      "id": "fork-reaper",
      "name": "Fork Reaper",
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
        "if": "target-fragment",
        "do": "damage%",
        "value": 60
      },
      "sources": [
        {
          "kind": "native",
          "tag": "worm"
        }
      ],
      "flavour": "kill -9 on everything with the same parent."
    },
    {
      "id": "watchlist",
      "name": "Watchlist",
      "base": "vpn-cascade",
      "level": 11,
      "primary": {
        "signal": 70,
        "reduction": 2
      },
      "effect": {
        "when": "struck",
        "if": "charged",
        "do": "restore%",
        "value": 6,
        "text": "Heals you for 6% of your max health when a tell lands on you."
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "You knew it was coming. You wrote it down."
    },
    {
      "id": "irq-line",
      "name": "IRQ Line",
      "base": "dropper",
      "level": 12,
      "primary": {
        "damage": 6,
        "signal": 28
      },
      "secondary": {
        "clock": 4
      },
      "effect": {
        "when": "always",
        "do": "skill-cd",
        "skill": "sigint",
        "value": 2
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Your interrupt, at the front of the queue."
    },
    {
      "id": "read-receipt",
      "name": "Read Receipt",
      "base": "root-shell",
      "level": 13,
      "primary": {
        "signal": 35,
        "regen": 7.5
      },
      "effect": {
        "when": "custom",
        "do": "open-long",
        "value": 1
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Seen 02:14. It knows you know."
    },
    {
      "id": "split-brain",
      "name": "Split Brain",
      "base": "exploit-chain",
      "level": 14,
      "primary": {
        "damage": [
          17,
          21
        ]
      },
      "secondary": {
        "crit": 3
      },
      "effect": {
        "when": "custom",
        "do": "no-reboot"
      },
      "sources": [
        {
          "kind": "native",
          "tag": "worm"
        }
      ],
      "flavour": "Two nodes, each sure the other one died."
    },
    {
      "id": "rootless",
      "name": "Rootless",
      "base": "implant",
      "level": 15,
      "primary": {
        "damage": 6,
        "signal": 30
      },
      "effect": {
        "when": "hit",
        "if": "moment",
        "do": "damage%",
        "value": 25
      },
      "sources": [
        {
          "kind": "native",
          "tag": "skills"
        }
      ],
      "flavour": "No uid, no gid, no hesitation."
    },
    {
      "id": "write-blocker",
      "name": "Write Blocker",
      "base": "vpn-cascade",
      "level": 16,
      "primary": {
        "signal": 75,
        "reduction": 2
      },
      "secondary": {
        "sanitize": 6
      },
      "effect": {
        "when": "custom",
        "do": "seal-proof"
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Read all you want. Nothing gets written back."
    },
    {
      "id": "policy-engine",
      "name": "Policy Engine",
      "base": "loader",
      "level": 18,
      "primary": {
        "damage": 9,
        "signal": 40,
        "payload": 3.8
      },
      "downside": {
        "crit": -3
      },
      "effect": {
        "when": "custom",
        "do": "rule-amp",
        "value": 50
      },
      "sources": [
        {
          "kind": "native",
          "tag": "rules"
        }
      ],
      "flavour": "Every rule you carry, enforced harder."
    },
    {
      "id": "quiet-wire",
      "name": "Quiet Wire",
      "base": "onion-circuit",
      "level": 20,
      "primary": {
        "signal": 100,
        "reduction": 3
      },
      "secondary": {
        "stealth": 6
      },
      "effect": {
        "when": "custom",
        "do": "quiet-trip"
      },
      "sources": [
        {
          "kind": "native",
          "tag": "ransomware"
        }
      ],
      "flavour": "Cut the red one. Nobody hears it go."
    },
    {
      "id": "static-discharge",
      "name": "Static Discharge",
      "base": "zero-click",
      "level": 21,
      "primary": {
        "damage": [
          22,
          28
        ]
      },
      "effect": {
        "when": "hit",
        "if": "target-loud",
        "do": "crit%",
        "value": 35
      },
      "sources": [
        {
          "kind": "native",
          "tag": "ransomware"
        }
      ],
      "flavour": "The louder it gets, the easier it arcs."
    },
    {
      "id": "hush-money",
      "name": "Hush Money",
      "base": "implant",
      "level": 22,
      "primary": {
        "damage": 7,
        "signal": 35
      },
      "effect": {
        "when": "custom",
        "do": "cast-short",
        "value": 2
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Paid to finish early and say nothing."
    },
    {
      "id": "brood-tap",
      "name": "Brood Tap",
      "base": "loader",
      "level": 23,
      "primary": {
        "damage": 9,
        "signal": 40,
        "payload": 4.2
      },
      "effect": {
        "when": "break",
        "if": "target-fragment",
        "do": "heal",
        "value": 5,
        "text": "Heals you for 5 when you break a fragment."
      },
      "sources": [
        {
          "kind": "native",
          "tag": "worm"
        }
      ],
      "flavour": "Every little one carries a little of what you lost."
    },
    {
      "id": "keyjam",
      "name": "Keyjam",
      "base": "zero-click",
      "level": 24,
      "primary": {
        "damage": [
          22,
          28
        ]
      },
      "secondary": {
        "accuracy": 3
      },
      "effect": {
        "when": "hit",
        "if": "target-locked",
        "do": "damage%",
        "value": 40
      },
      "sources": [
        {
          "kind": "native",
          "tag": "ransomware"
        }
      ],
      "flavour": "Jam the key in and twist until something gives."
    },
    {
      "id": "metronome",
      "name": "Metronome",
      "base": "ghost-shell",
      "level": 26,
      "primary": {
        "signal": 70,
        "regen": 15
      },
      "secondary": {
        "sync": 5
      },
      "effect": {
        "when": "hit",
        "if": "synced",
        "do": "crit%",
        "value": 30
      },
      "sources": [
        {
          "kind": "native",
          "tag": "sync"
        }
      ],
      "flavour": "Tick. Tick. Now."
    },
    {
      "id": "hold-music",
      "name": "Hold Music",
      "base": "mixnet",
      "level": 28,
      "primary": {
        "signal": 140,
        "reduction": 4
      },
      "secondary": {
        "evasion": 6
      },
      "effect": {
        "when": "always",
        "if": "any-tell",
        "do": "stat-x2",
        "stat": "evasion"
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Your call is important to us."
    },
    {
      "id": "kill-chain",
      "name": "Kill Chain",
      "base": "implant",
      "level": 30,
      "primary": {
        "damage": 8,
        "signal": 40
      },
      "effect": {
        "when": "break",
        "do": "break-open",
        "value": 1
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Recon, weaponize, deliver. Then the next one."
    },
    {
      "id": "preempt",
      "name": "Preempt",
      "base": "polymorphic-engine",
      "level": 32,
      "primary": {
        "damage": 13,
        "signal": 55,
        "payload": 5.9
      },
      "effect": {
        "when": "hit",
        "if": "target-telling",
        "do": "crit%",
        "value": 40
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "The scheduler hands you its turn."
    },
    {
      "id": "brute-force",
      "name": "Brute Force",
      "base": "wormable",
      "level": 33,
      "primary": {
        "damage": [
          32,
          40
        ]
      },
      "secondary": {
        "crit": 4
      },
      "effect": {
        "when": "hit",
        "if": "target-locked",
        "do": "shatter",
        "text": "Makes each hit on an armored part behind a Mutex lock or a Lockbox ward break 2 ◆."
      },
      "sources": [
        {
          "kind": "native",
          "tag": "ransomware"
        }
      ],
      "flavour": "Every key, in order, as fast as the lock will listen."
    },
    {
      "id": "takedown-notice",
      "name": "Takedown Notice",
      "base": "bootkit",
      "level": 34,
      "primary": {
        "damage": 12.5,
        "signal": 62
      },
      "effect": {
        "when": "break",
        "if": "target-fragment",
        "do": "refund",
        "value": 1,
        "text": "Reduces all your cooldowns by 1 cycle when you break a fragment."
      },
      "sources": [
        {
          "kind": "native",
          "tag": "worm"
        }
      ],
      "flavour": "Served to every node at once."
    },
    {
      "id": "sandman",
      "name": "Sandman",
      "base": "ring-zero-shell",
      "level": 36,
      "primary": {
        "signal": 114,
        "regen": 24.5
      },
      "downside": {
        "regen": -10
      },
      "effect": {
        "when": "custom",
        "do": "no-after"
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "It lands, and you sleep straight through it."
    },
    {
      "id": "rubber-hose",
      "name": "Rubber Hose",
      "base": "sandbox-escape",
      "level": 38,
      "primary": {
        "damage": [
          52,
          65
        ]
      },
      "downside": {
        "crit": -3
      },
      "effect": {
        "when": "hit",
        "do": "damage+",
        "value": 6,
        "scale": "reads",
        "cap": 30
      },
      "sources": [
        {
          "kind": "native",
          "tag": "tells"
        }
      ],
      "flavour": "Every secret it gave up makes the next one cheaper."
    },
    {
      "id": "mirror-maze",
      "name": "Mirror Maze",
      "base": "domain-front",
      "level": 40,
      "primary": {
        "signal": 227,
        "reduction": 6
      },
      "effect": {
        "when": "custom",
        "do": "decoy-pass",
        "value": 50
      },
      "sources": [
        {
          "kind": "native",
          "tag": "ghostroot"
        }
      ],
      "flavour": "Every mirror in here faces your way."
    },
    {
      "id": "kestrel-badge",
      "name": "Kestrel Badge",
      "set": "kestrel",
      "base": "socks-tunnel",
      "level": 7,
      "primary": {
        "signal": 46,
        "reduction": 1
      },
      "effect": {
        "when": "answer",
        "do": "shield",
        "value": 10
      },
      "sources": [
        {
          "kind": "guard",
          "id": "bouncer",
          "layer": 2
        }
      ],
      "flavour": "Door clearance. The Keyring waves it through."
    },
    {
      "id": "kestrel-token",
      "name": "Kestrel Token",
      "set": "kestrel",
      "base": "cron-job",
      "level": 7,
      "primary": {
        "damage": 4,
        "signal": 18
      },
      "effect": {
        "when": "hit",
        "if": "target-signature",
        "do": "damage%",
        "value": 15
      },
      "sources": [
        {
          "kind": "guard",
          "id": "tracer",
          "layer": 2
        }
      ],
      "flavour": "A one-time code that never quite expired."
    },
    {
      "id": "kestrel-lanyard",
      "name": "Kestrel Lanyard",
      "set": "kestrel",
      "base": "tty-upgrade",
      "level": 7,
      "primary": {
        "signal": 24,
        "regen": 5
      },
      "effect": {
        "when": "hit",
        "if": "target-bare",
        "do": "crit%",
        "value": 15
      },
      "sources": [
        {
          "kind": "guard",
          "id": "sentinel",
          "layer": 2
        }
      ],
      "flavour": "The photo is of nobody. The Sentinel never looks."
    },
    {
      "id": "seawall",
      "name": "Seawall",
      "base": "domain-front",
      "level": 39,
      "lean": "bastion",
      "primary": {
        "signal": 247,
        "reduction": 7
      },
      "secondary": {
        "reduction": 4,
        "regen": 12
      },
      "effect": {
        "when": "struck",
        "if": "blocked",
        "do": "stack",
        "stat": "reduction",
        "value": 1,
        "cap": 5,
        "text": "Adds 1 Block for the rest of the fight each time your Block reduces a hit, up to 5."
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7
        }
      ],
      "flavour": "Every wave that breaks on it leaves it a little higher."
    },
    {
      "id": "undertow",
      "name": "Undertow",
      "base": "sandbox-escape",
      "level": 39,
      "primary": {
        "damage": [
          56,
          71
        ]
      },
      "secondary": {
        "crit": 8,
        "accuracy": 8
      },
      "effect": {
        "when": "hit",
        "if": "target-attacked",
        "do": "damage%",
        "value": 10
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 7
        }
      ],
      "flavour": "It pulls hardest just after the wave goes out."
    },
    {
      "id": "drain-plug",
      "name": "Drain Plug",
      "base": "ring-zero-shell",
      "level": 39,
      "lean": "bastion",
      "primary": {
        "signal": 124,
        "regen": 27,
        "restore": 53
      },
      "secondary": {
        "signal": 48,
        "reduction": 2
      },
      "effect": {
        "when": "struck",
        "if": "big-hit",
        "over": 20,
        "do": "halve",
        "limit": "fight",
        "text": "Halves the first attack on you that would take more than 20% of your max health. Works once per fight."
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 7
        }
      ],
      "flavour": "Pull it and the worst of it goes down the drain."
    },
    {
      "id": "backwash",
      "name": "Backwash",
      "base": "living-off-the-land",
      "level": 40,
      "lean": "operator",
      "primary": {
        "damage": 23,
        "signal": 98,
        "payload": 11
      },
      "secondary": {
        "payload": 6,
        "clock": 8
      },
      "effect": {
        "when": "expire",
        "do": "helper-cd",
        "value": 1
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7
        }
      ],
      "flavour": "What flows out comes back in."
    },
    {
      "id": "siltstone",
      "name": "Siltstone",
      "base": "bootkit",
      "level": 40,
      "primary": {
        "damage": 14,
        "signal": 68
      },
      "secondary": {
        "signal": 40,
        "regen": 8
      },
      "effect": {
        "when": "always",
        "do": "stat+",
        "stat": "reduction",
        "value": 1,
        "scale": "chits"
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 7
        }
      ],
      "flavour": "Layer on layer, pressed hard."
    },
    {
      "id": "low-tide",
      "name": "Low Tide",
      "base": "domain-front",
      "level": 40,
      "lean": "infiltrator",
      "primary": {
        "signal": 250,
        "reduction": 7
      },
      "secondary": {
        "evasion": 8,
        "stealth": 16
      },
      "effect": {
        "when": "start",
        "do": "force-crit"
      },
      "sources": [
        {
          "kind": "thread",
          "floor": 7
        }
      ],
      "flavour": "Everything it hid is showing now."
    },
    {
      "id": "brine",
      "name": "Brine",
      "base": "living-off-the-land",
      "level": 40,
      "primary": {
        "damage": 23,
        "signal": 98,
        "payload": 11
      },
      "secondary": {
        "damage": 8,
        "crit": 8
      },
      "effect": {
        "when": "hit",
        "if": "target-healthiest",
        "do": "damage%",
        "value": 8
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 7
        }
      ],
      "flavour": "Salt works on whatever is still whole."
    },
    {
      "id": "sump-pump",
      "name": "Sump Pump",
      "base": "ring-zero-shell",
      "level": 41,
      "lean": "bastion",
      "primary": {
        "signal": 128,
        "regen": 27,
        "restore": 55
      },
      "secondary": {
        "regen": 16,
        "restore": 20
      },
      "effect": {
        "when": "always",
        "if": "below-half",
        "do": "heal%",
        "value": 10
      },
      "sources": [
        {
          "kind": "strain"
        }
      ],
      "flavour": "It only runs when the water is rising."
    },
    {
      "id": "floodgate",
      "name": "Floodgate",
      "base": "sandbox-escape",
      "level": 41,
      "lean": "breaker",
      "primary": {
        "damage": [
          58,
          73
        ]
      },
      "secondary": {
        "crit": 8,
        "critDamage": 24
      },
      "effect": {
        "when": "break",
        "do": "buff",
        "value": 6,
        "cycles": 3,
        "stacks": 2,
        "text": "Increases your damage by 6% for 3 cycles when you break a part. Stacks up to 2 times."
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7
        }
      ],
      "flavour": "Open one and the rest follow."
    },
    {
      "id": "brackish",
      "name": "Brackish",
      "base": "living-off-the-land",
      "level": 41,
      "lean": "infiltrator",
      "primary": {
        "damage": 24,
        "signal": 100,
        "payload": 11
      },
      "secondary": {
        "payload": 8,
        "crit": 8
      },
      "effect": {
        "when": "hit",
        "if": "target-below-half",
        "do": "burn%",
        "value": 10
      },
      "sources": [
        {
          "kind": "puzzle",
          "floor": 7
        }
      ],
      "flavour": "Half salt, half fresh, all of it corrosive."
    },
    {
      "id": "mooring",
      "name": "Mooring",
      "base": "bootkit",
      "level": 41,
      "primary": {
        "damage": 14,
        "signal": 69
      },
      "secondary": {
        "signal": 48,
        "reduction": 2
      },
      "effect": {
        "when": "struck",
        "do": "hit-cap",
        "value": 35
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 7
        }
      ],
      "flavour": "Whatever the current does, it holds."
    },
    {
      "id": "depth-gauge",
      "name": "Depth Gauge",
      "base": "ring-zero-shell",
      "level": 41,
      "primary": {
        "signal": 128,
        "regen": 27,
        "restore": 55
      },
      "secondary": {
        "restore": 16,
        "evasion": 6
      },
      "effect": {
        "when": "always",
        "if": "below-half",
        "do": "stat+",
        "stat": "regen",
        "value": 4
      },
      "sources": [
        {
          "kind": "thread",
          "floor": 7
        }
      ],
      "flavour": "The needle only moves one way down here."
    },
    {
      "id": "riptide",
      "name": "Riptide",
      "base": "covert-channel",
      "level": 42,
      "lean": "operator",
      "primary": {
        "signal": 362,
        "reduction": 10
      },
      "secondary": {
        "payload": 8,
        "clock": 8
      },
      "effect": {
        "when": "hit",
        "if": "target-jammed",
        "do": "helper%",
        "value": 8
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7,
          "planned": "GOLDEN PARACHUTE"
        }
      ],
      "flavour": "It drags anything that stops moving."
    },
    {
      "id": "pressure-hull",
      "name": "Pressure Hull",
      "base": "firmware-shell",
      "level": 42,
      "lean": "bastion",
      "primary": {
        "signal": 181,
        "regen": 39,
        "restore": 78
      },
      "secondary": {
        "reduction": 4,
        "restore": 20
      },
      "effect": {
        "when": "always",
        "if": "shielded",
        "do": "stat%",
        "stat": "reduction",
        "value": 25
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 7
        }
      ],
      "flavour": "Built for the weight of everything above it."
    },
    {
      "id": "ballast",
      "name": "Ballast",
      "base": "firmware-rootkit",
      "level": 42,
      "lean": "breaker",
      "primary": {
        "damage": 20,
        "signal": 100
      },
      "secondary": {
        "damage": 10,
        "crit": 8
      },
      "effect": {
        "when": "always",
        "if": "momentum-full",
        "do": "taken%",
        "value": 6
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 7
        }
      ],
      "flavour": "Heavy enough to keep you steady at speed."
    },
    {
      "id": "deepwater",
      "name": "Deepwater",
      "base": "hypervisor-escape",
      "level": 42,
      "primary": {
        "damage": [
          83,
          104
        ]
      },
      "secondary": {
        "crit": 10,
        "critDamage": 20
      },
      "effect": {
        "when": "hit",
        "if": "target-armored",
        "do": "crit-damage%",
        "value": 10
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 7
        }
      ],
      "flavour": "Pressure finds every seam in the armor."
    },
    {
      "id": "silt-map",
      "name": "Silt Map",
      "base": "metamorphic-engine",
      "level": 42,
      "primary": {
        "damage": 34,
        "signal": 142,
        "payload": 17
      },
      "secondary": {
        "scavenge": 16,
        "signal": 40
      },
      "effect": {
        "when": "custom",
        "do": "explore-xp%",
        "value": 10
      },
      "sources": [
        {
          "kind": "thread",
          "floor": 7
        }
      ],
      "flavour": "Every channel sounded and marked."
    },
    {
      "id": "bilge",
      "name": "Bilge",
      "base": "covert-channel",
      "level": 43,
      "lean": "infiltrator",
      "primary": {
        "signal": 367,
        "reduction": 10
      },
      "secondary": {
        "payload": 8,
        "evasion": 8
      },
      "effect": {
        "when": "custom",
        "do": "burn-sap",
        "value": 3,
        "cap": 9
      },
      "sources": [
        {
          "kind": "strain"
        }
      ],
      "flavour": "What collects at the bottom eats through slowly."
    },
    {
      "id": "anchor-chain",
      "name": "Anchor Chain",
      "base": "firmware-rootkit",
      "level": 43,
      "lean": "bastion",
      "primary": {
        "damage": 20,
        "signal": 102
      },
      "secondary": {
        "signal": 60,
        "reduction": 2
      },
      "effect": {
        "when": "struck",
        "do": "next-boost",
        "value": 10
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7
        }
      ],
      "flavour": "Every pull on it sets it deeper."
    },
    {
      "id": "wake",
      "name": "Wake",
      "base": "hypervisor-escape",
      "level": 43,
      "primary": {
        "damage": [
          84,
          106
        ]
      },
      "secondary": {
        "crit": 8,
        "accuracy": 8
      },
      "effect": {
        "when": "hit",
        "do": "damage%",
        "value": 5,
        "scale": "crew"
      },
      "sources": [
        {
          "kind": "raid"
        }
      ],
      "flavour": "Every hull behind you makes it bigger."
    },
    {
      "id": "ebb",
      "name": "Ebb",
      "base": "metamorphic-engine",
      "level": 43,
      "lean": "operator",
      "primary": {
        "damage": 35,
        "signal": 144,
        "payload": 17
      },
      "secondary": {
        "payload": 8,
        "signal": 40
      },
      "effect": {
        "when": "helper",
        "do": "helper-long",
        "value": 2,
        "limit": "fight",
        "text": "Makes your first helper each fight last 2 cycles longer."
      },
      "sources": [
        {
          "kind": "puzzle",
          "floor": 7
        }
      ],
      "flavour": "It goes out slowly, and it takes its time."
    },
    {
      "id": "flotsam",
      "name": "Flotsam",
      "base": "firmware-shell",
      "level": 43,
      "primary": {
        "signal": 184,
        "regen": 40,
        "restore": 79
      },
      "secondary": {
        "restore": 20,
        "evasion": 6
      },
      "effect": [
        {
          "when": "always",
          "do": "stat+",
          "stat": "scavenge",
          "value": 10,
          "text": "Adds 10% Scavenge and 2 Regen."
        },
        {
          "when": "always",
          "do": "stat+",
          "stat": "regen",
          "value": 2,
          "quiet": true
        }
      ],
      "sources": [
        {
          "kind": "rare",
          "floor": 7
        }
      ],
      "flavour": "Everything washes up somewhere."
    },
    {
      "id": "outfall",
      "name": "Outfall",
      "base": "hypervisor-escape",
      "level": 43,
      "primary": {
        "damage": [
          84,
          106
        ]
      },
      "secondary": {
        "crit": 8,
        "damage": 8
      },
      "effect": {
        "when": "hit",
        "if": "first-use",
        "do": "damage%",
        "value": 10,
        "text": "Increases the damage of each skill's first use in a fight by 10%."
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7,
          "planned": "GOLDEN PARACHUTE"
        }
      ],
      "flavour": "The first rush out is the strongest."
    },
    {
      "id": "pumphouse",
      "name": "Pumphouse",
      "base": "covert-channel",
      "level": 44,
      "lean": "breaker",
      "primary": {
        "signal": 373,
        "reduction": 10
      },
      "secondary": {
        "crit": 8,
        "critDamage": 20
      },
      "effect": {
        "when": "custom",
        "do": "spend%",
        "value": 5
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7,
          "planned": "GOLDEN PARACHUTE"
        }
      ],
      "flavour": "It runs on what you have built up."
    },
    {
      "id": "sounding-line",
      "name": "Sounding Line",
      "base": "firmware-rootkit",
      "level": 44,
      "lean": "infiltrator",
      "primary": {
        "damage": 21,
        "signal": 103
      },
      "secondary": {
        "crit": 8,
        "stealth": 16
      },
      "effect": [
        {
          "when": "custom",
          "do": "warn-early",
          "value": 1
        },
        {
          "when": "custom",
          "do": "unveil",
          "value": 1
        }
      ],
      "sources": [
        {
          "kind": "thread",
          "floor": 7
        }
      ],
      "flavour": "Drop it, count the knots, and know what is coming."
    },
    {
      "id": "cofferdam",
      "name": "Cofferdam",
      "base": "firmware-shell",
      "level": 44,
      "lean": "bastion",
      "primary": {
        "signal": 186,
        "regen": 40,
        "restore": 80
      },
      "secondary": {
        "reduction": 4,
        "regen": 16
      },
      "effect": {
        "when": "always",
        "if": "shielded",
        "do": "taken%",
        "value": 5
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 7
        }
      ],
      "flavour": "It keeps the water out while the work goes on."
    },
    {
      "id": "siphon-tube",
      "name": "Siphon Tube",
      "base": "metamorphic-engine",
      "level": 44,
      "primary": {
        "damage": 35,
        "signal": 146,
        "payload": 18
      },
      "secondary": {
        "leech": 4,
        "signal": 40
      },
      "effect": {
        "when": "always",
        "if": "below-half",
        "do": "stat%",
        "stat": "leech",
        "value": 50
      },
      "sources": [
        {
          "kind": "strain"
        }
      ],
      "flavour": "Start the flow and it keeps itself going."
    },
    {
      "id": "spillway",
      "name": "Spillway",
      "base": "hypervisor-escape",
      "level": 44,
      "lean": "breaker",
      "primary": {
        "damage": [
          86,
          107
        ]
      },
      "secondary": {
        "crit": 8,
        "critDamage": 24
      },
      "effect": {
        "when": "custom",
        "do": "spill",
        "value": 15
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 7
        }
      ],
      "flavour": "When it overflows, it goes somewhere."
    },
    {
      "id": "turbidity",
      "name": "Turbidity",
      "base": "covert-channel",
      "level": 44,
      "lean": "infiltrator",
      "primary": {
        "signal": 373,
        "reduction": 10
      },
      "secondary": {
        "crit": 8,
        "evasion": 8
      },
      "effect": {
        "when": "crit",
        "do": "buff",
        "stat": "stealth",
        "value": 5,
        "cycles": 2,
        "text": "Adds 5% Stealth for 2 cycles when you land a critical strike. In that time, each attack on you has that chance to come 1 cycle later."
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 7
        }
      ],
      "flavour": "Stir it up and nothing sees through."
    },
    {
      "id": "weir",
      "name": "Weir",
      "base": "firmware-rootkit",
      "level": 44,
      "lean": "operator",
      "primary": {
        "damage": 21,
        "signal": 103
      },
      "secondary": {
        "payload": 8,
        "signal": 40
      },
      "effect": {
        "when": "struck",
        "if": "helper-out",
        "do": "helper-soak",
        "limit": "fight",
        "text": "Turns the first attack on you while you have a helper out onto that helper, which expires. Works once per fight."
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 7
        }
      ],
      "flavour": "It holds the flow back, once."
    },
    {
      "id": "post-code",
      "name": "POST Code",
      "base": "hypervisor-escape",
      "level": 45,
      "primary": {
        "damage": [
          95,
          120
        ]
      },
      "secondary": {
        "crit": 12,
        "critDamage": 24
      },
      "effect": {
        "when": "start",
        "do": "first-skill-crit"
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 8
        }
      ],
      "flavour": "Every check passed. Go."
    },
    {
      "id": "bootstrap",
      "name": "Bootstrap",
      "base": "metamorphic-engine",
      "level": 45,
      "primary": {
        "damage": 39,
        "signal": 163,
        "payload": 20
      },
      "secondary": {
        "clock": 8,
        "damage": 10
      },
      "effect": {
        "when": "custom",
        "do": "first-cd",
        "value": 1
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "flash ranks"
        }
      ],
      "flavour": "It pulls itself up before anything else loads."
    },
    {
      "id": "bedframe",
      "name": "Bedframe",
      "base": "firmware-shell",
      "level": 45,
      "lean": "bastion",
      "primary": {
        "signal": 208,
        "regen": 45,
        "restore": 90
      },
      "secondary": {
        "reduction": 4,
        "regen": 16
      },
      "effect": [
        {
          "when": "always",
          "do": "max-signal%",
          "value": 12
        },
        {
          "when": "always",
          "do": "heal%",
          "value": 5
        }
      ],
      "sources": [
        {
          "kind": "vault",
          "floor": 8
        }
      ],
      "flavour": "Everything else rests on it."
    },
    {
      "id": "init-vector",
      "name": "Init Vector",
      "base": "firmware-rootkit",
      "level": 45,
      "primary": {
        "damage": 23,
        "signal": 115
      },
      "secondary": {
        "damage": 12,
        "crit": 8
      },
      "effect": {
        "when": "cycle",
        "do": "repeat",
        "value": 5,
        "share": 30
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "INIT"
        }
      ],
      "flavour": "The same seed, the same start, every time."
    },
    {
      "id": "bitrot-ward",
      "name": "Bitrot Ward",
      "base": "covert-channel",
      "level": 45,
      "lean": "bastion",
      "primary": {
        "signal": 416,
        "reduction": 12
      },
      "secondary": {
        "reduction": 4,
        "regen": 16
      },
      "effect": {
        "when": "start",
        "do": "chit"
      },
      "sources": [
        {
          "kind": "strain"
        }
      ],
      "flavour": "Old bits that refuse to flip."
    },
    {
      "id": "firmware",
      "name": "Firmware",
      "base": "firmware-rootkit",
      "level": 46,
      "primary": {
        "damage": 23,
        "signal": 117
      },
      "secondary": {
        "signal": 40,
        "regen": 8
      },
      "effect": [
        {
          "when": "hit",
          "do": "damage%",
          "value": 4
        },
        {
          "when": "always",
          "do": "max-signal%",
          "value": 4
        },
        {
          "when": "always",
          "do": "stat+",
          "stat": "clock",
          "value": 4
        }
      ],
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "flash ranks"
        }
      ],
      "flavour": "Under the operating system, over the metal."
    },
    {
      "id": "read-only",
      "name": "Read-Only",
      "base": "firmware-shell",
      "level": 46,
      "lean": "bastion",
      "primary": {
        "signal": 211,
        "regen": 46,
        "restore": 91
      },
      "secondary": {
        "reduction": 6,
        "restore": 24
      },
      "effect": {
        "when": "struck",
        "if": "to-below-half",
        "do": "taken%",
        "value": 40,
        "limit": "fight",
        "text": "Reduces the damage of the first attack that would take you below half health by 40%. Works once per fight."
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8
        }
      ],
      "flavour": "Nothing gets written here."
    },
    {
      "id": "watchdog-timer",
      "name": "Watchdog Timer",
      "base": "metamorphic-engine",
      "level": 46,
      "lean": "operator",
      "primary": {
        "damage": 40,
        "signal": 166,
        "payload": 20
      },
      "secondary": {
        "payload": 10,
        "clock": 8
      },
      "effect": {
        "when": "cycle",
        "do": "free-helper",
        "value": 6,
        "cycles": 2
      },
      "sources": [
        {
          "kind": "puzzle",
          "floor": 8
        }
      ],
      "flavour": "If nothing answers, it sends something."
    },
    {
      "id": "fuse-map",
      "name": "Fuse Map",
      "base": "hypervisor-escape",
      "level": 46,
      "lean": "breaker",
      "primary": {
        "damage": [
          97,
          121
        ]
      },
      "secondary": {
        "crit": 10,
        "critDamage": 28
      },
      "effect": [
        {
          "when": "break",
          "do": "momentum",
          "value": 1,
          "text": "Gives you 1 more Momentum and increases your damage by 5% for 2 cycles when you break a part."
        },
        {
          "when": "break",
          "do": "buff",
          "value": 5,
          "cycles": 2,
          "quiet": true
        }
      ],
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "Bedrock bosses"
        }
      ],
      "flavour": "Every fuse on the board, and which one to pull."
    },
    {
      "id": "burn-in",
      "name": "Burn-In",
      "base": "covert-channel",
      "level": 46,
      "lean": "infiltrator",
      "primary": {
        "signal": 422,
        "reduction": 12
      },
      "secondary": {
        "payload": 10,
        "crit": 8
      },
      "effect": {
        "when": "custom",
        "do": "burn-now"
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 8
        }
      ],
      "flavour": "Run it hot from the first second."
    },
    {
      "id": "bit-flip",
      "name": "Bit Flip",
      "base": "hypervisor-escape",
      "level": 47,
      "lean": "infiltrator",
      "primary": {
        "damage": [
          98,
          123
        ]
      },
      "secondary": {
        "crit": 12,
        "critDamage": 24
      },
      "effect": {
        "when": "crit",
        "do": "crit-double",
        "value": 4
      },
      "sources": [
        {
          "kind": "puzzle",
          "floor": 8
        }
      ],
      "flavour": "One bit, and everything changes."
    },
    {
      "id": "bus-fault",
      "name": "Bus Fault",
      "base": "firmware-rootkit",
      "level": 47,
      "lean": "operator",
      "primary": {
        "damage": 24,
        "signal": 118
      },
      "secondary": {
        "payload": 10,
        "signal": 48
      },
      "effect": {
        "when": "custom",
        "do": "jam-delay",
        "value": 1
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 8
        }
      ],
      "flavour": "Hold the line and nothing else can talk."
    },
    {
      "id": "brownout",
      "name": "Brownout",
      "base": "firmware-shell",
      "level": 47,
      "primary": {
        "signal": 214,
        "regen": 46,
        "restore": 92
      },
      "secondary": {
        "regen": 20,
        "reduction": 4
      },
      "effect": {
        "when": "always",
        "if": "below-25",
        "do": "taken%",
        "value": 15
      },
      "sources": [
        {
          "kind": "thread",
          "floor": 8
        }
      ],
      "flavour": "Low power, still running."
    },
    {
      "id": "golden-image",
      "name": "Golden Image",
      "base": "metamorphic-engine",
      "level": 47,
      "primary": {
        "damage": 40,
        "signal": 168,
        "payload": 20
      },
      "secondary": {
        "signal": 48,
        "payload": 8
      },
      "effect": [
        {
          "when": "always",
          "do": "stat+",
          "stat": "scavenge",
          "value": 10
        },
        {
          "when": "custom",
          "do": "cache%",
          "value": 10
        }
      ],
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "flash ranks"
        }
      ],
      "flavour": "The clean copy everything is restored from."
    },
    {
      "id": "bedrock-seal",
      "name": "Bedrock Seal",
      "base": "covert-channel",
      "level": 47,
      "lean": "bastion",
      "primary": {
        "signal": 428,
        "reduction": 12
      },
      "secondary": {
        "reduction": 4,
        "regen": 20
      },
      "effect": {
        "when": "custom",
        "do": "shield-absorb",
        "value": 15
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "INIT"
        }
      ],
      "flavour": "Sealed at the factory. Still sealed."
    },
    {
      "id": "microcode",
      "name": "Microcode",
      "base": "firmware-rootkit",
      "level": 48,
      "primary": {
        "damage": 24,
        "signal": 120
      },
      "secondary": {
        "damage": 12,
        "crit": 8
      },
      "effect": [
        {
          "when": "always",
          "do": "stat+",
          "stat": "clock",
          "value": 6
        },
        {
          "when": "custom",
          "do": "shortest-cd",
          "value": 1
        }
      ],
      "sources": [
        {
          "kind": "strain"
        }
      ],
      "flavour": "The instructions under the instructions."
    },
    {
      "id": "last-known-good",
      "name": "Last Known Good",
      "base": "metamorphic-engine",
      "level": 48,
      "primary": {
        "damage": 41,
        "signal": 170,
        "payload": 20
      },
      "secondary": {
        "signal": 60,
        "regen": 16
      },
      "effect": {
        "when": "struck",
        "if": "below-20",
        "do": "rewind",
        "value": 3,
        "cap": 30,
        "limit": "fight",
        "text": "Resets your Signal to what it was 3 cycles earlier when you fall below 20% health, healing up to 30% of your max health. Works once per fight."
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "Bedrock bosses"
        }
      ],
      "flavour": "Boot from the last version that worked."
    },
    {
      "id": "cold-iron",
      "name": "Cold Iron",
      "base": "firmware-shell",
      "level": 48,
      "lean": "bastion",
      "primary": {
        "signal": 217,
        "regen": 47,
        "restore": 94
      },
      "secondary": {
        "regen": 20,
        "restore": 24
      },
      "effect": [
        {
          "when": "always",
          "do": "stat+",
          "stat": "reduction",
          "value": 3
        },
        {
          "when": "custom",
          "do": "block-dot"
        }
      ],
      "sources": [
        {
          "kind": "vault",
          "floor": 8
        }
      ],
      "flavour": "Nothing that seeps gets past it."
    },
    {
      "id": "wire-wrap",
      "name": "Wire Wrap",
      "base": "hypervisor-escape",
      "level": 48,
      "lean": "breaker",
      "primary": {
        "damage": [
          100,
          125
        ]
      },
      "secondary": {
        "crit": 10,
        "critDamage": 28
      },
      "effect": {
        "when": "custom",
        "do": "momentum-cleave",
        "value": 40
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8
        }
      ],
      "flavour": "Every pin tied to every other pin."
    },
    {
      "id": "dead-reckoning",
      "name": "Dead Reckoning",
      "base": "covert-channel",
      "level": 48,
      "lean": "infiltrator",
      "primary": {
        "signal": 434,
        "reduction": 12
      },
      "secondary": {
        "crit": 10,
        "stealth": 20
      },
      "effect": {
        "when": "custom",
        "do": "first-pierce"
      },
      "sources": [
        {
          "kind": "thread",
          "floor": 8
        }
      ],
      "flavour": "No map, no stars, still on target."
    },
    {
      "id": "ground-plane",
      "name": "Ground Plane",
      "base": "firmware-rootkit",
      "level": 49,
      "primary": {
        "damage": 24,
        "signal": 122
      },
      "secondary": {
        "signal": 60,
        "reduction": 4
      },
      "effect": {
        "when": "struck",
        "do": "crit-normal",
        "text": "Turns every critical strike against you into a normal hit."
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 8
        }
      ],
      "flavour": "Everything drains to it, and nothing spikes."
    },
    {
      "id": "clock-tree",
      "name": "Clock Tree",
      "base": "metamorphic-engine",
      "level": 49,
      "primary": {
        "damage": 41,
        "signal": 173,
        "payload": 21
      },
      "secondary": {
        "clock": 8,
        "damage": 12
      },
      "effect": {
        "when": "cycle",
        "do": "cd-tick",
        "value": 4,
        "text": "Makes your cooldowns tick twice every 4th cycle."
      },
      "sources": [
        {
          "kind": "puzzle",
          "floor": 8
        }
      ],
      "flavour": "One edge, sent everywhere at once."
    },
    {
      "id": "quarry",
      "name": "Quarry",
      "base": "hypervisor-escape",
      "level": 49,
      "primary": {
        "damage": [
          101,
          127
        ]
      },
      "secondary": {
        "crit": 10,
        "damage": 16
      },
      "effect": {
        "when": "hit",
        "if": "target-last",
        "do": "damage%",
        "value": 15
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "Bedrock bosses"
        }
      ],
      "flavour": "Dig until there is nothing left."
    },
    {
      "id": "strata",
      "name": "Strata",
      "base": "firmware-shell",
      "level": 49,
      "lean": "bastion",
      "primary": {
        "signal": 220,
        "regen": 47,
        "restore": 95
      },
      "secondary": {
        "reduction": 6,
        "regen": 20
      },
      "effect": {
        "when": "always",
        "do": "taken%",
        "value": 2,
        "scale": "missing",
        "cap": 10
      },
      "sources": [
        {
          "kind": "vault",
          "floor": 8
        }
      ],
      "flavour": "Pressed flat by everything above it."
    },
    {
      "id": "load-order",
      "name": "Load Order",
      "base": "metamorphic-engine",
      "level": 49,
      "lean": "operator",
      "primary": {
        "damage": 41,
        "signal": 173,
        "payload": 21
      },
      "secondary": {
        "payload": 12,
        "clock": 8
      },
      "effect": {
        "when": "helper",
        "do": "helper-now"
      },
      "sources": [
        {
          "kind": "strain"
        }
      ],
      "flavour": "First in line, every time."
    },
    {
      "id": "undervolt",
      "name": "Undervolt",
      "base": "covert-channel",
      "level": 49,
      "lean": "breaker",
      "primary": {
        "signal": 440,
        "reduction": 12
      },
      "secondary": {
        "crit": 10,
        "critDamage": 28
      },
      "effect": {
        "when": "custom",
        "do": "momentum-safe"
      },
      "sources": [
        {
          "kind": "rare",
          "floor": 8
        }
      ],
      "flavour": "Less power, same speed, no heat."
    },
    {
      "id": "keystone",
      "name": "Keystone",
      "base": "firmware-rootkit",
      "level": 50,
      "primary": {
        "damage": 25,
        "signal": 123
      },
      "secondary": {
        "damage": 12,
        "signal": 48
      },
      "effect": {
        "when": "hit",
        "do": "damage%",
        "value": 3,
        "scale": "sets"
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "INIT"
        }
      ],
      "flavour": "Pull it and the arch comes down."
    },
    {
      "id": "signal-floor",
      "name": "Signal Floor",
      "base": "covert-channel",
      "level": 50,
      "primary": {
        "signal": 446,
        "reduction": 12
      },
      "secondary": {
        "regen": 20,
        "reduction": 4
      },
      "effect": {
        "when": "always",
        "if": "below-25",
        "do": "stat%",
        "stat": "regen",
        "value": 100,
        "text": "Doubles your Regen while you are below 25% health."
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "flash ranks"
        }
      ],
      "flavour": "It never drops under this."
    },
    {
      "id": "cold-boot-bedrock",
      "name": "Cold Boot",
      "base": "firmware-shell",
      "level": 50,
      "lean": "bastion",
      "primary": {
        "signal": 223,
        "regen": 48,
        "restore": 96
      },
      "secondary": {
        "reduction": 6,
        "restore": 24
      },
      "effect": {
        "when": "start",
        "do": "shield%",
        "value": 15
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "Bedrock bosses"
        }
      ],
      "flavour": "Cut the power, and it is the first thing back."
    },
    {
      "id": "root-of-trust",
      "name": "Root of Trust",
      "base": "hypervisor-escape",
      "level": 50,
      "primary": {
        "damage": [
          102,
          128
        ]
      },
      "secondary": {
        "crit": 12,
        "critDamage": 24
      },
      "effect": {
        "when": "crit",
        "do": "restore%",
        "value": 2
      },
      "sources": [
        {
          "kind": "lair",
          "floor": 8,
          "planned": "INIT"
        }
      ],
      "flavour": "Everything above it is only as sound as this."
    }
  ]
};
