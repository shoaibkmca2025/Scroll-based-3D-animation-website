import { railScreens } from '../data.js';

export default function Screens() {
  return (
    <section data-cam="parking" className="cn-screens">
      <div className="cn-screens-head">
        <div data-reveal="1" className="cn-surface cn-surface--md cn-surface--cream">
          <div className="cn-kicker cn-kicker--neutral cn-mb12">Inside the app</div>
          <h2>The screens your society will live in.</h2>
        </div>
      </div>
      <div data-rail="1" className="cn-rail">
        {railScreens.map((s) => (
          <div key={s.title} className="cn-rail-item">
            <img src={s.img} alt={s.title} width="1170" height="2532" loading="lazy" />
            <div className="cn-rail-cap">
              <strong>{s.title}</strong>
              {s.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
