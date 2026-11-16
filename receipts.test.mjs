import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation } from './dist/combat.mjs';
import { contractTakeover } from './dist/mail.mjs';
import { rep } from './dist/factions.mjs';
import { partsOf } from './dist/faction-gear.mjs';
import { RECEIPT, keptReceipts, receiptOf, receiptLine, tallyOf } from './dist/receipts.mjs';
import { receiptLead } from './dist/view.mjs';

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true }; return s; };
const take = (s) => { const loc = addLocation(s, 'worm', 3); contractTakeover(s, loc); return loc; };

test('a takeover: its vault’s receipt in your files, on the card with five stamps', () => {
  const s = open();
  const loc = take(s);
  const x = keptReceipts(s)[0];
  assert.deepEqual(x, receiptOf(loc), 'fixed by the server’s seed');
  assert.match(receiptLine(x), /^TRD-\d\d-\d{7} · .+ → .+ · ¤[\d,]+ · \d+ \w{3} \d{4} · C[+−]\d+$/);
  assert.equal(s.logs.findLast((e) => e.type === 'takeover').receipt, x.id, 'the takeover card shows it');
  const card = receiptLead(s, x.id);
  assert.equal((card.match(/class="rc-stamp"/g) || []).length, 5);
  assert.match(card, /title="Settle\nLANTERN · Receipt\nClosed the way it was meant to close\.\n\+10 LANTERN rep · 0\/3 toward [^\n]+\n▸ Three receipts make one part\."/);
  assert.match(card, /data-gain-cmd="receipt later"/);
  contractTakeover(s, loc);
  assert.equal(keptReceipts(s).length, 1, 'one receipt a server');
});

test('a stamp: +10 rep with its faction (the ripples), one receipt toward its piece; three make a part', () => {
  const s = open();
  const l0 = rep(s, 'lantern'), n0 = rep(s, 'nullchoir'), g0 = rep(s, 'glassjaw'), c0 = s.server.credits;
  for (let i = 0; i < 3; i++) { take(s); command(s, `receipt ${keptReceipts(s).at(-1).id} lantern`); }
  assert.equal(keptReceipts(s).length, 0);
  assert.equal(rep(s, 'lantern'), l0 + 3 * RECEIPT.rep);
  assert.equal(rep(s, 'nullchoir'), n0 + 3 * Math.round(RECEIPT.rep * 0.25), 'its ally a quarter');
  assert.ok(rep(s, 'glassjaw') < g0, 'its rival cools');
  assert.equal(s.server.credits, c0, 'no credits on any stamp');
  assert.equal(partsOf(s, 'lantern'), 1, 'three receipts make one part');
  assert.equal(tallyOf(s, 'lantern'), 0);
});

test('Later keeps it; a kept receipt is handed in at your commission’s hub, for your commission', () => {
  const s = open();
  take(s);
  const id = keptReceipts(s)[0].id;
  command(s, 'receipt later');
  command(s, `receipt ${id} kestrel`);
  assert.equal(keptReceipts(s).length, 1, 'only your commission takes a kept receipt');
  const h0 = rep(s, 'halcyon');
  command(s, `receipt ${id} halcyon`);
  assert.equal(rep(s, 'halcyon'), h0 + RECEIPT.rep);
  assert.equal(tallyOf(s, 'halcyon'), 1);
});
