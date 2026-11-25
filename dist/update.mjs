// A new build: scripts/build.mjs stamps the page with its build (<meta name="bb-build">) and writes version.json beside
// it. watchUpdate checks that file when you come back to the tab, and every half hour while the tab shows; never while
// it's hidden. dist/ run as plain modules has no stamp, so it never checks. Once a newer build is out, halcyon-mdm's
// transmission says so (content/scenes.mjs `update`) and the log keeps a line for it (pings.mjs) until you restart.
export const UPDATE = { everyMs: 30 * 60e3, backMs: 60e3 }; // backMs: coming back to the tab checks, at most once a minute

let ready = false;
export const updateReady = () => ready;
export const setUpdateReady = (on = true) => { ready = !!on; }; // tests, and watchUpdate
export const buildOf = (doc = globalThis.document) => doc?.querySelector('meta[name="bb-build"]')?.content || null;
export const isNewer = (mine, theirs) => !!mine && !!theirs && mine !== theirs;

// onNew(build) once, the first time version.json names another build than this page's.
export function watchUpdate(onNew, { doc = globalThis.document, get = (url) => fetch(url, { cache: 'no-store' }).then((r) => r.json()) } = {}) {
  const mine = buildOf(doc);
  if (!mine) return;
  let last = Date.now(), timer = 0; // the page just loaded: it is the newest it can be
  const check = async (gap) => {
    if (ready || doc.hidden || Date.now() - last < gap) return;
    last = Date.now();
    try {
      const v = await get(new URL('version.json', doc.baseURI || location.href).href);
      if (!ready && isNewer(mine, v?.build)) { ready = true; onNew(v.build); }
    } catch { /* offline, or the file isn't there: try again next time */ }
  };
  const arm = () => { clearTimeout(timer); if (!ready && !doc.hidden) timer = setTimeout(() => { check(UPDATE.everyMs); arm(); }, UPDATE.everyMs); };
  doc.addEventListener('visibilitychange', () => { check(UPDATE.backMs); arm(); });
  arm();
}
