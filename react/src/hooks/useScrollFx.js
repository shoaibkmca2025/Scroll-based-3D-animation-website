import { useEffect } from 'react';

/**
 * The page-level scroll behaviours that are not motion:
 *  1. The nav progress bar and the screens rail are driven from scrollY, with
 *     measurements cached and one rAF per scroll event — no per-frame layout.
 *  2. The nav's material follows the ground beneath it.
 *
 * Scroll reveals used to run here as well as in useMotion, on the same
 * elements with two observers and two different curves. useMotion owns them
 * now; it is also the one that respects reduced motion.
 */
export default function useScrollFx() {
  useEffect(() => {
    const bar = document.querySelector('[data-progress-bar]');
    const rail = document.querySelector('[data-rail]');
    const nav = document.querySelector('.cn-nav');
    let maxScroll = 1;
    let railTop = 0;
    let railH = 1;
    let railBase = 0;
    let queued = false;

    /* The rail follows the page until someone reaches for it. After that it
       is theirs: dragging a card into view and then having the next turn of
       the wheel yank it somewhere else is the page arguing with the hand on
       it. */
    // Sideways travel tied to vertical scroll is exactly the kind of motion
    // reduced-motion asks to be spared, so under it the rail starts held.
    let railHeld = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const holdRail = () => {
      railHeld = true;
      rail.removeAttribute('data-driven');
    };
    const onRailWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) holdRail();
    };
    if (rail && !railHeld) {
      rail.setAttribute('data-driven', '');
      rail.addEventListener('pointerdown', holdRail, { passive: true });
      rail.addEventListener('touchstart', holdRail, { passive: true });
      rail.addEventListener('wheel', onRailWheel, { passive: true });
    }

    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (rail) {
        railTop = rail.getBoundingClientRect().top + scrollY;
        railH = rail.offsetHeight;
        railBase = rail.scrollWidth - rail.clientWidth;
      }
    };

    const apply = () => {
      queued = false;
      const p = Math.min(1, scrollY / maxScroll);
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
      if (rail && !railHeld && railBase > 0) {
        const q = Math.min(1, Math.max(0, (scrollY + innerHeight - railTop) / (innerHeight + railH)));
        rail.scrollLeft = q * railBase;
      }
    };

    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(apply);
      }
    };

    /* Nav tone. The observer's root is shrunk to a one-pixel line across the
       middle of the bar, so exactly one section intersects it at a time and
       nothing has to be measured on scroll. Rebuilt on resize, because the
       margins are in pixels. */
    let toneIO = null;
    const watchTone = () => {
      if (toneIO) toneIO.disconnect();
      if (!nav) return;
      const line = Math.round(nav.offsetHeight / 2);
      toneIO = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const g = e.target.dataset.ground;
            nav.dataset.tone = g === 'dark' || g === 'brand' ? 'dark' : 'light';
          }
        },
        { rootMargin: `-${line}px 0px -${Math.max(0, innerHeight - line - 1)}px 0px` }
      );
      document.querySelectorAll('[data-ground]').forEach((el) => toneIO.observe(el));
    };

    const onResize = () => {
      measure();
      watchTone();
    };

    measure();
    apply();
    watchTone();
    const late = setTimeout(measure, 1400);
    addEventListener('resize', onResize);
    addEventListener('load', measure);
    addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(late);
      if (toneIO) toneIO.disconnect();
      if (rail) {
        rail.removeEventListener('pointerdown', holdRail);
        rail.removeEventListener('touchstart', holdRail);
        rail.removeEventListener('wheel', onRailWheel);
      }
      removeEventListener('resize', onResize);
      removeEventListener('load', measure);
      removeEventListener('scroll', onScroll);
    };
  }, []);
}
