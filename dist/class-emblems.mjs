// The class picker's emblems: ASCII line art, 19 columns by 8 rows, each row mirroring itself about
// column 9 (class-emblems.test.mjs checks it). Drawn the way the protocol glyphs are: doubled strokes.
export const EMBLEMS = {
  // A maul: a heavy head on a short haft.
  breaker: [
    '  .=============.  ',
    '  ||###########||  ',
    '  ||###########||  ',
    "  '=====. .====='  ",
    '        | |        ',
    '        | |        ',
    '        | |        ',
    '       .===.       ',
  ],
  // A shield with a cross on its face.
  bastion: [
    '  .=============.  ',
    '  ||     |     ||  ',
    '  ||   --+--   ||  ',
    '  ||     |     ||  ',
    '   \\\\         //   ',
    '     \\\\     //     ',
    '       \\\\ //       ',
    '         V         ',
  ],
  // An eye, open.
  infiltrator: [
    '                   ',
    '      .=====.      ',
    "   .=='     '==.   ",
    '  <<   (@@@)   >>  ',
    "   '==.     .=='   ",
    "      '====='      ",
    '                   ',
    '                   ',
  ],
  // A hub with four nodes on its spokes.
  operator: [
    '  [o]         [o]  ',
    '     \\\\     //     ',
    '       \\\\ //       ',
    '      [#####]      ',
    '       // \\\\       ',
    '     //     \\\\     ',
    '  [o]         [o]  ',
    '                   ',
  ],
};
const MIRROR = { '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[' };
// Rows that don't mirror themselves (empty when the emblem is symmetric).
export const asymmetric = (rows) => rows.filter((r) => [...r].reverse().map((c) => MIRROR[c] || c).join('') !== r);
