// The AI note: a card before a new game's power-up (app.js firstLogin) saying how the game was made. Shown once per
// browser (NOTE_KEY), so a Reset game skips it. I understand (or Enter) goes on; keys don't reach the game meanwhile.
//
// aiNote({ reducedMotion, store }) → Promise that resolves when the player goes on (at once if already seen).

export const NOTE_KEY = 'bb-ai-note';

const store0 = () => { try { return localStorage; } catch { return null; } };
export const noteSeen = (store = store0()) => { try { return store?.getItem(NOTE_KEY) === 'seen'; } catch { return false; } };

export function aiNote({ reducedMotion = () => false, store = store0() } = {}) {
  if (noteSeen(store)) return Promise.resolve();
  const still = reducedMotion();
  const el = document.createElement('div');
  el.className = `ai-note${still ? ' still' : ''}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'ai-note-h');
  el.innerHTML = `<div class="an-card">
      <p class="an-kick">Made with Claude</p>
      <h1 id="ai-note-h">BLACKBOX was made with heavy use of Claude, an AI model by Anthropic.</h1>
      <p>While I designed the gameplay systems, UI, and sound, Claude wrote all the code that brought them to life.</p>
      <p class="an-soft">If you'd rather not play games made with generative AI, feel free to skip this one. I promise I won't mind! :)</p>
      <button type="button" class="btn pk-go an-go"><span class="pk-cmd"><span class="pk-dim">&gt;</span> I understand<i class="pk-cur"></i></span></button>
    </div>`;
  document.body.appendChild(el);
  const btn = el.querySelector('.an-go');
  btn.focus({ preventScroll: true });
  return new Promise((resolve) => {
    let gone = false;
    const done = () => {
      if (gone) return;
      gone = true;
      removeEventListener('keydown', key, true);
      try { store?.setItem(NOTE_KEY, 'seen'); } catch { /* storage blocked: it shows again next time */ }
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, still ? 0 : 320);
    };
    const key = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(); }
    };
    addEventListener('keydown', key, true);
    btn.addEventListener('click', done);
  });
}
