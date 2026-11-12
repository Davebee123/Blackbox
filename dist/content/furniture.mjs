// The house's furniture (house.mjs, docs/house.md): each piece's ASCII art, its flavour line and the achievement that
// brings it (from: an achievements.mjs id; none, yours from the start). wall: it hangs on a floor's back wall; yard:
// it stands only outside, in the yard.
// Data only, no imports: achievements.mjs reads it for its reward words, house.mjs for the rules.
export const FURNITURE = {
  mattress: { name: 'Bare mattress', flavour: 'Came with the squat. So did the stain.', from: null, art: [
    ' ___________ ',
    '(_____o_____)'] },
  crates: { name: 'Milk-crate desk', flavour: 'Load-bearing dairy.', from: 'x-mapped', art: [
    '_____________',
    '|##|     |##|',
    '|##|     |##|'] },
  aquarium: { name: 'CRT aquarium', flavour: 'Gutted for parts. The fish runs it now.', from: 'x-cascade', art: [
    '.------.',
    '|><>  o|',
    '|~~~~~~|',
    "'-/--\\-'"] },
  lamp: { name: 'Quarantine lamp', flavour: 'Something is contained in there. Mostly.', from: 'x-quarantine', art: [
    ' _/^\\_ ',
    ' |(@)| ',
    ' |___| ',
    '   |   ',
    '  _|_  '] },
  armchair: { name: 'Repossessed armchair', flavour: "Repo'd twice. The third time, it stayed.", from: 'c-repoman', art: [
    ' .-----. ',
    ' |REPO | ',
    '(|_____|)',
    " '     ' "] },
  throne: { name: 'Relay throne', flavour: 'Five wheels, four that turn. Still a throne.', from: 'c-relayking', art: [
    '/\\/\\/\\',
    '|    |',
    '|____|',
    '  ||  ',
    'o-oox-'] },
  heater: { name: 'Hashboard heater', flavour: 'Mines nothing. Heats everything.', from: 'c-heatsink', art: [
    ' ________  ',
    '|::::::::|~',
    '|::::::::| ~',
    '|________|~'] },
  planter: { name: 'Cold-safe planter', flavour: 'Cracked open. Holds a cactus now.', from: 'c-coldwallet', art: [
    '   _|_   ',
    '  (_|_)  ',
    ' ___|___ ',
    '|  [o]  |',
    '|___/\\__|'] },
  cabinet: { name: 'Claims cabinet', flavour: 'Every drawer a denied claim. Yours is on top.', from: 'f-halcyon', art: [
    '.------.',
    '|[YOU ]|',
    '|[____]|',
    '|[____]|',
    "'------'"] },
  pew: { name: 'Choir pew', flavour: 'Seats a choir of none.', from: 'f-nullchoir', art: [
    '_|____________|_',
    ' |============| ',
    ' ||          || '] },
  couch: { name: 'Crew couch', flavour: 'Seats three. Has seated nine.', from: 'f-firstjob', art: [
    ' ____________ ',
    '(|  |    |  |)',
    '(|__|____|__|)',
    " '          ' "] },
  cat: { name: 'The cat', flavour: 'Not furniture. Placed anyway.', from: 'x-hours', art: [
    ' /\\_/\\ ',
    '( o.o )',
    ' > ^ < '] },
  poster: { name: 'HANG IN THERE', flavour: 'Process 4417 did not.', from: 't-onesignal', wall: true, art: [
    '.-------------.',
    '|   _(o.o)_   |',
    '|HANG IN THERE|',
    "'-------------'"] },
  toilet: { name: 'Mystery toilet', flavour: "Plumbed into something. Don't trace it.", from: 'x-traced', art: [
    ' ___      ',
    '|   |     ',
    '|___|____ ',
    ' \\_____/~~',
    '   |_|    '] },
  // ---------- the yard ----------
  mailbox: { name: 'Mailbox', flavour: "Someone else's name, crossed out.", from: 'x-taken', yard: true, art: [
    ' ____ ',
    '|_==_|',
    '  ||  ',
    '  ||  '] },
  tolet: { name: 'TO LET sign', flavour: 'Every room let. Most of them to viruses.', from: 'x-taken-10', yard: true, art: [
    '.------.',
    '|TO LET|',
    "'------'",
    '   ||   ',
    '   ||   '] },
  washing: { name: 'Washing line', flavour: 'Loose ends, pegged out to dry.', from: 'x-threads', yard: true, art: [
    'T---v----v---T',
    '|  []   |_|  |',
    '|            |',
    '|            |'] },
  grill: { name: 'Oil-drum grill', flavour: "The fire's free. Bring your own.", from: 'o-crew', yard: true, art: [
    ' ) ( ) ',
    '.#####.',
    '|=====|',
    '|_____|'] },
  bike: { name: "Courier's bike", flavour: 'The courier walked.', from: 'f-couriers', yard: true, art: [
    '  ,__   ',
    ' _/\\_\\_ ',
    '(_)  (_)'] },
  car: { name: 'Car on blocks', flavour: 'A hundred kills on the clock. No wheels.', from: 'c-win-100', yard: true, art: [
    '  ______     ',
    ' /|_||_\\`.__ ',
    '(          _)',
    ' =#=    =#=  '] },
};
export const FURNITURE_IDS = Object.keys(FURNITURE);
// The achievement that brings a piece → the piece (one each).
export const furnitureFrom = (achId) => FURNITURE_IDS.find((id) => FURNITURE[id].from === achId) || null;
