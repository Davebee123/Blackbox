// The ticker's icons (docs/ticker.md 4, picked November 2026): one per card (each hub's cards, two buyers, a corner,
// the crews' runs, the rare cards) and one per hub condition, 16-unit line glyphs drawn like glyphs.mjs. Each is
// [viewBox, paths]: the viewBox centres the drawing in its square. view.mjs marketMarkup draws them as squares.
// Data only, no imports.
export const CARD_ICONS = {
  premium: ["1.5 0.75 14.5 14.5", '<path d="M3 1.5h6l3 3v4"/><path d="M3 1.5v13h5"/><path d="M5 5.5h3M5 8h3"/><circle cx="11" cy="11" r="2.5"/><path d="m12.8 12.8 1.7 1.7"/>'], // Premium review
  rent: ["1 0.75 14 14", '<rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3"/><rect x="9" y="9" width="2.5" height="2.5" rx=".4"/>'], // Rent day
  smallprint: ["0.75 0.75 14.5 14.5", '<path d="M3 1.5h10v13H3z"/><path d="M5 4.5h6M5 6.5h6M5 8.5h4"/><path d="M9.5 11.2h2M10.5 10.2v2M9.8 10.5l1.4 1.4M11.2 10.5l-1.4 1.4"/>'], // Small print
  rack: ["0.75 0.75 14.5 14.5", '<rect x="3.5" y="1.5" width="9" height="13" rx="1"/><path d="M5.5 4.5h5M5.5 7h5M5.5 9.5h5"/><path d="M6.5 12.2h3"/>'], // Rack closure
  thermal: ["2.34 0.75 14.52 14.52", '<path d="M6.5 9.8V3a1.5 1.5 0 0 1 3 0v6.8a2.6 2.6 0 1 1-3 0z"/><path d="M8 5.5v6"/><path d="M11.8 3.5h2M11.8 6h2M11.8 8.5h2"/>'], // Thermal alarm
  insured: ["1.25 1.75 13.5 13.5", '<path d="M2 5.5 8 2.5l6 3v6l-6 3-6-3z"/><path d="M2 5.5l6 3 6-3M8 8.5v6"/><path d="m4.5 10.3 1.2 1.2 2-2.3"/>'], // Insured lots
  census: ["0.75 0.75 14.5 14.5", '<path d="M3 3v10M6 3v10M9 3v10M12 3v10"/><path d="M1.5 11 14.5 5"/>'], // Census
  beacon: ["0.4 0.05 15.2 15.2", '<path d="M6.5 14.5 7.3 6h1.4l.8 8.5M5 14.5h6"/><circle cx="8" cy="4" r="1.3"/><path d="M4.6 1.8a4 4 0 0 0 0 4.4M11.4 1.8a4 4 0 0 1 0 4.4M2.5.8a6.5 6.5 0 0 0 0 6.4M13.5.8a6.5 6.5 0 0 1 0 6.4"/>'], // Beacon repair
  openmic: ["0.75 0.75 14.5 14.5", '<rect x="5.5" y="1.5" width="5" height="8" rx="2.5"/><path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5M5.5 14.5h5"/>'], // Open mic
  rehearsal: ["0.65 0.75 14.3 14.3", '<path d="M6 12.5V3.5l7-2v9"/><circle cx="4.3" cy="12.5" r="1.8"/><circle cx="11.3" cy="10.5" r="1.8"/><path d="M6 6l7-2"/>'], // Rehearsal
  rollback: ["1.58 1.75 12.44 12.44", '<path d="M3.2 6a5.2 5.2 0 1 1-.2 4"/><path d="M2.5 2.5V6.3h3.8"/><path d="M8 5v3.2l2 1.3"/>'], // Rollback night
  auction: ["0.75 1.65 13.7 13.7", '<path d="m3.5 6.5 4-4 3 3-4 4z"/><path d="M5.5 4.5l3 3"/><path d="m8.7 7.8 5 5"/><path d="M1.5 14.5h7"/>'], // Report auction
  sink: ["0.75 1.75 14.5 14.5", '<path d="M1.5 3h13L9.5 9v4.5l-3 1.5V9z"/>'], // Sink clearance
  early: ["0.75 -0.25 14.5 14.5", '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/><path d="M12.5 1.5v2M14 2.5h-3"/>'], // Early word
  claims: ["1.25 0.75 13.5 13.5", '<path d="M1.5 4V13a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8L6.5 3h-4a1 1 0 0 0-1 1z"/><path d="M5 9.5h6"/>'], // Claim files
  tax: ["1 1.25 14 14", '<path d="M6.3 2h3.4v3.6l2.3 1.6v2.3H4V7.2l2.3-1.6z"/><path d="M2.5 12h11v2.5h-11z"/>'], // Tax run
  wage: ["1 1.25 14 14", '<ellipse cx="8" cy="4" rx="5" ry="2"/><path d="M3 4v3c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 7v3c0 1.1 2.2 2 5 2s5-.9 5-2V7M3 10v2.5c0 1.1 2.2 2 5 2s5-.9 5-2V10"/>'], // Wage run
  rivals: ["0.75 0.75 14.5 14.5", '<circle cx="4.5" cy="4" r="2.5"/><path d="M4.5 6.5v8"/><circle cx="11.5" cy="4" r="2.5"/><path d="M11.5 6.5v8"/>'], // Two buyers
  corner: ["1.25 1.25 13.5 13.5", '<path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/><path d="m8 5.5 2.5 2.5L8 10.5 5.5 8z"/>'], // Corner
  tollgate: ["0.75 2.75 14.5 14.5", '<path d="M2.5 14.5V5.5M1.5 14.5h2"/><path d="M2.5 7.5h12v2.5h-12"/><path d="M5.5 7.5 8 10M9 7.5l2.5 2.5M12.5 7.5l2 2"/>'], // TOLLGATE's run
  swarmline: ["1.05 1.05 13.9 13.9", '<circle cx="8" cy="8" r="1.6"/><circle cx="3" cy="4" r="1.2"/><circle cx="13" cy="4" r="1.2"/><circle cx="3" cy="12" r="1.2"/><circle cx="13" cy="12" r="1.2"/><path d="M4 4.8 6.7 7M12 4.8 9.3 7M4 11.2 6.7 9M12 11.2 9.3 9"/>'], // SWARMLINE's rental
  palemask: ["0.94 1.13 14.13 14.13", '<path d="M2.5 3c3.5-1.5 7.5-1.5 11 0 0 5.5-2 9.5-5.5 11.5C4.5 12.5 2.5 8.5 2.5 3z"/><path d="M4.8 6.5c.8-.6 1.8-.6 2.4 0M8.8 6.5c.8-.6 1.8-.6 2.4 0M6.3 10.5h3.4"/>'], // PALEMASK's harvest
  original: ["0.75 0.75 14.5 14.5", '<path d="M3 1.5h7l3 3v10H3z"/><path d="M5 4.5h4M5 6.5h6"/><circle cx="8" cy="10.3" r="2"/><path d="m6.8 12 -.8 2.5 2-1 2 1-.8-2.5"/>'], // The original
  rackzero: ["1 0.75 14.5 14.5", '<rect x="2.5" y="1.5" width="8" height="13" rx="1"/><path d="M10.5 1.5 14 3v10l-3.5 1.5"/><ellipse cx="6.5" cy="8" rx="1.8" ry="2.6"/>'], // Rack zero
  everyname: ["-0.25 0.75 14.5 14.5", '<path d="M4 1.5h8.5v11a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1h8.5v1a2 2 0 0 0 2 2"/><path d="M4 1.5v10M6.5 4h4M6.5 6.2h4M6.5 8.4h4"/>'], // Every name
  longrollback: ["1.58 1.75 12.44 12.44", '<path d="M3.2 6a5.2 5.2 0 1 1-.2 4"/><path d="M2.5 2.5V6.3h3.8"/><path d="M5.6 8a2.4 2.4 0 1 1 .3 1.6"/>'], // The long rollback
  guarantee: ["0.75 0.75 14.5 14.5", '<path d="M8 1.5 13.5 3.5v4c0 3.3-2.4 5.6-5.5 7-3.1-1.4-5.5-3.7-5.5-7v-4z"/><path d="m5.5 8 1.8 1.8 3.2-3.6"/>'], // The Guarantee, renewed
};
export const COND_ICONS = {
  claims: ["1.25 0.75 13.5 13.5", '<path d="M2 9.5h3l1 2h4l1-2h3"/><path d="M2 9.5v4h12v-4l-2-4H4z"/><path d="M5 3.5h6M6 1.5h4"/>'], // Claims backlog
  blackbudget: ["0.75 0.75 14.5 14.5", '<path d="M3 1.5h10v13H3z"/><path d="M5 4.5h6"/><rect x="5" y="7" width="6" height="2" fill="currentColor"/><rect x="5" y="10.5" width="4" height="1.6" fill="currentColor"/>'], // Black budget
  hotracks: ["1.25 1.6 14.1 14.1", '<rect x="2" y="4.5" width="8" height="10" rx="1"/><path d="M4 7.5h4M4 10h4M4 12.5h4"/><path d="M12 6c1.2-1.2-.6-2 .6-3.2M14 7c1.2-1.2-.6-2 .6-3.2M12.6 14.5V9"/>'], // Overheating racks
  thinpipe: ["1.5 2.75 12.5 12.5", '<path d="M2.5 14.5v-2"/><path d="M6 14.5v-5M9.5 14.5v-8M13 14.5v-11" stroke-dasharray="1.2 1.6"/>'], // Thin bandwidth
  scrapyard: ["1.75 1.75 12.5 12.5", '<path d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2M4.1 4.1l1.4 1.4M10.5 10.5l1.4 1.4M4.1 11.9l1.4-1.4"/><path d="M10.6 6.4A3 3 0 1 0 9.6 10.6"/><path d="m11.2 3.4.6 2.6"/>'], // Scrap economy
};
const svg = ([vb, d]) => `<svg class="glyph tk-ico" viewBox="${vb}" aria-hidden="true">${d}</svg>`;
export const cardIcon = (id) => (CARD_ICONS[id] ? svg(CARD_ICONS[id]) : '');
export const condIcon = (id) => (COND_ICONS[id] ? svg(COND_ICONS[id]) : '');
