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
          "text": "+8% damage.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "Breaking a part gives +10% damage for 2 cycles.",
          "fx": [
            {
              "when": "custom",
              "do": "break-rush",
              "value": 10,
              "cycles": 2
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
              "text": "Overkill spills 20 more.",
              "fx": [
                {
                  "when": "custom",
                  "do": "spill+",
                  "value": 20
                }
              ]
            },
            "overclocker": {
              "text": "You gain 1 Momentum.",
              "fx": [
                {
                  "when": "custom",
                  "do": "break-momentum",
                  "value": 1
                }
              ]
            }
          }
        }
      }
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
          "text": "+8% max Signal.",
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
          "text": "A hit for more than 15% of your max Signal marks its part: it takes 10% more from you for 3 cycles, and you heal 3% of max.",
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
      }
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
          "text": "Your first hit on each part deals 15% more.",
          "fx": [
            {
              "when": "custom",
              "do": "first-hit%",
              "value": 15
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
              "text": "Your burns on it tick 20% harder.",
              "fx": [
                {
                  "when": "custom",
                  "do": "half-burn",
                  "value": 20
                }
              ]
            }
          }
        }
      }
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
      }
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
          "text": "Delivering a contract fills your Signal, and your next kill pays 25% more XP.",
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
      ]
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
          "text": "+10% max Signal; Regen heals 1 more every 5 cycles.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 10
            },
            {
              "when": "always",
              "do": "stat",
              "stat": "regen",
              "value": 1
            }
          ]
        }
      }
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
      }
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
          "text": "+8% max Signal.",
          "fx": [
            {
              "when": "always",
              "do": "signal%",
              "value": 8
            }
          ]
        },
        "3": {
          "text": "Once a fight, a hit that would take more than 30% of your max Signal deals 30% instead.",
          "fx": [
            {
              "when": "custom",
              "do": "big-hit-cap",
              "value": 30
            }
          ]
        }
      }
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
          "text": "Rest rooms and Defrag Bays restore 50% more Signal.",
          "fx": [
            {
              "when": "custom",
              "do": "rest-more",
              "value": 50
            }
          ]
        }
      }
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
          "text": "Answering a tell shields you for 5% of max Signal.",
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
      }
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
          "text": "+5% damage, +5% max Signal.",
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
      }
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
      }
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
          "text": "+10% damage while below half Signal.",
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
          "text": "+10% Clock Speed while below half; once a fight, dropping below 25% heals 10% of max.",
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
      }
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
          "text": "Healing past full becomes a shield, up to 10% of max Signal.",
          "fx": [
            {
              "when": "custom",
              "do": "overheal",
              "value": 10
            }
          ]
        }
      }
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
          "text": "+2 Block.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "reduction",
              "value": 2
            }
          ]
        },
        "3": {
          "text": "Above 75% Signal, you take 8% less damage.",
          "fx": [
            {
              "when": "custom",
              "do": "taken-cut%",
              "value": 8,
              "if": "above-75"
            }
          ]
        }
      }
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
          "text": "From a fight's 6th cycle, +8% damage.",
          "fx": [
            {
              "when": "hit",
              "do": "dmg%",
              "value": 8,
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
      }
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
      }
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
          "text": "The first time a fight drops you below 30% Signal, heal 20% of max and deal 10% more for 3 cycles.",
          "fx": [
            {
              "when": "custom",
              "do": "comeback",
              "value": 20,
              "at": 30,
              "more": 10,
              "cycles": 3
            }
          ]
        }
      }
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
      }
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
          "text": "+8% max Signal.",
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
      }
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
          "text": "+5% damage, +5% max Signal.",
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
          "text": "+10% Clock Speed; cooldowns start each fight 1 cycle shorter.",
          "fx": [
            {
              "when": "always",
              "do": "stat",
              "stat": "clock",
              "value": 10
            },
            {
              "when": "custom",
              "do": "cd-start",
              "value": 1
            }
          ]
        },
        "4": {
          "text": "Once a fight, a hit that would drop you to 0 leaves you at 1 and shields you for 20% of max.",
          "fx": [
            {
              "when": "custom",
              "do": "last-stand",
              "value": 20
            }
          ]
        }
      }
    }
  ]
};
