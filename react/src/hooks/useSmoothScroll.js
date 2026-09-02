import { useEffect } from 'react';
import { startScroller, stopScroller } from '../lib/scroller.js';

/**
 * Smooth scrolling for the whole page.
 *
 * A wheel notch on Windows arrives as a ~100 px jump, and a page that answers
 * it by teleporting 100 px reads as stuttering however fast it is drawing —
 * the frame rate was never the problem. This animates the real scroll position
 * between those jumps, so the text and the 3D backdrop travel together instead
 * of the model gliding while the copy hops.
 *
 * It drives `window.scrollTo` rather than transforming a wrapper, which is why
 * everything else in the page keeps working untouched: `position: sticky` on
 * the stage and the nav, `scrollY` in the camera, the reveal observers, and
 * the progress bar all still read a genuine scroll position.
 */
export default function useSmoothScroll() {
  useEffect(() => {
    // Someone who has asked for less motion should get the browser's own
    // scrolling, not a smoothed version of it.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    startScroller({
      /* Framerate-independent: `lerp` is applied per frame, so the same value
         settles faster on a 144 Hz screen than a 60 Hz one. `duration` with an
         easing is measured in seconds and behaves the same on both. */
      duration: 0.9,
      // Expo-out: moves off immediately and coasts to a stop, so a flick feels
      // answered at once and still lands softly.
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      /* Touch is left native. Phone browsers hand scrolling to the compositor,
         off the main thread, and taking it back to smooth it in JavaScript is
         slower and fights the platform's own rubber-banding. */
      syncTouch: false,
      /* The nav links are in-page anchors, and they get their own curve.
         Expo-out is right for a wheel notch — a hand asking for 100 px wants
         the answer immediately — but a nav click is a 2000 px journey, and
         starting that at full speed reads as a lurch: measured, the first
         frame alone moved 219 px. Ease-in-out over a longer duration
         accelerates out of rest and settles into the target, which is what a
         jump between sections should feel like. */
      anchors: {
        /* Stop short of the target by the height of the sticky nav, otherwise
           every anchor lands its heading underneath the bar. */
        offset: -76,
        duration: 1.4,
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
      }
      // the frame loop is owned by scroller.js — see the note there on why the
      // backdrop has to advance this before it reads it
    });

    return () => stopScroller();
  }, []);
}
