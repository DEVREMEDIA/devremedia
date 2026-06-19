import { getTranslations } from 'next-intl/server';
import { richAccent } from './rich';
import { LandingL5ContactForm } from './landing-l5-contact-form';
import { SOCIAL_LINKS } from './constants';

export async function ContactSection() {
  const t = await getTranslations('landing');

  return (
    <section className="section chapter" id="contact" aria-labelledby="contact-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('contact.label')}</span>
            <h2 id="contact-heading" className="sec-title" data-l5-title>
              {t.rich('contact.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">10</span>
        </div>

        <div className="contact-grid">
          <div data-reveal>
            <p className="sec-lead">{t('contact.description')}</p>
            <LandingL5ContactForm />
          </div>

          <aside className="contact-aside" data-reveal>
            <div className="ci">
              <div className="clabel">{t('contact.thessalonikiOffice')}</div>
              <div className="cval">
                Θεμιστοκλή Σοφούλη 88
                <small>Καλαμαριά, Θεσσαλονίκη, 55 131</small>
              </div>
            </div>
            <div className="ci">
              <div className="clabel">{t('contact.callUs')}</div>
              <div className="cval">
                <a href="tel:+306984592968">+30 6984 592 968</a>
              </div>
            </div>
            <div className="ci">
              <div className="clabel">{t('contact.emailUs')}</div>
              <div className="cval">
                <a href="mailto:info@devremedia.com">info@devremedia.com</a>
              </div>
            </div>
            <div className="ci">
              <div className="clabel">{t('contact.followUs')}</div>
              <div className="contact-socials">
                {SOCIAL_LINKS.map((s) => (
                  <a key={s.platform} href={s.href} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
