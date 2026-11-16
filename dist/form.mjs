// The one answer to "is this a phone" (docs/phone-plan.md): up to 600 px wide, or up to 500 px tall with a coarse
// pointer (a phone on its side). It sets <html data-form="phone|desk"> and tells its listeners when the answer changes.
// `narrow` is the one-column desktop under 900 px (600–900 px keeps it), for the few desktop rules that read it.
export const PHONE_QUERY = '(max-width: 600px), (max-height: 500px) and (pointer: coarse)';
export const NARROW_QUERY = '(max-width: 900px)';

const mq = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : { matches: false, addEventListener() {} });
const phoneQ = mq(PHONE_QUERY), narrowQ = mq(NARROW_QUERY);
const subs = new Set();

export const isPhone = () => phoneQ.matches;
export const narrow = () => narrowQ.matches;
export const form = () => (phoneQ.matches ? 'phone' : 'desk');

function mark() { if (typeof document !== 'undefined') document.documentElement.dataset.form = form(); }
mark();
phoneQ.addEventListener?.('change', () => { mark(); for (const f of subs) f(form()); });
narrowQ.addEventListener?.('change', () => { for (const f of subs) f(form()); });

// Called with the form on any change of either answer (the caller redraws).
export function onForm(f) { subs.add(f); return () => subs.delete(f); }
