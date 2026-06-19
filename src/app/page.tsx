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
  PricingSection,
  WhyUsSection,
  ContactSection,
  CtaSection,
  LandingFooter,
} from '@/components/landing';
import { AtmosphereCanvas, Preloader, LandingExperience } from '@/components/landing/experience';
import { ChatWidgetLazy } from '@/components/shared/chatbot/chat-widget-lazy';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <>
      {/* Static dark backdrop — rendered server-side so the page is never light-flashed */}
      <div className="fixed inset-0 z-0 bg-[#09090b]" aria-hidden="true" />
      {/* L5 gold-dust atmosphere (desktop + motion only; replaces the particle network) */}
      <AtmosphereCanvas />
      {/* Cinematic preloader (skipped for no-JS / reduced-motion / repeat visits) */}
      <Preloader />

      <div className="relative z-[1] min-h-screen text-white selection:bg-gold-500/30 selection:text-white overflow-x-hidden">
        {/* Skip to content link for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gold-500 focus:text-black focus:font-semibold focus:rounded-lg focus:text-sm"
        >
          {t('skipToContent')}
        </a>

        <LandingNav />

        <main id="main-content" className="relative z-[1]">
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
          <PricingSection />
          <WhyUsSection />
          <ContactSection />
          <CtaSection />
        </main>

        <LandingFooter />

        <ChatWidgetLazy />
        <LandingExperience />
      </div>
    </>
  );
}
