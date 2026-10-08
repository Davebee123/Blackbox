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
        "regen": 0.6
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
        "regen": 1
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
        "regen": 1.2
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
        "regen": 1
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
        "regen": 0.8
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
        "payload": 20
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
        "payload": 24
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
        "payload": 30
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
        "regen": 2,
        "restore": 24
      },
      "secondary": {
        "evasion": 3
      },
      "downside": {
        "regen": -1
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
        "payload": 30
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
        "regen": 3,
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
        "regen": 1
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
        "regen": 1
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
        "text": "When a tell lands on you: restore 6% of your health."
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
        "regen": 1.5
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
        "payload": 24
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
        "payload": 24
      },
      "effect": {
        "when": "break",
        "if": "target-fragment",
        "do": "heal",
        "value": 5,
        "text": "When you break a fragment: heal 5."
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
        "regen": 3
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
        "payload": 30
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
        "text": "On a part behind a Mutex lock or a Lockbox ward, a hit that meets ◆ breaks two of them."
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
        "text": "When you break a fragment: your cooldowns drop by 1."
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
        "regen": 4.9
      },
      "downside": {
        "regen": -2
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
    }
  ]
};
