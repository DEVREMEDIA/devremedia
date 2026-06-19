import { getTranslations } from 'next-intl/server';
import {
  LandingNav,
  HeroSection,
  BrandsStrip,
  AboutSection,
  ApproachSection,
  ServicesSection,
  PortfolioSection,
  ProcessSection,
  CaseStudiesSection,
  TeamSection,
  StatsSection,
  VelocityMarquee,
  PricingSection,
  WhyUsSection,
  ContactSection,
  CtaSection,
  LandingFooter,
} from '@/components/landing';
import { AtmosphereCanvas, Preloader, LandingExperience } from '@/components/landing/experience';
import { displaySerif, bodyGrotesk } from '@/components/landing/fonts';
import { ChatWidgetLazy } from '@/components/shared/chatbot/chat-widget-lazy';
import '@/components/landing/landing-l5.css';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <div
      className={`l5-root ${displaySerif.variable} ${bodyGrotesk.variable}`}
      style={{ minHeight: '100vh' }}
    >
      {/* Gold-dust WebGL atmosphere (desktop + motion only; replaces the particle network) */}
      <AtmosphereCanvas />
      {/* Cinematic preloader (skipped for no-JS / reduced-motion / repeat visits) */}
      <Preloader />
      {/* Scroll-progress hairline (filled by the experience island) */}
      <div className="scroll-progress" data-scroll-progress aria-hidden="true" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-gold-500 focus:text-black focus:font-semibold focus:rounded-lg focus:text-sm"
      >
        {t('skipToContent')}
      </a>

      <LandingNav />

      <main id="main-content">
        <HeroSection />
        <BrandsStrip />
        <AboutSection />
        <ApproachSection />
        <ServicesSection />
        <PortfolioSection />
        <ProcessSection />
        <CaseStudiesSection />
        <TeamSection />
        <StatsSection />
        <VelocityMarquee />
        <PricingSection />
        <WhyUsSection />
        <ContactSection />
        <CtaSection />
      </main>

      <LandingFooter />

      <ChatWidgetLazy />
      <LandingExperience />
    </div>
  );
}
