// Sets (docs/genome.md 9): written by hand for now. Safe to edit: it's JSON after 'export default'.
// A piece is a unique in content/items.mjs carrying "set": <id>; its set lists its pieces in order. A bonus opens at its
// piece count (2, 3, 4) and is one line of text plus the effect blocks the fight engine runs (combat.mjs uniqueFx). Only
// one 4-piece bonus is active at a time (sets.mjs activeSets: the set that reached four first keeps it).
export default {
  "sets": [
    {
      "id": "kestrel",
      "name": "Kestrel Clearance",
      "author": "kestrel",
      "pieces": ["kestrel-badge", "kestrel-token", "kestrel-lanyard"],
      "bonuses": {
        "2": {
          "text": "Trace on runs grows 25% slower, and a guard's first attack waits a cycle.",
          "fx": [
            { "when": "custom", "do": "trace-slow", "value": 25 },
            { "when": "start", "do": "guard-late", "value": 1 }
          ]
        },
        "3": {
          "text": "Every 5 cycles, if you have no ◆, you gain one.",
          "fx": [
            { "when": "cycle", "if": "no-chit", "do": "chit-every", "value": 5, "text": "Every 5 cycles, if you have no ◆, you gain one." }
          ]
        }
      }
    },
    {
      "id": "lowlight",
      "name": "LOWLIGHT Kit",
      "pieces": ["wicks-old-toolkit", "lowlight-badge"],
      "bonuses": {
        "2": {
          "text": "Delivering a contract fills your Signal, and your next kill pays 25% more XP.",
          "fx": [
            { "when": "deliver", "do": "fill-signal" },
            { "when": "deliver", "do": "kill-xp", "value": 25 }
          ]
        }
      }
    }
  ]
};
