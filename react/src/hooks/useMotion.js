import { useEffect } from 'react';

/**
 * Scroll motion for the page: staggered reveals and the pinned gate sequence.
 *
 * Two mechanisms, chosen per effect rather than one for everything. Reveals
 * run on an IntersectionObserver and unobserve themselves — something that
 * happens once should not cost a scroll handler. The pin is position-linked,
 * so it runs from a rAF-throttled handler that reads cached offsets and
 * touches the DOM only when the active step changes.
 *
 * There was JS parallax here too. Its one user also had a reveal, whose
 * 0.62s transform transition was never removed, so every parallax write
 * started a fresh transition — the rubbery lag on Macs. Main-thread parallax
 * trails the scroll on Safari anyway; the hero's depth is done in CSS.
 *
 * All of it is off under `prefers-reduced-motion`. The pin is also off below
 * 900px: pinning a section on a phone takes the scroll away from someone who
 * has very little of it.
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

    /* ── the pinned gate ──────────────────────────────────────────────── */
    const wide = () => innerWidth >= 900;
    const pins = [...document.querySelectorAll('[data-pin]')].map((el) => ({
      el,
      steps: [...el.querySelectorAll('[data-pin-step]')],
      active: null
    }));

    const measure = () => {
      /* The live flag has to go on *before* the height is read: it is what
         makes the track tall, so measuring first captures the collapsed
         height and every progress figure after it is wrong until the next
         remeasure. Setting it here also keeps it out of the frame loop. */
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
      for (const p of pins) {
        if (!p.steps.length) continue;
        /* Progress through the part of the track that actually scrolls: the
           stage is stuck for `height - innerHeight`, and that span is what
           the steps are divided across. */
        const span = Math.max(1, p.height - innerHeight);
        const t = Math.min(1, Math.max(0, (scrollY - p.top) / span));
        // nudged off the very end so the last step holds rather than flicking
        const active = on ? Math.min(p.steps.length - 1, Math.floor(t * p.steps.length * 0.999)) : -1;
        // the attributes restyle the cards; write them only on a change of step
        if (active === p.active) continue;
        p.active = active;
        p.steps.forEach((s, i) => s.toggleAttribute('data-on', i <= active));
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
