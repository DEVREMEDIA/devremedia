import { getTranslations } from 'next-intl/server';
import { MapPin, Phone, Mail, Instagram, Youtube, Linkedin } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { LandingContactForm } from '@/components/shared/landing-contact-form';
import { SOCIAL_LINKS } from './constants';

function getSocialIcon(platform: string) {
  switch (platform) {
    case 'instagram':
      return <Instagram className="h-5 w-5" aria-hidden="true" />;
    case 'linkedin':
      return <Linkedin className="h-5 w-5" aria-hidden="true" />;
    case 'youtube':
      return <Youtube className="h-5 w-5" aria-hidden="true" />;
    default:
      return null;
  }
}

export async function ContactSection() {
  const t = await getTranslations('landing');

  const offices = [
    { title: t('contact.thessalonikiOffice'), address: t('contact.thessalonikiAddress') },
  ];

  return (
    <section
      id="contact"
      className="relative py-24 sm:py-32 md:py-40"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-24">
          <div>
            <ScrollReveal>
              <span className="text-gold-500 text-xs font-semibold tracking-[0.2em] uppercase">
                {t('contact.label')}
              </span>
              <h2
                id="contact-heading"
                className="mt-3 sm:mt-4 text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.05] mb-2 sm:mb-3"
              >
                {t('contact.title')}
              </h2>
              <p className="text-zinc-400 mb-8 sm:mb-10">{t('contact.description')}</p>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <LandingContactForm />
            </ScrollReveal>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {/* Offices */}
            {offices.map((office, i) => (
              <ScrollReveal key={i} delay={300 + i * 100}>
                <div className="glass-card rounded-xl p-5 sm:p-6">
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 sm:mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gold-500 flex-shrink-0" aria-hidden="true" />
                    {office.title}
                  </h3>
                  <p className="text-zinc-400 text-sm pl-6">{office.address}</p>
                </div>
              </ScrollReveal>
            ))}

            {/* Phone */}
            <ScrollReveal delay={500}>
              <div className="glass-card rounded-xl p-5 sm:p-6">
                <h3 className="text-sm sm:text-base font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gold-500 flex-shrink-0" aria-hidden="true" />
                  {t('contact.callUs')}
                </h3>
                <a
                  href="tel:+306984592968"
                  className="text-zinc-400 text-sm pl-6 min-h-[48px] inline-flex items-center hover:text-gold-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  +30 6984 592 968
                </a>
              </div>
            </ScrollReveal>

            {/* Email */}
            <ScrollReveal delay={600}>
              <div className="glass-card rounded-xl p-5 sm:p-6">
                <h3 className="text-sm sm:text-base font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gold-500 flex-shrink-0" aria-hidden="true" />
                  {t('contact.emailUs')}
                </h3>
                <a
                  href="mailto:info@devremedia.com"
                  className="text-gold-500 hover:text-gold-400 text-sm pl-6 min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  info@devremedia.com
                </a>
              </div>
            </ScrollReveal>

            {/* Social */}
            <ScrollReveal delay={700}>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-3 sm:mb-4">
                  {t('contact.followUs')}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  {SOCIAL_LINKS.map((social) => (
                    <a
                      key={social.platform}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-zinc-400 hover:text-gold-500 hover:border-gold-500/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                      aria-label={`${t('contact.followUs')} - ${social.label}`}
                    >
                      {getSocialIcon(social.platform)}
                    </a>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
