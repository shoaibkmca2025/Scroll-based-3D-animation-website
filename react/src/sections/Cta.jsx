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
          {/* Visible labels, not placeholders: a placeholder is gone the
              moment someone types, and with it what the field was for. */}
          {formFields.map((f) => (
            <div key={f.id}>
              <label htmlFor={`demo-${f.id}`}>
                {f.label}
                {!f.required && <span className="cn-form-opt"> (optional)</span>}
              </label>
              <input
                id={`demo-${f.id}`}
                name={f.id}
                type={f.type || 'text'}
                required={f.required}
                autoComplete={f.autoComplete}
                inputMode={f.inputMode}
              />
            </div>
          ))}
          {/* polite live region, so the change of label is announced too */}
          <button type="submit" aria-live="polite">
            {submitted ? 'Thanks — we will call you' : 'Book a demo'}
          </button>
        </form>
      </div>
    </section>
  );
}
