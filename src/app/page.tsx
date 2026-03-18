import { getTranslations } from 'next-intl/server';
import {
  CinematicBackground,
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
import { ChatWidgetLazy } from '@/components/shared/chatbot/chat-widget-lazy';
import { ScrollRevealInit } from '@/components/shared/scroll-reveal-init';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <>
      <CinematicBackground />
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
        <ScrollRevealInit />
      </div>
    </>
  );
}
