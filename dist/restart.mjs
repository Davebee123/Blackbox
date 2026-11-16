// Restart a one-shot animation class on an element: off, a style pass, on. Only style is flushed (`void el.offsetWidth`
// laid the whole screen out, about a millisecond a flash on a phone), and nothing at all when the class isn't on.
export function restartClass(el, ...cls) {
  if (cls.some((c) => el.classList.contains(c))) {
    el.classList.remove(...cls);
    const view = el.ownerDocument?.defaultView;
    if (view?.getComputedStyle) void view.getComputedStyle(el).animationName; else void el.offsetWidth;
  }
  el.classList.add(...cls);
}
