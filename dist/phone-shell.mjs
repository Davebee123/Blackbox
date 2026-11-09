// The phone's shell (docs/phone-plan.md P1): the tab bar at the bottom and the More sheet. Plain markup from state;
// every control carries a data- command (data-module, data-finger, data-phone), so a tap sends what a click on the
// desktop's top bar sends. The top strip is the desktop's own meters and pager, restyled by phone.css.
import { glyph } from './glyphs.mjs';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// What's live while there is one, most pressing first: a fight, a breach, a server's rooms, a run. `active`: a fight
// is live (app.js passes combat.mjs active()).
export function contextOf(s, { camp = false, active = false } = {}) {
  if (active) return { module: 'combat', label: 'Fight', icon: 'target' };
  if (s.breach) return { module: 'breach', label: 'Breach', icon: 'exploit' };
  if (camp) return null;
  if (s.rooms) return { module: 'rooms', label: s.roomsPlay ? 'Server' : 'Run', icon: 'trace' };
  if (s.run && !s.run.breach && !s.run.rooms) return { module: 'net', label: 'Run', icon: 'trace' };
  return null;
}

// The four page slots (More is the fifth). opts: module (the page showing), camp (the breach campaign), active (a
// fight is live), counts { mail, ready, loadout }. The first slot is the live context in Map's place while there is one.
export function tabsOf(s, { module = 'map', camp = false, active = false, counts = {} } = {}) {
  const ctx = contextOf(s, { camp, active });
  const first = ctx || (camp ? { module: 'campaign', label: 'Campaign', icon: 'router' } : { module: 'map', label: 'Map', icon: 'router' });
  const slots = camp
    ? [first, { module: 'archive', label: 'Archive', icon: 'storage' }, { module: 'loadout', label: 'Loadout', icon: 'module', count: counts.loadout }]
    : [first, { module: 'mail', label: 'Mail', icon: 'letter', count: counts.mail, ready: counts.ready }, { module: 'loadout', label: 'Loadout', icon: 'module', count: counts.loadout }, { module: 'server', label: 'Server', icon: 'integrity' }];
  return slots.map((t) => ({ ...t, ctx: t === ctx, dot: t === ctx && module !== t.module, on: module === t.module || (t === first && !ctx && module === 'hub') }));
}

export function tabBarMarkup(s, opts = {}) {
  const more = !!opts.moreOpen, morePage = ['codex', 'rig', 'system', 'consortium'].includes(opts.module);
  const tab = (t) => `<button type="button" class="ph-tab${t.ctx ? ' ctx' : ''}" data-module="${t.module}"${t.on && !more ? ' aria-current="page"' : ''}>${glyph(t.icon)}<span>${esc(t.label)}</span>${t.dot ? '<i class="ph-dot" aria-label="live"></i>' : ''}${t.count ? `<b class="ph-n">${t.count}</b>` : t.ready ? '<b class="ph-n ok" aria-label="ready to deliver">✓</b>' : ''}</button>`;
  return `${tabsOf(s, opts).map(tab).join('')}<button type="button" class="ph-tab" data-phone="more" aria-expanded="${more}"${more || morePage ? ' aria-current="page"' : ''}><span class="ph-more" aria-hidden="true">···</span><span>More</span>${opts.counts?.consortium ? `<b class="ph-n">${opts.counts.consortium}</b>` : ''}</button>`;
}

// More: the player card row, then the pages that don't fit the bar, then the command line.
// opts: who { handle, cls, level, xp (0–1) }, consortium (its tab shows), count (its alerts), people (the button shows).
export function moreMarkup(s, { who = {}, consortium = false, count = 0, people = false, camp = false } = {}) {
  const handle = who.handle || 'rookie';
  const row = (attrs, icon, label, extra = '') => `<button type="button" class="ph-row" ${attrs}>${icon}<span>${label}</span>${extra}</button>`;
  const card = `<button type="button" class="ph-card" data-finger="${esc(handle)}" aria-label="Your Net ID card"><span class="ph-strip">Net ID</span><span class="ph-id"><b class="ph-handle">${esc(handle)}</b><small>${esc(who.cls || '')} · Lv ${who.level ?? 1}</small><span class="ph-xp" aria-hidden="true"><i style="width:${Math.round((who.xp ?? 0) * 100)}%"></i></span></span></button>`;
  return `<nav class="ph-more-list" aria-label="More">${card}
    ${consortium && !camp ? row('data-module="consortium"', glyph('uplink'), 'Consortium', count ? `<b class="ph-n">${count}</b>` : '') : ''}
    ${row('data-module="codex"', glyph('blueprint'), 'Codex')}
    ${row('data-module="rig"', glyph('kernel'), 'Rig')}
    ${row('data-module="system"', glyph('config'), 'Settings')}
    ${people ? row('data-phone="people"', glyph('relay'), 'People') : ''}
    ${row('data-phone="prompt"', '<span class="ph-gt" aria-hidden="true">&gt;_</span>', 'Command line')}</nav>`;
}

// What a phone never shows in its shell (docs/phone-plan.md, What a phone leaves out). phone.test.mjs checks the
// markup above against it.
export const CUT = ['casing', 'net-line', 'command-input', 'bench', 'traceroute', 'data-ui-scale', 'window on', 'casing on'];
