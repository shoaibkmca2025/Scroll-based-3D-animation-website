import { audiences } from '../data.js';

export default function Audiences() {
  return (
    <section data-cam="towers" className="cn-sec">
      <div className="cn-aud-wrap">
        <div className="cn-aud-intro cn-surface cn-surface--md cn-surface--cream">
          <h2 data-reveal="1">Three products, one backend.</h2>
          <p data-reveal="1">
            Residents and guards share an app and see different screens. The committee gets its
            authority inside the same app.
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
                <img src={a.img} alt={a.alt} width="1170" height="2532" loading="lazy" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
