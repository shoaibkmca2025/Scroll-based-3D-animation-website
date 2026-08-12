import { useEffect } from 'react';

/**
 * The page's two scroll behaviours, ported unchanged from the original:
 *  1. `[data-reveal]` elements below the fold start faded + offset and settle
 *     as they come into view.
 *  2. The nav progress bar and the screens rail are driven from scrollY, with
 *     measurements cached and one rAF per scroll event — no per-frame layout.
 */
export default function useScrollFx() {
  useEffect(() => {
    const reveal = Array.from(document.querySelectorAll('[data-reveal]'));
    reveal.forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight * 0.9) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(26px)';
        el.style.transition =
          'opacity .7s cubic-bezier(.2,.7,.3,1), transform .7s cubic-bezier(.2,.7,.3,1)';
      }
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'none';
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px' }
    );
    reveal.forEach((el) => io.observe(el));

    const bar = document.querySelector('[data-progress-bar]');
    const rail = document.querySelector('[data-rail]');
    let maxScroll = 1;
    let railTop = 0;
    let railH = 1;
    let railBase = 0;
    let queued = false;

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
      if (rail && railBase > 0) {
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

    measure();
    apply();
    const late = setTimeout(measure, 1400);
    addEventListener('resize', measure);
    addEventListener('load', measure);
    addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      clearTimeout(late);
      removeEventListener('resize', measure);
      removeEventListener('load', measure);
      removeEventListener('scroll', onScroll);
    };
  }, []);
}
