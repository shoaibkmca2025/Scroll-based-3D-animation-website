import { railScreens } from '../data.js';
import Shot from '../components/Shot.jsx';

export default function Screens() {
  return (
    <section data-ground="dark" className="cn-screens">
      <span className="cn-orb cn-orb--a" aria-hidden="true" />
      <span className="cn-orb cn-orb--b" aria-hidden="true" />
      <div className="cn-screens-head">
        <div data-reveal="1" className="cn-kicker cn-kicker--onink cn-mb12">Inside the app</div>
        <h2 data-reveal="1">The screens your society will live in.</h2>
      </div>
      <div data-rail="1" className="cn-rail">
        {railScreens.map((s) => (
          <div key={s.title} className="cn-rail-item">
            <div className="cn-rail-shot">
              <Shot img={s.img} alt={s.title} sizes="(max-width: 720px) 208px, 244px" />
            </div>
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
