import { useState } from 'react';
import { formFields } from '../data.js';

export default function Cta() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section data-ground="dark" id="demo" className="cn-sec cn-cta">
      <span className="cn-orb cn-orb--a" aria-hidden="true" />
      <span className="cn-orb cn-orb--b" aria-hidden="true" />
      <div className="cn-cta-panel">
        <div>
          <h2>Get your society onboarded.</h2>
          <p>
            Tell us about your society and we will set it up and walk your committee through it.
            Grihive is in live pilot with a small number of real societies.
          </p>
          <div className="cn-cta-note">
            Residents install one app.
            <br />
            Guards use the same app with a guard login.
            <br />
            The committee needs nothing extra.
          </div>
        </div>
        <form
          className="cn-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          {/* A placeholder is not a label: it is gone the moment someone types,
              and screen readers do not reliably announce it. The labels are
              visually hidden so the form keeps its look. */}
          {formFields.map((f) => (
            <div key={f.id}>
              <label className="cn-sr-only" htmlFor={`demo-${f.id}`}>
                {f.placeholder}
              </label>
              <input
                id={`demo-${f.id}`}
                name={f.id}
                type="text"
                placeholder={f.placeholder}
                required={f.required}
                autoComplete={f.autoComplete}
                inputMode={f.inputMode}
              />
            </div>
          ))}
          <button type="submit">{submitted ? 'Thanks — we will call you' : 'Book a demo'}</button>
        </form>
      </div>
    </section>
  );
}
