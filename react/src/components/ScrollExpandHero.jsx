import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { pauseScroller, resumeScroller, scrollToAnchor } from '../lib/scroller.js';

// Keys that would scroll the page down. While the panel is opening the
// document is locked, so without this they did nothing at all and a keyboard
// user had no way past the first screen.
const FORWARD_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'End']);

/**
 * A hero whose media panel expands as you scroll, then releases the page and
 * reveals its content.
 *
 * Ported to this project's stack rather than dropped in as supplied. The
 * original is a Next.js + Tailwind + TypeScript component; this app is Vite +
 * React with a hand-written stylesheet, so:
 *
 *   next/image  ->  plain <img> (next/image needs the Next image server)
 *   .tsx        ->  .jsx, prop types dropped
 *   Tailwind    ->  the .se-* classes in app.css
 *
 * The behaviour is unchanged: wheel and touch drive `progress` from 0 to 1,
 * the page is pinned at the top until the panel is open, and scrolling back up
 * at the very top collapses it again.
 *
 * The one addition is pausing the smooth-scroll layer. This component calls
 * preventDefault on every wheel notch while it is opening, and Lenis is
 * listening for the same event — two handlers fighting over one gesture makes
 * the expansion stutter. Lenis is stopped while the panel is opening and
 * started again the moment it is open.
 */
export default function ScrollExpandHero({
  mediaSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend = false,
  panelContent,
  children
}) {
  /* Three cases where the expansion must not run at all, decided once before
     first paint rather than corrected afterwards:

       reduced motion  someone who asked for less movement should not have to
                       drive an animation to reach the page
       a hash in the   a deep link means they want that section, not the hero
       URL             — locking here throws them back to the top
       already         a reload part-way down restores a scroll position, and
       scrolled        locking would discard it

     In all three the panel starts open, the document is never locked, and the
     page behaves like an ordinary one. */
  const skip =
    typeof window !== 'undefined' &&
    (matchMedia('(prefers-reduced-motion: reduce)').matches || !!location.hash || window.scrollY > 0);

  const [progress, setProgress] = useState(skip ? 1 : 0);
  const [showContent, setShowContent] = useState(skip);
  const [expanded, setExpanded] = useState(skip);
  const [isPhone, setIsPhone] = useState(false);
  const touchStartY = useRef(0);
  const sectionRef = useRef(null);
  const tween = useRef(0);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  /* Pin the document while the panel is opening, and hand the wheel back the
     moment it is open.

     The original does this by calling preventDefault on every notch and
     scrolling back to 0 from a scroll handler. That is a race, and here it
     loses: the smooth-scroll layer runs its own rAF loop that writes the
     scroll position every frame, so it simply puts the page back where it
     wanted it and the hero slid away mid-expansion. Taking overflow off the
     document removes the race — there is nowhere to scroll to, wheel events
     still arrive, and progress still advances. */
  useEffect(() => {
    const root = document.documentElement;
    if (expanded) {
      root.classList.remove('se-lock');
      resumeScroller();
    } else {
      root.classList.add('se-lock');
      pauseScroller();
      scrollTo(0, 0);
    }
    return () => {
      root.classList.remove('se-lock');
      resumeScroller();
    };
  }, [expanded]);

  useEffect(() => {
    const setTo = (value) => {
      const next = Math.min(Math.max(value, 0), 1);
      setProgress(next);
      if (next >= 1) {
        setExpanded(true);
        setShowContent(true);
      } else if (next < 0.75) {
        setShowContent(false);
      }
    };

    // Any direct input takes over from a running open, from wherever the
    // panel has got to — it never has to finish first.
    const stopTween = () => cancelAnimationFrame(tween.current);
    const advance = (delta) => {
      stopTween();
      setTo(progressRef.current + delta);
    };

    /* For discrete input — a key, a link — that has no distance of its own to
       drive the panel with. Starts from the panel's current size, and eases
       out so it moves off at once and settles into the open state. */
    const openFully = () => {
      stopTween();
      const from = progressRef.current;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 560);
        setTo(from + (1 - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) tween.current = requestAnimationFrame(step);
      };
      tween.current = requestAnimationFrame(step);
    };

    const onWheel = (e) => {
      if (expanded && e.deltaY < 0 && window.scrollY <= 5) {
        setExpanded(false);
        e.preventDefault();
      } else if (!expanded) {
        e.preventDefault();
        advance(e.deltaY * 0.0009);
      }
    };

    const onKey = (e) => {
      if (expanded || e.altKey || e.ctrlKey || e.metaKey) return;
      // Tab opens it too, without being swallowed: focus moving into the
      // page would otherwise scroll a locked document to an element nobody
      // can scroll back from.
      if (e.key === 'Tab') openFully();
      else if (FORWARD_KEYS.has(e.key) && !e.target.closest?.('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        openFully();
      }
    };

    /* A nav link clicked while the page is locked. The browser would jump to
       the section anyway — a locked document still takes a programmatic
       scroll — and leave it locked there, unable to scroll in either
       direction until enough wheel notches had opened a hero nobody could
       see. Open it at once and make the trip the link asked for. */
    const onClick = (e) => {
      if (expanded || e.defaultPrevented || e.button !== 0) return;
      const link = e.target.closest?.('a[href^="#"]');
      const target = link && link.hash && document.querySelector(link.hash);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      stopTween();
      setTo(1);
      history.pushState(null, '', link.hash);
      // a frame later, once the effect above has released the scroller
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToAnchor(target)));
    };

    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (!touchStartY.current) return;
      const y = e.touches[0].clientY;
      const dy = touchStartY.current - y;
      if (expanded && dy < -20 && window.scrollY <= 5) {
        setExpanded(false);
        e.preventDefault();
      } else if (!expanded) {
        e.preventDefault();
        // a little more sensitive on the way back up, which is the harder
        // direction to complete on a short phone screen
        advance(dy * (dy < 0 ? 0.008 : 0.005));
        touchStartY.current = y;
      }
    };

    const onTouchEnd = () => {
      touchStartY.current = 0;
    };

    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchstart', onTouchStart, { passive: false });
    addEventListener('touchmove', onTouchMove, { passive: false });
    addEventListener('touchend', onTouchEnd);
    addEventListener('keydown', onKey);
    // capture, so it runs before the smooth-scroll layer's own anchor handler
    addEventListener('click', onClick, true);
    return () => {
      removeEventListener('wheel', onWheel);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('touchend', onTouchEnd);
      removeEventListener('keydown', onKey);
      removeEventListener('click', onClick, true);
    };
  }, [expanded]);

  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  useEffect(() => {
    const check = () => setIsPhone(innerWidth < 768);
    check();
    addEventListener('resize', check);
    return () => removeEventListener('resize', check);
  }, []);

  const panelWidth = 300 + progress * (isPhone ? 650 : 1250);
  const panelHeight = 400 + progress * (isPhone ? 200 : 400);
  const titleShift = progress * (isPhone ? 180 : 150);

  const [firstWord, ...rest] = (title || '').split(' ');
  const restOfTitle = rest.join(' ');

  return (
    <div ref={sectionRef} className="se-root">
      <section className="se-section">
        {/* The ground fades out as the panel takes over the screen. */}
        <motion.div
          className="se-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 - progress }}
          transition={{ duration: 0.1 }}
        >
          <img src={bgImageSrc} alt="" width="1920" height="1080" />
          <div className="se-bg-veil" />
        </motion.div>

        <div className="se-stage">
          <div
            className="se-panel"
            style={{ width: `${panelWidth}px`, height: `${panelHeight}px` }}
          >
            <img className="se-panel-media" src={mediaSrc} alt="" width="1600" height="900" />
            <motion.div
              className="se-panel-veil"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0.7 - progress * 0.3 }}
              transition={{ duration: 0.2 }}
            />
            {/* Whatever is layered inside the panel — the live mock-ups. */}
            <div
              className="se-panel-inner"
              style={{ opacity: Math.max(0, (progress - 0.45) / 0.4) }}
            >
              {panelContent}
            </div>
          </div>

          {date && (
            <p
              className="se-chip se-eyebrow"
              style={{ transform: `translateX(-${titleShift}vw)`, opacity: Math.max(0, 1 - progress * 2.5) }}
            >
              {date}
            </p>
          )}

          {/* The two halves of the title part as the panel opens between
              them, which is what makes the expansion feel like it is pushing
              the page apart rather than just growing. */}
          <div className={`se-title ${textBlend ? 'se-title--blend' : ''}`}>
            <motion.h1 style={{ transform: `translateX(-${titleShift}vw)` }}>{firstWord}</motion.h1>
            <motion.h1 style={{ transform: `translateX(${titleShift}vw)` }}>{restOfTitle}</motion.h1>
          </div>

          {/* Gone as soon as the gesture has started — by then it has been
              understood. */}
          {scrollToExpand && (
            <p
              className="se-chip se-hint"
              style={{ opacity: Math.max(0, 1 - progress * 5) }}
              aria-hidden="true"
            >
              {scrollToExpand}
              <svg viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </p>
          )}
        </div>

        {/* `inert` while hidden, not just aria-hidden: an invisible link that
            still takes focus sends a keyboard user to a button they cannot
            see. */}
        <motion.div
          className="se-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ duration: 0.7 }}
          aria-hidden={!showContent}
          inert={showContent ? undefined : ''}
        >
          {children}
        </motion.div>
      </section>
    </div>
  );
}
