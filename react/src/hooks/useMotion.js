import { useEffect } from 'react';

/**
 * Scroll motion for the page: staggered reveals, parallax on the app screens,
 * and the pinned gate sequence.
 *
 * Two mechanisms, chosen per effect rather than one for everything. Reveals
 * run on an IntersectionObserver and unobserve themselves — something that
 * happens once should not cost a scroll handler. Parallax and the pin are
 * position-linked, so they share a single rAF-throttled handler that reads
 * cached offsets and writes nothing but transforms.
 *
 * All of it is off under `prefers-reduced-motion`. The two position-linked
 * effects are also off below 900px: pinning a section on a phone takes the
 * scroll away from someone who has very little of it, and parallax at that
 * size is mostly jitter.
 */

const EASE = 'cubic-bezier(.22,.7,.28,1)';
const STEP_MS = 70; // between one card and the next
const MAX_STEPS = 5; // a 16-card grid must not make the last card wait a second

export default function useMotion() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* ── reveals ───────────────────────────────────────────────────────
       Only elements that start below the fold are hidden; anything already
       on screen at load is left alone, so the first paint is not a blank
       page waiting for an observer to fire. */
    const revealed = [];
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top <= innerHeight * 0.92) return;
      const sibs = el.parentElement
        ? [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'))
        : [el];
      const delay = Math.min(sibs.indexOf(el), MAX_STEPS) * STEP_MS;
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity .62s ${EASE} ${delay}ms, transform .62s ${EASE} ${delay}ms`;
      revealed.push(el);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.style.opacity = '1';
          e.target.style.transform = 'none';
          io.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    revealed.forEach((el) => io.observe(el));

    /* ── position-linked effects ──────────────────────────────────────── */
    const wide = () => innerWidth >= 900;

    const parallax = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
      el,
      // how far it lags the page, as a fraction of its distance from centre
      k: parseFloat(el.dataset.parallax) || 0.06
    }));
    /* The hero is a stuck stage too, and gets the same treatment: the flag it
       hangs off goes on only while this hook is driving, so reduced motion and
       a blocked script both fall back to ordinary flow. */
    const hero = document.querySelector('.cn-hero');

    const pins = [...document.querySelectorAll('[data-pin]')].map((el) => ({
      el,
      steps: [...el.querySelectorAll('[data-pin-step]')]
    }));

    let boxes = [];
    const measure = () => {
      // document-space geometry, read once per layout change rather than per
      // frame — reading it in the scroll handler is what makes parallax janky
      boxes = parallax.map(({ el, k }) => {
        const r = el.getBoundingClientRect();
        return { el, k, mid: r.top + scrollY + r.height / 2 };
      });
      /* The live flag has to go on *before* the height is read: it is what
         makes the track 300vh, so measuring first captures the collapsed
         height and every progress figure after it is wrong until the next
         remeasure. Setting it here also keeps it out of the frame loop. */
      if (hero) {
        if (wide()) hero.setAttribute('data-hero-live', '');
        else hero.removeAttribute('data-hero-live');
      }
      pins.forEach((p) => {
        if (wide()) p.el.setAttribute('data-pin-live', '');
        else p.el.removeAttribute('data-pin-live');
        const r = p.el.getBoundingClientRect();
        p.top = r.top + scrollY;
        p.height = r.height;
      });
    };

    let queued = false;
    const apply = () => {
      queued = false;
      const on = wide();
      const mid = scrollY + innerHeight / 2;

      for (const b of boxes) {
        if (!on) {
          b.el.style.transform = '';
          continue;
        }
        const d = mid - b.mid;
        // only while it is anywhere near the viewport
        if (Math.abs(d) > innerHeight * 1.6) continue;
        b.el.style.transform = `translate3d(0, ${(d * b.k).toFixed(2)}px, 0)`;
      }

      for (const p of pins) {
        if (!p.steps.length) continue;
        if (!on) {
          p.steps.forEach((s) => s.removeAttribute('data-on'));
          continue;
        }
        /* Progress through the part of the track that actually scrolls: the
           stage is stuck for `height - innerHeight`, and that span is what
           the steps are divided across. */
        const span = Math.max(1, p.height - innerHeight);
        const t = Math.min(1, Math.max(0, (scrollY - p.top) / span));
        // nudged off the very end so the last step holds rather than flicking
        const active = Math.min(p.steps.length - 1, Math.floor(t * p.steps.length * 0.999));
        p.steps.forEach((s, i) => {
          if (i <= active) s.setAttribute('data-on', '');
          else s.removeAttribute('data-on');
        });
      }
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    };

    measure();
    apply();
    const remeasure = () => {
      measure();
      apply();
    };
    const late = setTimeout(remeasure, 1200); // after fonts and lazy images land
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', remeasure);
    addEventListener('load', remeasure);

    return () => {
      io.disconnect();
      clearTimeout(late);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', remeasure);
      removeEventListener('load', remeasure);
    };
  }, []);
}
