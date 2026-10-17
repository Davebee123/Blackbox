// Protocol glyphs: each protocol's own ASCII picture (the Loadout's board, its datasheet and stash, and the item
// hover cards), from four things it already has. Its kind picks the family (three shapes each), a hash of its name
// picks the shape, its main stat (the first it lists) the fill, and its rarity the colour and effects: white dimmed;
// yellow, gold and orange framed at the corners; a Zero-day swept by a bright scanline; a unique (or an Indemnified
// protocol) flickers now and then (style.css .pglyph; app.js runs the motion). The same item always looks the same.
// Every shape is 23 columns wide and mirrors itself about column 11 (protocol-glyphs.test.mjs checks).
import { groupOf } from './gear.mjs';

// Three shapes a kind. '%' marks the fill spots, replaced by the character for the item's main stat.
export const SHAPES = {
  exploit: [
    { name: 'Arrow', rows: [
      '          |%|          ',
      '          |%|          ',
      '          |%|          ',
      '  \\\\      |%|      //  ',
      '   \\\\     |%|     //   ',
      '    \\\\    |%|    //    ',
      '     \\\\   |%|   //     ',
      '      \\\\  |%|  //      ',
      '       \\\\ |%| //       ',
      '        \\\\|%|//        ',
      '         \\\\%//         ',
      '          \\V/          ',
    ] },
    { name: 'Fletched', rows: [
      '      \\\\  |%|  //      ',
      '       \\\\ |%| //       ',
      '        \\\\|%|//        ',
      '          |%|          ',
      '          |%|          ',
      '          |%|          ',
      '    ======|%|======    ',
      '     \\\\   |%|   //     ',
      '       \\\\ |%| //       ',
      '         \\\\%//         ',
      '          \\V/          ',
    ] },
    { name: 'Wedge', rows: [
      '  ===================  ',
      '  \\\\%%%%%%%%%%%%%%%//  ',
      '   \\\\%%%%%%%%%%%%%//   ',
      '    \\\\%%%%%%%%%%%//    ',
      '     \\\\%%%%%%%%%//     ',
      '      \\\\%%%%%%%//      ',
      '       \\\\%%%%%//       ',
      '        \\\\%%%//        ',
      '         \\\\%//         ',
      '          \\V/          ',
    ] },
  ],
  proxy: [
    { name: 'Hourglass', rows: [
      '    ===============    ',
      '    \\\\           //    ',
      '     \\\\         //     ',
      '      \\\\       //      ',
      '       \\\\     //       ',
      '        \\\\   //        ',
      '         ))%((         ',
      '        //   \\\\        ',
      '       //     \\\\       ',
      '      //       \\\\      ',
      '     //         \\\\     ',
      '    //===========\\\\    ',
    ] },
    { name: 'Running', rows: [
      '    ===============    ',
      '    \\\\%%%%%%%%%%%//    ',
      '     \\\\%%%%%%%%%//     ',
      '      \\\\       //      ',
      '       \\\\     //       ',
      '        \\\\   //        ',
      '         ))%((         ',
      '        //   \\\\        ',
      '       //  %  \\\\       ',
      '      //  %%%  \\\\      ',
      '     // %%%%%%% \\\\     ',
      '    //===========\\\\    ',
    ] },
    { name: 'Framed', rows: [
      '  ===================  ',
      '  ||\\\\           //||  ',
      '  || \\\\         // ||  ',
      '  ||  \\\\       //  ||  ',
      '  ||   \\\\     //   ||  ',
      '  ||    \\\\ % //    ||  ',
      '  ||    // % \\\\    ||  ',
      '  ||   //     \\\\   ||  ',
      '  ||  //       \\\\  ||  ',
      '  || //         \\\\ ||  ',
      '  ||//           \\\\||  ',
      '  ===================  ',
    ] },
  ],
  shell: [
    { name: 'Rings', rows: [
      "      .=========.      ",
      "   .=='         '==.   ",
      '  //     .===.     \\\\  ',
      ' ||    //     \\\\    || ',
      ' ||   ||   %   ||   || ',
      ' ||    \\\\     //    || ',
      "  \\\\     '==='     //  ",
      "   '==.         .=='   ",
      "      '========='      ",
    ] },
    { name: 'Boxes', rows: [
      '  .=================.  ',
      '  ||               ||  ',
      '  ||  .=========.  ||  ',
      '  ||  ||       ||  ||  ',
      '  ||  ||   %   ||  ||  ',
      '  ||  ||       ||  ||  ',
      "  ||  '========='  ||  ",
      '  ||               ||  ',
      "  '================='  ",
    ] },
    { name: 'Octagon', rows: [
      "     .===========.     ",
      "   //             \\\\   ",
      "  ||   .=======.   ||  ",
      "  ||  ||   %   ||  ||  ",
      "  ||   '======='   ||  ",
      "   \\\\             //   ",
      "     '==========='     ",
    ] },
  ],
  script: [
    { name: 'Infinity', rows: [
      '    .==.       .==.    ',
      '  //    \\\\   //    \\\\  ',
      ' ||      \\\\ //      || ',
      ' ||   %   >X<   %   || ',
      ' ||      // \\\\      || ',
      '  \\\\    //   \\\\    //  ',
      "    '=='       '=='    ",
    ] },
    { name: 'Braces', rows: [
      '     .==       ==.     ',
      '    //           \\\\    ',
      '    ||  %%%%%%%  ||    ',
      '   <<    %%%%%    >>   ',
      '    ||  %%%%%%%  ||    ',
      '    \\\\           //    ',
      "     '==       =='     ",
    ] },
    { name: 'Angular', rows: [
      '     //\\\\     //\\\\     ',
      '    //  \\\\   //  \\\\    ',
      '   //    \\\\ //    \\\\   ',
      '  <<  %   >%<   %  >>  ',
      '   \\\\    // \\\\    //   ',
      '    \\\\  //   \\\\  //    ',
      '     \\\\//     \\\\//     ',
    ] },
  ],
  implant: [
    { name: 'Diamond', rows: [
      '          /^\\          ',
      '         // \\\\         ',
      '        //   \\\\        ',
      '       //  _  \\\\       ',
      '      <<  (%)  >>      ',
      '       \\\\     //       ',
      '        \\\\   //        ',
      '         \\\\ //         ',
      '          \\v/          ',
    ] },
    { name: 'Inlaid', rows: [
      '          /^\\          ',
      '         // \\\\         ',
      '        //   \\\\        ',
      '       //  ^  \\\\       ',
      '      //  / \\  \\\\      ',
      '     <<  < % >  >>     ',
      '      \\\\  \\ /  //      ',
      '       \\\\  v  //       ',
      '        \\\\   //        ',
      '         \\\\ //         ',
      '          \\v/          ',
    ] },
    { name: 'Radiant', rows: [
      '      .    ^    .      ',
      '       . // \\\\ .       ',
      '        //   \\\\        ',
      '  ==   //  _  \\\\   ==  ',
      '  == <<   (%)   >> ==  ',
      '  ==   \\\\     //   ==  ',
      '        \\\\   //        ',
      "       . \\\\ // .       ",
      '      .    v    .      ',
    ] },
  ],
};
// The fill for an item's main stat (its first listed stat): one per stat a protocol can roll, each its own mirror.
export const FILL = {
  damage: '#', crit: '*', critDamage: 'x', accuracy: '!', echo: '"', payload: '+',
  signal: '@', regen: 'o', reduction: '=', evasion: "'", sanitize: '-', restore: '+', leech: '~',
  clock: ':', stealth: '.', sync: '^', scavenge: '$',
};
// A character and its mirror image, for the symmetry check; any other character is its own.
export const MIRROR = { '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{' };
export const asymmetric = (rows) => rows.filter((r) => [...r].reverse().map((c) => MIRROR[c] ?? c).join('') !== r); // the rows that don't mirror themselves
export const GLYPH_W = 23, GLYPH_H = 12; // every glyph sits centred in the same box

const hash = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const shapeOf = (it) => { const list = SHAPES[groupOf(it)] || SHAPES.exploit; return list[hash(it?.name || '') % list.length]; };
export const fillOf = (it) => FILL[Object.keys(it?.stats || {})[0]] || FILL.damage;
// The item's glyph as text: its shape with its fill, centred in the GLYPH_H-row box.
export function glyphText(it) {
  const rows = shapeOf(it).rows, fill = fillOf(it), top = Math.floor((GLYPH_H - rows.length) / 2), blank = ' '.repeat(GLYPH_W);
  return [...Array(top).fill(blank), ...rows.map((r) => r.replaceAll('%', fill)), ...Array(GLYPH_H - rows.length - top).fill(blank)].join('\n');
}
// Its rarity's motion: a unique (or an Indemnified protocol) flickers, a Zero-day scans; the rest hold still.
export const glyphFx = (it) => (it?.unique || it?.rarity === 'indemnified' ? 'flicker' : it?.rarity === 'zeroday' ? 'scan' : '');
// Corner marks: yellow and up.
const FRAMED = new Set(['custom', 'zeroday', 'indemnified']);

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// The glyph as markup (class pg-<size>). size: 'sm' (a stash tile), 'md' (a slot on the board), 'tip' (a hover card) or 'lg' (the datasheet).
// A moving one carries its still text in data-base, for the motion to return to.
export function glyphMarkup(it, size = 'md') {
  const text = glyphText(it), fx = glyphFx(it), r = it?.rarity || 'stock';
  return `<span class="pglyph pg-${size} r-${r}${FRAMED.has(r) ? ' pg-framed' : ''}" aria-hidden="true"${fx ? ` data-pg-fx="${fx}" data-base="${esc(text)}"` : ''}>${esc(text)}</span>`;
}

// ---------- motion (app.js calls glyphMotion every frame while motion is on) ----------
export const SCAN_MS = 260, FLICKER_MS = 140, FLICKER_EVERY = 14, FLICKER_ON = 3; // a flicker: 3 steps of every 14 (about 2 s)
const NOISE = '░▒▓█╳#%';
// The scanline's row at time t: it sweeps down the glyph, then rests three steps off the bottom.
export const scanRow = (t, rows = GLYPH_H) => Math.floor(t / SCAN_MS) % (rows + 3);
export const flickering = (t) => Math.floor(t / FLICKER_MS) % FLICKER_EVERY < FLICKER_ON;
// The markup for one frame: the bright row for a scan; a few characters swapped for noise while a flicker is on.
export function glyphFrame(base, fx, t, rand = Math.random) {
  if (fx === 'scan') { const row = scanRow(t); return base.split('\n').map((l, i) => (i === row ? `<b class="pg-scan">${esc(l)}</b>` : esc(l))).join('\n'); }
  if (fx === 'flicker' && flickering(t)) return esc([...base].map((c) => (c !== ' ' && c !== '\n' && rand() < 0.1 ? NOISE[Math.floor(rand() * NOISE.length)] : c)).join(''));
  return esc(base);
}
// Every moving glyph under root, at time t. Each redraws only when its step changes; with motion off (still), each
// goes back to its still text once.
export function glyphMotion(root, t, still = false) {
  for (const el of root.querySelectorAll('[data-pg-fx]')) {
    const fx = el.dataset.pgFx, key = still ? 'still' : fx === 'scan' ? `s${scanRow(t)}` : flickering(t) ? `f${Math.floor(t / FLICKER_MS)}` : 'still';
    if (el.dataset.pgAt === key) continue;
    el.dataset.pgAt = key;
    if (key === 'still') el.textContent = el.dataset.base;
    else el.innerHTML = glyphFrame(el.dataset.base, fx, t);
  }
}
