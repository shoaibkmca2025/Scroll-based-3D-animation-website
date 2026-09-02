import Shot from '../components/Shot.jsx';
import { audiences } from '../data.js';

export default function Audiences() {
  return (
    <section data-ground="paper" className="cn-sec">
      <div className="cn-aud-wrap">
        <div className="cn-aud-intro cn-surface cn-surface--md cn-surface--cream">
          <h2 data-reveal="1">Four people, one backend.</h2>
          <p data-reveal="1">
            Residents and guards share an app and see different screens. The committee gets its
            authority inside the same app. Household staff carry a monthly pass instead — the
            same scan that lets them in marks their attendance.
          </p>
        </div>

        <div className="cn-grid cn-aud-grid">
          {audiences.map((a) => (
            <div key={a.variant} data-reveal="1" className={`cn-aud cn-aud--${a.variant}`}>
              <div className={`cn-kicker cn-kicker--${a.kickerTone} cn-mb12`}>{a.kicker}</div>
              <h3>{a.title}</h3>
              <ul>
                {a.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <div className="cn-aud-shot">
                <Shot img={a.img} alt={a.alt} sizes="(max-width: 720px) 54vw, 170px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
