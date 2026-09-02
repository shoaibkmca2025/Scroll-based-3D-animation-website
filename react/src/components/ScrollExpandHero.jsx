import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { pauseScroller, resumeScroller } from '../lib/scroller.js';

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
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const touchStartY = useRef(0);
  const sectionRef = useRef(null);

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
    const advance = (delta) => {
      const next = Math.min(Math.max(progress + delta, 0), 1);
      setProgress(next);
      if (next >= 1) {
        setExpanded(true);
        setShowContent(true);
      } else if (next < 0.75) {
        setShowContent(false);
      }
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
    return () => {
      removeEventListener('wheel', onWheel);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('touchend', onTouchEnd);
    };
  }, [progress, expanded]);

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

          {/* The two halves of the title part as the panel opens between
              them, which is what makes the expansion feel like it is pushing
              the page apart rather than just growing. */}
          <div className={`se-title ${textBlend ? 'se-title--blend' : ''}`}>
            <motion.h1 style={{ transform: `translateX(-${titleShift}vw)` }}>{firstWord}</motion.h1>
            <motion.h1 style={{ transform: `translateX(${titleShift}vw)` }}>{restOfTitle}</motion.h1>
          </div>

          <div className="se-meta">
            {date && <p style={{ transform: `translateX(-${titleShift}vw)` }}>{date}</p>}
            {scrollToExpand && (
              <p className="se-hint" style={{ transform: `translateX(${titleShift}vw)` }}>
                {scrollToExpand}
              </p>
            )}
          </div>
        </div>

        <motion.div
          className="se-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ duration: 0.7 }}
          aria-hidden={!showContent}
        >
          {children}
        </motion.div>
      </section>
    </div>
  );
}
