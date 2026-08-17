import Lenis from 'lenis';

/* The page's smooth scrolling.

   It lives here rather than inside the React hook because two things need the
   same instance: the hook, which creates and tears it down, and the 3D
   backdrop, which has to read the exact position the page is being painted at
   — and, more importantly, advance the animation itself before it reads.

   Ordering is the whole point. Lenis and the backdrop each own a
   requestAnimationFrame callback, and callbacks run in the order they were
   registered. Society3D mounts as a child, so React runs its effect before the
   parent's and its callback goes in first: it would read the scroll position
   every frame *before* Lenis had moved it, leaving the camera exactly one
   frame behind the text at every refresh. Letting the backdrop advance the
   scroll first closes that gap.

   A second `advance` in the same frame costs nothing: every callback in a
   frame is handed the same timestamp, and Lenis advances by the delta since
   the last call, so the duplicate advances by zero. */

let lenis = null;
let raf = 0;

export function startScroller(options) {
  /* `autoRaf` is deliberately off. Lenis's `raf()` re-registers itself from
     inside the callback when that flag is set, so calling it from the backdrop
     as well would schedule a second loop, then four, then eight. Driving one
     loop from here keeps it to exactly one advance per frame. */
  lenis = new Lenis({ ...options, autoRaf: false });
  const tick = (t) => {
    raf = requestAnimationFrame(tick);
    lenis.raf(t);
  };
  raf = requestAnimationFrame(tick);
  return lenis;
}

export function stopScroller() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (lenis) lenis.destroy();
  lenis = null;
}

/** Advance the scroll animation to `timeMs`. Safe to call more than once a frame. */
export function advanceScroll(timeMs) {
  if (lenis) lenis.raf(timeMs);
}

/** The exact position the page is drawn at. `window.scrollY` is the browser's
    rounded copy of this; a camera reading it inherits the rounding as a faint
    stepping, so it reads the float instead. */
export function scrollNow() {
  return lenis ? lenis.scroll : window.scrollY;
}

/** True while the page eases its own scrolling — which tells the camera it has
    no smoothing of its own left to do. */
export function scrollIsSmoothed() {
  return lenis !== null;
}
