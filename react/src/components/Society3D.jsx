import { useEffect, useRef } from 'react';

/**
 * The 3D society behind the page.
 *
 * three.js is a separate chunk, but splitting it was only half the problem.
 * Building the world is a long block of synchronous main-thread work —
 * geometry, thirty-odd merged batches, the sky canvas, the environment
 * convolution and the first shader compile — and it used to run the moment the
 * chunk resolved, which was before the browser had painted anything at all.
 * The page was fully downloaded at 166 ms and still showed nothing until
 * 8.0 s, because the one thread that could paint it was busy building a model
 * nobody could see yet.
 *
 * So the fetch still starts immediately, in parallel with everything else, and
 * only `createSociety` waits: one frame to let the paint be committed, then an
 * idle slot so the build takes thread time the browser is not using. The
 * backdrop arrives a beat after the text instead of several seconds before it.
 */
export default function Society3D() {
  const host = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let dispose;
    let raf = 0;
    let idle = 0;

    // Fetching and evaluating the module is cheap next to building the scene,
    // and doing it now means the bytes are already there when the slot comes.
    const loading = import('../three/scene.js');

    const build = () => {
      loading.then(({ createSociety }) => {
        if (cancelled || !host.current) return;
        dispose = createSociety(host.current);
      });
    };

    /* A rAF callback runs *before* that frame's paint, so it cannot be the
       thing that waits for it — but a task scheduled from inside one runs
       after. The timeout is the floor: on a page that never goes idle the
       backdrop should still not be more than a moment behind. */
    raf = requestAnimationFrame(() => {
      idle =
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(build, { timeout: 300 })
          : setTimeout(build, 32);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      clearTimeout(idle);
      if (dispose) dispose();
    };
  }, []);

  return <div ref={host} className="cn-scene" aria-hidden="true" />;
}
