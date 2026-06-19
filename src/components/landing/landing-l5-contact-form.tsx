'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * L5 editorial contact form — underline fields, gold submit. Posts to the same
 * /api/contact endpoint as the original landing form.
 */
export function LandingL5ContactForm() {
  const t = useTranslations('landing.contact');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus('sending');

    const fd = new FormData(form);
    const data = {
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      subject: fd.get('subject') as string,
      message: fd.get('message') as string,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div role="status" className="contact-success">
        <p className="about-lead" style={{ marginBottom: 20 }}>
          {t('success')}
        </p>
        <button type="button" className="btn btn-line" onClick={() => setStatus('idle')}>
          {t('sendAnother')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <div className="field">
          <label htmlFor="l5-name">{t('nameLabel')}</label>
          <input id="l5-name" name="name" type="text" required placeholder={t('namePlaceholder')} />
        </div>
        <div className="field">
          <label htmlFor="l5-email">{t('emailLabel')}</label>
          <input
            id="l5-email"
            name="email"
            type="email"
            required
            placeholder={t('emailPlaceholder')}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="l5-phone">{t('phoneLabel')}</label>
          <input id="l5-phone" name="phone" type="text" placeholder={t('phonePlaceholder')} />
        </div>
        <div className="field">
          <label htmlFor="l5-subject">{t('subjectLabel')}</label>
          <input id="l5-subject" name="subject" type="text" placeholder={t('subjectPlaceholder')} />
        </div>
      </div>
      <div className="field full">
        <label htmlFor="l5-message">{t('messageLabel')}</label>
        <textarea
          id="l5-message"
          name="message"
          rows={4}
          required
          placeholder={t('messagePlaceholder')}
        />
      </div>

      {status === 'error' && (
        <p
          role="alert"
          className="contact-error"
          style={{ color: '#e08a8a', fontSize: 13, marginBottom: 16 }}
        >
          {t('error')}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-gold"
        disabled={status === 'sending'}
        aria-busy={status === 'sending'}
      >
        {status === 'sending' ? t('sending') : t('send')}
      </button>
    </form>
  );
}
