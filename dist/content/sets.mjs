// Sets (docs/genome.md 9): written by hand for now. Safe to edit: it's JSON after 'export default'.
// A piece is a unique in content/items.mjs carrying "set": <id>; its set lists its pieces in order. A bonus opens at its
// piece count (2, 3, 4) and is one line of text plus the effect blocks the fight engine runs (combat.mjs uniqueFx). Only
// one 4-piece bonus is active at a time (sets.mjs activeSets: the set that reached four first keeps it). A class set
// carries its class ("cls") and its tier ("tier": 50): the end-game tier sets, every piece level 50.
export default {
  "sets": [
    {
      "id": "wrecking",
      "name": "Wrecking Crew",
      "cls": "breaker",
      "tier": 50,
      "levels": [
        50,
        50
      ],
      "pieces": [
        "crowbar",
        "det-cord",
        "hard-hat",
        "blast-map"
      ],
      "bonuses": {
        "2": {
          "text": "+8% damage while you hold Momentum.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 8,
              "if": "momentum"
            }
          ]
        },
        "3": {
          "text": "Breaking a part while you hold Momentum gives +10% damage for 2 cycles.",
          "fx": [
            {
              "when": "custom",
              "do": "break-rush",
              "value": 10,
              "cycles": 2,
              "if": "momentum"
            }
          ]
        },
        "4": {
          "text": "When you break a part, your next damaging skill also hits the part beside it for 50%.",
          "fx": [
            {
              "when": "custom",
              "do": "break-splash",
              "value": 50
            }
          ],
          "subs": {
            "demolitionist": {
              "text": "Overkill spills 40 more.",
              "fx": [
                {
                  "when": "custom",
                  "do": "spill+",
                  "value": 40
                }
              ]
            },
            "overclocker": {
              "text": "You gain 2 Momentum.",
              "fx": [
                {
                  "when": "custom",
                  "do": "break-momentum",
                  "value": 2
                }
              ]
            }
          }
        }
      },
      "why": "Chain breaks as a Breaker."
    },
    {
      "id": "strongbox",
      "name": "Strongbox",
      "cls": "bastion",
      "tier": 50,
      "levels": [
        50,
        50
      ],
      "pieces": [
        "drill",
        "combination",
        "vault-door",
        "tumbler"
      ],
      "bonuses": {
        "2": {
          "text": "+8% max Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "Shields you raise are 15% larger.",
          "fx": [
            {
              "when": "custom",
              "do": "shield+%",
              "value": 15
            }
          ]
        },
        "4": {
          "text": "A hit for more than 15% of your max Integrity marks its part, which takes 10% more from you for 3 cycles. You heal 3% of max.",
          "fx": [
            {
              "when": "custom",
              "do": "big-mark",
              "value": 10,
              "over": 15,
              "cycles": 3,
              "heal": 3
            }
          ],
          "subs": {
            "warden": {
              "text": "The marked part's next attack comes a cycle later.",
              "fx": [
                {
                  "when": "custom",
                  "do": "mark-late",
                  "value": 1
                }
              ]
            },
            "sysop": {
              "text": "The heal is doubled.",
              "fx": [
                {
                  "when": "custom",
                  "do": "mark-heal",
                  "value": 2
                }
              ]
            }
          }
        }
      },
      "why": "Take the biggest hits as a Bastion."
    },
    {
      "id": "palemask",
      "name": "Palemask",
      "cls": "infiltrator",
      "tier": 50,
      "levels": [
        50,
        50
      ],
      "pieces": [
        "exit",
        "veil",
        "pillow",
        "mask"
      ],
      "bonuses": {
        "2": {
          "text": "+10% crit. Your burns deal 10% more.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "crit",
              "value": 10
            },
            {
              "when": "custom",
              "do": "burn+%",
              "value": 10
            }
          ]
        },
        "3": {
          "text": "Your first hit on each part deals 25% more.",
          "fx": [
            {
              "when": "custom",
              "do": "first-hit%",
              "value": 25
            }
          ]
        },
        "4": {
          "text": "When a part drops below half, your next hit on it crits.",
          "fx": [
            {
              "when": "custom",
              "do": "half-crit"
            }
          ],
          "subs": {
            "phantom": {
              "text": "Weak Spot resets on that part.",
              "fx": [
                {
                  "when": "custom",
                  "do": "half-weak"
                }
              ]
            },
            "payload": {
              "text": "Your burns on it tick 30% harder.",
              "fx": [
                {
                  "when": "custom",
                  "do": "half-burn",
                  "value": 30
                }
              ]
            }
          }
        }
      },
      "why": "Finish off parts below half as an Infiltrator."
    },
    {
      "id": "load-balanced",
      "name": "Load Balanced",
      "cls": "operator",
      "tier": 50,
      "levels": [
        50,
        50
      ],
      "pieces": [
        "cron",
        "relay",
        "parasite",
        "core"
      ],
      "bonuses": {
        "2": {
          "text": "Your helpers deal 10% more.",
          "fx": [
            {
              "when": "custom",
              "do": "helper+%",
              "value": 10
            }
          ]
        },
        "3": {
          "text": "Your helpers last 1 cycle longer.",
          "fx": [
            {
              "when": "custom",
              "do": "dot-long",
              "value": 1,
              "of": "helper"
            }
          ]
        },
        "4": {
          "text": "Every third helper you call arrives as two.",
          "fx": [
            {
              "when": "custom",
              "do": "helper-twin",
              "value": 3
            }
          ],
          "subs": {
            "herder": {
              "text": "Last Gasp strikes deal 25% more.",
              "fx": [
                {
                  "when": "custom",
                  "do": "gasp%",
                  "value": 25
                }
              ]
            },
            "hijacker": {
              "text": "The extra helper plants a foothold.",
              "fx": [
                {
                  "when": "custom",
                  "do": "twin-foothold"
                }
              ]
            }
          }
        }
      },
      "why": "Keep helpers out as an Operator."
    },
    {
      "id": "lowlight",
      "name": "LOWLIGHT Kit",
      "pieces": [
        "wicks-old-toolkit",
        "lowlight-badge"
      ],
      "bonuses": {
        "2": {
          "text": "Delivering a contract fills your Integrity, and your next kill pays 25% more XP.",
          "fx": [
            {
              "when": "deliver",
              "do": "fill-signal"
            },
            {
              "when": "deliver",
              "do": "kill-xp",
              "value": 25
            }
          ]
        }
      },
      "levels": [
        1,
        22
      ],
      "why": "Hold wick's contracts while you level."
    },
    {
      "id": "bootdisk",
      "name": "Boot Disk",
      "levels": [
        1,
        8
      ],
      "pieces": [
        "floppy",
        "boot-sector"
      ],
      "bonuses": {
        "2": {
          "text": "+6% max Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 6
            }
          ]
        }
      },
      "why": "Wear it on your first servers."
    },
    {
      "id": "hivemind",
      "name": "Hive Mind",
      "levels": [
        5,
        16
      ],
      "pieces": [
        "seed",
        "swarm",
        "carapace",
        "queen"
      ],
      "bonuses": {
        "2": {
          "text": "Burns and helpers deal 8% more.",
          "fx": [
            {
              "when": "custom",
              "do": "dot%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "Burns and helpers last 1 cycle longer.",
          "fx": [
            {
              "when": "custom",
              "do": "dot-long",
              "value": 1,
              "of": "both"
            }
          ]
        },
        "4": {
          "text": "Parts under your burns or helpers take 8% more from all your damage.",
          "fx": [
            {
              "when": "custom",
              "do": "under%",
              "value": 8
            }
          ]
        }
      },
      "why": "Level a burn or helper build."
    },
    {
      "id": "kestrel",
      "name": "Kestrel Clearance",
      "author": "kestrel",
      "levels": [
        7,
        50
      ],
      "pieces": [
        "kestrel-badge",
        "kestrel-token",
        "kestrel-lanyard"
      ],
      "bonuses": {
        "2": {
          "text": "+8% max Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "Once a fight, a hit that would take more than 30% of your max Integrity deals 30% instead.",
          "fx": [
            {
              "when": "custom",
              "do": "big-hit-cap",
              "value": 30
            }
          ]
        }
      },
      "why": "Answer tells, and survive the one big hit."
    },
    {
      "id": "nightshift",
      "name": "Night Shift",
      "levels": [
        7,
        14
      ],
      "pieces": [
        "timecard",
        "night-light",
        "thermos"
      ],
      "bonuses": {
        "2": {
          "text": "+2 Regen while you haven't rested this visit.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "regen",
              "value": 2,
              "if": "unrested"
            }
          ]
        },
        "3": {
          "text": "Resting at home refills Integrity 50% faster.",
          "fx": [
            {
              "when": "custom",
              "do": "rest-fast",
              "value": 50
            }
          ]
        }
      },
      "why": "Chain fights without resting."
    },
    {
      "id": "choirbook",
      "name": "Choirbook",
      "levels": [
        10,
        20
      ],
      "pieces": [
        "psalter",
        "mirror",
        "keys"
      ],
      "bonuses": {
        "2": {
          "text": "Answering a tell shields you for 5% of max Integrity.",
          "fx": [
            {
              "when": "answer",
              "do": "shield%",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "Jams and delays you apply last 1 cycle longer.",
          "fx": [
            {
              "when": "custom",
              "do": "jam-long",
              "value": 1
            }
          ]
        }
      },
      "why": "Jam and delay as a Hijacker or Warden."
    },
    {
      "id": "patchwork",
      "name": "Patchwork",
      "levels": [
        10,
        18
      ],
      "pieces": [
        "stitch",
        "darn",
        "hem",
        "seam"
      ],
      "bonuses": {
        "2": {
          "text": "+3% damage, +3% max Integrity.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 3
            },
            {
              "when": "always",
              "do": "signal%",
              "value": 3
            }
          ]
        },
        "3": {
          "text": "+5% Clock Speed.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 5
            }
          ]
        },
        "4": {
          "text": "Each different skill you use in a fight adds +2% damage, up to +12%.",
          "fx": [
            {
              "when": "custom",
              "do": "skills%",
              "value": 2,
              "cap": 12
            }
          ]
        }
      },
      "why": "Use every key on your bar."
    },
    {
      "id": "lantern",
      "name": "Lantern Route",
      "levels": [
        12,
        50
      ],
      "pieces": [
        "shortwave",
        "logbook",
        "antenna"
      ],
      "bonuses": {
        "2": {
          "text": "+10% Scavenge.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "scavenge",
              "value": 10
            }
          ]
        },
        "3": {
          "text": "Caches and vaults pay 25% more credits.",
          "fx": [
            {
              "when": "custom",
              "do": "credits%",
              "value": 25,
              "of": [
                "cache",
                "vault"
              ]
            }
          ]
        }
      },
      "why": "Farm caches and vaults for credits."
    },
    {
      "id": "glassceiling",
      "name": "Glass Ceiling",
      "levels": [
        14,
        26
      ],
      "pieces": [
        "rotor",
        "quorum",
        "ledger",
        "parachute"
      ],
      "bonuses": {
        "2": {
          "text": "+6% damage.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 6
            }
          ]
        },
        "3": {
          "text": "+10% damage while below half Integrity.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 10,
              "if": "below-half"
            }
          ]
        },
        "4": {
          "text": "+10% Clock Speed while below half. Once a fight, dropping below 25% heals 10% of max.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 10,
              "if": "below-half"
            },
            {
              "when": "custom",
              "do": "low-heal",
              "value": 10,
              "at": 25
            }
          ]
        }
      },
      "why": "Fight below half Integrity."
    },
    {
      "id": "oncall",
      "name": "On-Call",
      "levels": [
        18,
        30
      ],
      "pieces": [
        "pager",
        "runbook",
        "failover"
      ],
      "bonuses": {
        "2": {
          "text": "+10% Restore.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "restore",
              "value": 10
            }
          ]
        },
        "3": {
          "text": "Healing past full becomes a shield, up to 10% of max Integrity.",
          "fx": [
            {
              "when": "custom",
              "do": "overheal",
              "value": 10
            }
          ]
        }
      },
      "why": "Heal through long fights as a Sysop."
    },
    {
      "id": "coldstorage",
      "name": "Cold Storage",
      "levels": [
        19,
        26
      ],
      "pieces": [
        "freezer",
        "cold-cache",
        "frost-line"
      ],
      "bonuses": {
        "2": {
          "text": "+2 Block above 75% Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "reduction",
              "value": 2,
              "if": "above-75"
            }
          ]
        },
        "3": {
          "text": "Above 75% Integrity, you take 8% less damage.",
          "fx": [
            {
              "when": "custom",
              "do": "taken-cut%",
              "value": 8,
              "if": "above-75"
            }
          ]
        }
      },
      "why": "Stay above 75% Integrity."
    },
    {
      "id": "overtime",
      "name": "Overtime",
      "levels": [
        22,
        30
      ],
      "pieces": [
        "punch-card",
        "time-clock",
        "late-pass",
        "coffee-run"
      ],
      "bonuses": {
        "2": {
          "text": "+5% Clock Speed.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "From a fight's 6th cycle, +10% damage.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 10,
              "if": "late"
            }
          ]
        },
        "4": {
          "text": "From the 6th cycle, cooldowns tick an extra cycle every other cycle.",
          "fx": [
            {
              "when": "custom",
              "do": "late-tick",
              "value": 1,
              "if": "late"
            }
          ]
        }
      },
      "why": "Outlast long fights: elites and bosses."
    },
    {
      "id": "burstbuffer",
      "name": "Burst Buffer",
      "levels": [
        25,
        32
      ],
      "pieces": [
        "cache-line",
        "prefetch",
        "flush"
      ],
      "bonuses": {
        "2": {
          "text": "Critical strikes deal 8% more.",
          "fx": [
            {
              "when": "custom",
              "do": "crit-more%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "Your first two skills each fight deal 20% more.",
          "fx": [
            {
              "when": "custom",
              "do": "opener%",
              "value": 20,
              "n": 2
            }
          ]
        }
      },
      "why": "Open every fight with crits."
    },
    {
      "id": "hotspare",
      "name": "Hot Spare",
      "levels": [
        28,
        36
      ],
      "pieces": [
        "standby",
        "failback"
      ],
      "bonuses": {
        "2": {
          "text": "The first time a fight drops you below 30% Integrity, heal 25% of max and deal 15% more for 3 cycles.",
          "fx": [
            {
              "when": "custom",
              "do": "comeback",
              "value": 25,
              "at": 30,
              "more": 15,
              "cycles": 3
            }
          ]
        }
      },
      "why": "Recover the first time you drop low."
    },
    {
      "id": "mesh",
      "name": "Mesh",
      "levels": [
        31,
        38
      ],
      "pieces": [
        "node",
        "link",
        "hub"
      ],
      "bonuses": {
        "2": {
          "text": "+5% damage and healing per crewmate in the fight, up to 3.",
          "fx": [
            {
              "when": "custom",
              "do": "crew%",
              "value": 5,
              "cap": 3
            }
          ]
        },
        "3": {
          "text": "Heals and shields you put on a crewmate also land on you at 25%.",
          "fx": [
            {
              "when": "custom",
              "do": "crew-share",
              "value": 25
            }
          ]
        }
      },
      "why": "Play in a crew."
    },
    {
      "id": "deeparchive",
      "name": "Deep Archive",
      "levels": [
        37,
        44
      ],
      "pieces": [
        "index",
        "spine",
        "folio",
        "vellum"
      ],
      "bonuses": {
        "2": {
          "text": "+8% max Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "+8% damage.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 8
            }
          ]
        },
        "4": {
          "text": "Every 4th cycle, your next skill repeats at 40%.",
          "fx": [
            {
              "when": "custom",
              "do": "repeat-every",
              "value": 40,
              "every": 4
            }
          ]
        }
      },
      "why": "Save your biggest skill for every 4th cycle."
    },
    {
      "id": "switchback",
      "name": "Switchback",
      "levels": [
        8,
        14
      ],
      "pieces": [
        "dead-end",
        "one-way",
        "turnout"
      ],
      "bonuses": {
        "2": {
          "text": "+5% Stealth.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "stealth",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "On the cycle after one of your delays lands, your hits deal 15% more.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 15,
              "if": "after-delay"
            }
          ]
        }
      },
      "why": "Strike on the cycle after a delay lands."
    },
    {
      "id": "coldstart",
      "name": "Cold Start",
      "levels": [
        19,
        26
      ],
      "pieces": [
        "ice-pick",
        "rime",
        "thaw"
      ],
      "bonuses": {
        "2": {
          "text": "+8% damage to a part that hasn't attacked yet this fight.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 8,
              "if": "target-unacted"
            }
          ]
        },
        "3": {
          "text": "The first attack of each fight comes a cycle later.",
          "fx": [
            {
              "when": "start",
              "do": "start-late",
              "value": 1
            }
          ]
        }
      },
      "why": "Win before the parts get going."
    },
    {
      "id": "bootloader",
      "name": "Bootloader",
      "levels": [
        31,
        38
      ],
      "pieces": [
        "grub",
        "chainload",
        "post"
      ],
      "bonuses": {
        "2": {
          "text": "+15% Clock Speed.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 15
            }
          ]
        },
        "3": {
          "text": "Cooldowns start each fight 2 cycles shorter.",
          "fx": [
            {
              "when": "custom",
              "do": "cd-start",
              "value": 2
            }
          ]
        }
      },
      "why": "Fire your whole bar early in a fight."
    },
    {
      "id": "atoll",
      "name": "Atoll",
      "levels": [
        43,
        50
      ],
      "pieces": [
        "lagoon",
        "reef",
        "causeway"
      ],
      "bonuses": {
        "2": {
          "text": "+6% max Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 6
            }
          ]
        },
        "3": {
          "text": "While one part is left, you take 40% less damage.",
          "fx": [
            {
              "when": "custom",
              "if": "one-left",
              "do": "taken-cut%",
              "value": 40
            }
          ]
        }
      },
      "why": "Close out the last part."
    },
    {
      "id": "fullcoverage",
      "name": "Full Coverage",
      "levels": [
        25,
        38
      ],
      "pieces": [
        "plumb-line",
        "field-book",
        "hi-vis",
        "datum"
      ],
      "bonuses": {
        "2": {
          "text": "+2 Regen.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "regen",
              "value": 2
            }
          ]
        },
        "3": {
          "text": "A room's first clear pays 25% of a kill's XP.",
          "fx": [
            {
              "when": "custom",
              "do": "clear-xp",
              "value": 25
            }
          ]
        },
        "4": {
          "text": "Your first fight in each room starts with a ◆, and you deal 10% more damage.",
          "fx": [
            {
              "when": "start",
              "do": "chit",
              "value": 1,
              "if": "room-new"
            },
            {
              "when": "hit",
              "do": "dmg%",
              "value": 10
            }
          ]
        }
      },
      "why": "Explore rooms you haven't cleared."
    },
    {
      "id": "longhaul",
      "name": "Long Haul",
      "levels": [
        10,
        24
      ],
      "pieces": [
        "waybill",
        "dray",
        "tailgate"
      ],
      "bonuses": {
        "2": {
          "text": "Contracts pay 10% more XP.",
          "fx": [
            {
              "when": "custom",
              "do": "contract-xp%",
              "value": 10
            }
          ]
        },
        "3": {
          "text": "Kills pay 10% more XP.",
          "fx": [
            {
              "when": "custom",
              "do": "kill-xp%",
              "value": 10
            }
          ]
        }
      },
      "why": "Level fast on contracts."
    },
    {
      "id": "tenure",
      "name": "Tenure",
      "levels": [
        33,
        48
      ],
      "pieces": [
        "freehold",
        "deed",
        "sitting-tenant"
      ],
      "bonuses": {
        "2": {
          "text": "+8% max Integrity on a server you hold.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 8,
              "if": "server-held"
            }
          ]
        },
        "3": {
          "text": "Kills on a server you hold roll for an item twice.",
          "fx": [
            {
              "when": "custom",
              "do": "held-roll",
              "value": 1
            }
          ]
        }
      },
      "why": "Fight on servers you hold."
    },
    {
      "id": "bedrock",
      "name": "Bedrock",
      "levels": [
        43,
        50
      ],
      "pieces": [
        "bedrock-plate",
        "core-sample",
        "pick",
        "survey"
      ],
      "bonuses": {
        "2": {
          "text": "+5% damage, +5% max Integrity.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 5
            },
            {
              "when": "always",
              "do": "signal%",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "+10% Clock Speed. +12 Block while you are below half Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 10
            },
            {
              "when": "always",
              "if": "below-half",
              "do": "stat",
              "stat": "reduction",
              "value": 12
            }
          ]
        },
        "4": {
          "text": "Once a fight, a hit that would drop you to 0 leaves you at 1 and shields you for 30% of max.",
          "fx": [
            {
              "when": "custom",
              "do": "last-stand",
              "value": 30
            }
          ]
        }
      },
      "why": "Survive the hit that would end you."
    },
    {
      "id": "catchment",
      "name": "Catchment",
      "levels": [
        37,
        44
      ],
      "pieces": [
        "gully",
        "storm-drain",
        "basin",
        "reservoir"
      ],
      "bonuses": {
        "2": {
          "text": "+5% damage, +5% max Integrity.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 5
            },
            {
              "when": "always",
              "do": "signal%",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "Breaking a part heals you for 4% of your max Integrity.",
          "fx": [
            {
              "when": "break",
              "do": "break-heal%",
              "value": 4
            }
          ]
        },
        "4": {
          "text": "Each part you break adds 6% damage for the fight, up to 24%.",
          "fx": [
            {
              "when": "break",
              "do": "buff",
              "value": 6,
              "cycles": 99,
              "stacks": 4
            }
          ]
        }
      },
      "why": "Break part after part in big viruses."
    },
    {
      "id": "fineprint",
      "name": "Fine Print",
      "levels": [
        26,
        32
      ],
      "pieces": [
        "rider",
        "copay",
        "exclusion",
        "premium"
      ],
      "bonuses": {
        "2": {
          "text": "+8% max Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "A tell that lands on you shields you for 5% of your max Integrity.",
          "fx": [
            {
              "when": "custom",
              "do": "tell-shield",
              "value": 5
            }
          ]
        },
        "4": {
          "text": "While a shield holds, your hits deal 10% more.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 10,
              "if": "shielded"
            }
          ]
        }
      },
      "why": "Tank the tells you can't answer, as a Bastion."
    },
    {
      "id": "contiguous",
      "name": "Contiguous",
      "levels": [
        27,
        31
      ],
      "pieces": [
        "sector",
        "cluster",
        "allocation-table"
      ],
      "bonuses": {
        "2": {
          "text": "+5% Clock Speed.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "Each command in a row on the same part deals 6% more than the last, up to 18%.",
          "fx": [
            {
              "when": "custom",
              "do": "row%",
              "value": 6,
              "cap": 18
            }
          ]
        }
      },
      "why": "Focus one part until it breaks, as a Phantom."
    },
    {
      "id": "crypter",
      "name": "Crypter",
      "levels": [
        26,
        31
      ],
      "pieces": [
        "stub",
        "junk-code",
        "decryptor"
      ],
      "bonuses": {
        "2": {
          "text": "+5% crit.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "crit",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "When you break a part's last ◆, your next hit on another part is a critical strike.",
          "fx": [
            {
              "when": "custom",
              "do": "strip-crit"
            }
          ]
        }
      },
      "why": "Strip ◆, then crit, as a Phantom."
    },
    {
      "id": "domainadmin",
      "name": "Domain Admin",
      "levels": [
        32,
        37
      ],
      "pieces": [
        "ticket",
        "group-policy",
        "schema",
        "admin-rights"
      ],
      "bonuses": {
        "2": {
          "text": "+10% damage to a part with no ◆, +5% max Integrity.",
          "fx": [
            {
              "when": "hit",
              "if": "target-bare",
              "do": "dmg%",
              "value": 10
            },
            {
              "when": "always",
              "do": "signal%",
              "value": 5
            }
          ]
        },
        "3": {
          "text": "When you strip a part's last ◆, your shortest cooldown drops by 2.",
          "fx": [
            {
              "when": "custom",
              "do": "strip-cd",
              "value": 2
            }
          ]
        },
        "4": {
          "text": "From the second part you break in a fight, your cooldowns are 1 cycle shorter.",
          "fx": [
            {
              "when": "custom",
              "do": "late-cd",
              "value": 1,
              "n": 2
            }
          ]
        }
      },
      "why": "Break parts to shorten your cooldowns as an Operator."
    },
    {
      "id": "semaphore",
      "name": "Semaphore",
      "levels": [
        33,
        37
      ],
      "pieces": [
        "spinlock",
        "semaphore",
        "critical-section"
      ],
      "bonuses": {
        "2": {
          "text": "+10% Clock Speed.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 10
            }
          ]
        },
        "3": {
          "text": "An attack you delay leaves its part Open for 2 cycles.",
          "fx": [
            {
              "when": "custom",
              "do": "delay-open",
              "value": 2
            }
          ]
        }
      },
      "why": "Delay attacks, then punish the Open part."
    },
    {
      "id": "hiddenprocess",
      "name": "Hidden Process",
      "levels": [
        32,
        36
      ],
      "pieces": [
        "unlink",
        "hollow",
        "driver"
      ],
      "bonuses": {
        "2": {
          "text": "Your burns deal 20% more.",
          "fx": [
            {
              "when": "custom",
              "do": "burn+%",
              "value": 20
            }
          ]
        },
        "3": {
          "text": "Your burns keep ticking on a part that can't be hit.",
          "fx": [
            {
              "when": "custom",
              "do": "burn-through"
            }
          ]
        }
      },
      "why": "Burn the parts you can't hit, as a Payload."
    },
    {
      "id": "watertight",
      "name": "Watertight",
      "levels": [
        34,
        38
      ],
      "pieces": [
        "hatch",
        "seal-plate",
        "pressure-door"
      ],
      "bonuses": {
        "2": {
          "text": "+6 Block.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "reduction",
              "value": 6
            }
          ]
        },
        "3": {
          "text": "When a hit takes more than 15% of your max Integrity, the next hit on you within 2 cycles deals 30% less.",
          "fx": [
            {
              "when": "custom",
              "do": "big-guard",
              "value": 30,
              "over": 15,
              "cycles": 2
            }
          ]
        }
      },
      "why": "Weather the big hits of elites."
    },
    {
      "id": "smashandgrab",
      "name": "Smash and Grab",
      "levels": [
        38,
        42
      ],
      "pieces": [
        "grabber",
        "clipper",
        "dropzone"
      ],
      "bonuses": {
        "2": {
          "text": "+6% damage.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 6
            }
          ]
        },
        "3": {
          "text": "When your hit breaks a part's shield, a third of it shields you for 2 cycles.",
          "fx": [
            {
              "when": "custom",
              "do": "shield-steal",
              "value": 33,
              "cycles": 2
            }
          ]
        }
      },
      "why": "Steal the shields of Buffers and Bodyguards."
    },
    {
      "id": "payroll",
      "name": "Payroll",
      "levels": [
        39,
        43
      ],
      "pieces": [
        "pay-slip",
        "direct-deposit",
        "year-end"
      ],
      "bonuses": {
        "2": {
          "text": "+8% max Integrity.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "Every 3rd cycle, heals you for 6% of your max Integrity.",
          "fx": [
            {
              "when": "custom",
              "do": "heal-every",
              "value": 6,
              "every": 3
            }
          ]
        }
      },
      "why": "Heal steadily without a healer's skills."
    },
    {
      "id": "backbone",
      "name": "Backbone",
      "levels": [
        38,
        44
      ],
      "pieces": [
        "hop",
        "crc",
        "broadcast-storm"
      ],
      "bonuses": {
        "2": {
          "text": "+3% damage for each part standing, up to 12%.",
          "fx": [
            {
              "when": "hit",
              "do": "damage%",
              "value": 3,
              "scale": "standing",
              "cap": 12
            }
          ]
        },
        "3": {
          "text": "A hit that reaches several parts deals 12% more for each part past the first, up to 36%.",
          "fx": [
            {
              "when": "custom",
              "do": "reach%",
              "value": 12,
              "cap": 36
            }
          ]
        }
      },
      "why": "Hit several parts at once."
    }
  ]
};
