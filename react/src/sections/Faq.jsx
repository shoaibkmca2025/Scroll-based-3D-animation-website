import { faqs } from '../data.js';

export default function Faq() {
  return (
    <section data-ground="paper" className="cn-sec cn-faq">
      <div className="cn-faq-panel cn-surface cn-surface--cream">
        <h2 data-reveal="1">Questions committees ask.</h2>
        {faqs.map((f) => (
          <details key={f.q} data-reveal="1" className="cn-faq-item">
            <summary>
              {f.q}
              <span>+</span>
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
