import { useEffect, useRef, useState } from 'react';
import { guideChapters } from '../data.js';

const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' }
];

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* The user guide: fifteen short chapters in English and Hindi, in one player.

   The browser's own <video> controls, so play, seek, volume, fullscreen and
   the keyboard all work the way people already know. Nothing downloads until
   someone presses play (`preload="none"` with a poster), and a finished
   chapter rolls on to the next, so the guide can be watched straight
   through. */
export default function Guide() {
  const [lang, setLang] = useState('en');
  const [n, setN] = useState(0);
  const video = useRef(null);
  // play the new source once it is swapped in — only after someone asked to
  const playOnSwap = useRef(false);

  useEffect(() => {
    if (playOnSwap.current) video.current.play().catch(() => {});
  }, [lang, n]);

  const choose = (i) => {
    playOnSwap.current = true;
    if (i === n) video.current.play().catch(() => {});
    else setN(i);
    // on a phone the list sits under the player; bring the player back up
    video.current.scrollIntoView({ block: 'nearest' });
  };

  const chapter = guideChapters[n];
  const file = `guide/${lang}/${String(n + 1).padStart(2, '0')}`;

  return (
    <section data-ground="paper-warm" id="guide" className="cn-sec">
      <div className="cn-guide">
        <div className="cn-guide-head">
          <div>
            <div data-reveal="1" className="cn-kicker">
              User guide
            </div>
            <h2 data-reveal="1">Learn Grihive in a few minutes.</h2>
            <p data-reveal="1" className="cn-sub">
              Fifteen short videos, from registering to the gate, in English and Hindi. Share them
              with your residents, committee and guards.
            </p>
          </div>
          <div className="cn-seg" role="group" aria-label="Video language">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                lang={l.id}
                aria-pressed={lang === l.id}
                onClick={() => {
                  // keep playing in the other language if it was playing
                  playOnSwap.current = !video.current.paused;
                  setLang(l.id);
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cn-guide-body">
          <figure className="cn-guide-player">
            <video
              ref={video}
              src={`${file}.mp4`}
              poster={`${file}.jpg`}
              preload="none"
              controls
              playsInline
              lang={lang}
              aria-label={`${chapter[lang]} — Grihive user guide`}
              onEnded={() => {
                if (n < guideChapters.length - 1) {
                  playOnSwap.current = true;
                  setN(n + 1);
                }
              }}
            />
            <figcaption>
              Chapter {n + 1} of {guideChapters.length} ·{' '}
              <strong lang={lang}>{chapter[lang]}</strong>
            </figcaption>
          </figure>

          <ol className="cn-guide-list" lang={lang}>
            {guideChapters.map((c, i) => (
              <li key={c.en}>
                <button type="button" aria-current={i === n ? 'true' : undefined} onClick={() => choose(i)}>
                  <span className="cn-guide-n">{String(i + 1).padStart(2, '0')}</span>
                  <span>{c[lang]}</span>
                  <span className="cn-guide-d">{mmss(c.dur[lang === 'en' ? 0 : 1])}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
