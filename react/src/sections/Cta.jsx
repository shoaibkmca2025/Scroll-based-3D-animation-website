import { useState } from 'react';
import { formFields } from '../data.js';

/* FormSubmit relays a JSON post to this inbox as an email — no backend and
   no account. The very first submission from grihive.com sends an "Activate
   Form" link to the inbox instead of the enquiry; nothing is delivered until
   it is clicked. */
const INBOX = 'Grihive@gmail.com';
const ENQUIRY_URL = `https://formsubmit.co/ajax/${INBOX}`;

export default function Cta() {
  // idle | sending | sent | failed
  const [status, setStatus] = useState('idle');

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus('sending');
    try {
      const res = await fetch(ENQUIRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          // labelled the way the form labels them, so the email reads plainly
          ...Object.fromEntries(formFields.map((f) => [f.label, data[f.id] || '—'])),
          _subject: `Demo request: ${data.society}, ${data.city}`,
          _template: 'table',
          _honey: data._honey
        })
      });
      const body = await res.json().catch(() => ({}));
      // an inbox not yet activated still answers 200, with success "false"
      if (!res.ok || String(body.success) !== 'true') throw new Error(body.message || `HTTP ${res.status}`);
      form.reset();
      setStatus('sent');
    } catch {
      // the fields are left as typed, so trying again is one press
      setStatus('failed');
    }
  };

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
        <form className="cn-form" onSubmit={submit}>
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
                pattern={f.pattern}
                title={f.title}
              />
            </div>
          ))}
          {/* a field people never see; bots fill it, and FormSubmit drops those */}
          <input className="cn-form-trap" type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Book a demo'}
          </button>
          <p className={`cn-form-msg${status === 'failed' ? ' cn-form-msg--bad' : ''}`} aria-live="polite">
            {status === 'sent' && 'Thanks, we have your request. We will call you to set up the demo.'}
            {status === 'failed' && (
              <>
                That did not go through. Check your connection and try again, or email us at{' '}
                <a href={`mailto:${INBOX}`}>{INBOX}</a>.
              </>
            )}
          </p>
        </form>
      </div>
    </section>
  );
}
