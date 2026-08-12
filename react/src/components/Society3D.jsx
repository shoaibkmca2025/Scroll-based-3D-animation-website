import { useEffect, useRef } from 'react';

/**
 * The 3D society behind the page. three.js is pulled in as its own chunk on
 * mount, so the first paint never waits on it.
 */
export default function Society3D() {
  const host = useRef(null);

  useEffect(() => {
    let dispose;
    let cancelled = false;

    import('../three/scene.js').then(({ createSociety }) => {
      if (cancelled || !host.current) return;
      dispose = createSociety(host.current);
    });

    return () => {
      cancelled = true;
      if (dispose) dispose();
    };
  }, []);

  return <div ref={host} className="cn-scene" aria-hidden="true" />;
}
