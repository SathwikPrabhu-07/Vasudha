import { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ScrollVelocity from "@/components/ScrollVelocity";
import Magnet from "@/components/Magnet";
import LiquidChrome from "@/components/LiquidChrome";
import VariableProximity from "@/components/VariableProximity";
import { GlowCard } from "@/components/ui/spotlight-card";


import {

  Wheat,
  Brain,
  Handshake,
  Truck,
  TrendingDown,
  DollarSign,
  FileCheck,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Users,
  ShoppingCart,
  MapPin,
  Mail,
  Shield,
  FileText,
} from "lucide-react";

const stepIcons = [Wheat, Brain, Handshake, Truck];
const stepKeys = [
  { titleKey: "landing.step1Title", descKey: "landing.step1Desc" },
  { titleKey: "landing.step2Title", descKey: "landing.step2Desc" },
  { titleKey: "landing.step3Title", descKey: "landing.step3Desc" },
  { titleKey: "landing.step4Title", descKey: "landing.step4Desc" },
];

const audienceData = [
  { icon: Users, titleKey: "landing.farmers", descKey: "landing.farmersDesc", color: "bg-primary/10 text-primary" },
  { icon: ShoppingCart, titleKey: "landing.buyers", descKey: "landing.buyersDesc", color: "bg-accent/10 text-accent" },
  { icon: Truck, titleKey: "landing.logisticsProviders", descKey: "landing.logisticsProvidersDesc", color: "bg-status-info/10 text-status-info" },
];

const benefitData = [
  { icon: TrendingDown, titleKey: "landing.benefit1Title", descKey: "landing.benefit1Desc" },
  { icon: DollarSign, titleKey: "landing.benefit2Title", descKey: "landing.benefit2Desc" },
  { icon: FileCheck, titleKey: "landing.benefit3Title", descKey: "landing.benefit3Desc" },
  { icon: BarChart3, titleKey: "landing.benefit4Title", descKey: "landing.benefit4Desc" },
];

const Landing = () => {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/assets/vasudha-logo.png" alt="Vasudha Logo" className="w-9 h-9 rounded-xl object-contain" />
            <span className="text-xl font-bold tracking-tight text-foreground">Vasudha</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors hidden sm:block"
            >
              {t("landing.login")}
            </Link>
            <Link
              to="/get-started"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm"
            >
              {t("landing.getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* LiquidChrome WebGL background */}
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <LiquidChrome
            baseColor={[0.02, 0.09, 0.04]}
            speed={0.18}
            amplitude={0.28}
            frequencyX={2.8}
            frequencyY={2.8}
            interactive={true}
          />
          {/* Dark overlay so text remains readable */}
          <div className="absolute inset-0 bg-background/70" />
        </div>

        {/* Subtle gradient blobs — kept for extra depth */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" style={{ zIndex: 1 }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" style={{ zIndex: 1 }} />


        <div ref={heroRef} className="relative max-w-5xl mx-auto px-5 md:px-8 pt-20 md:pt-32 pb-20 md:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-xs font-semibold text-primary mb-6">
            <img src="/assets/vasudha-logo.png" alt="" className="w-4 h-4 object-contain" />
            {t("landing.heroBadge")}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            <VariableProximity
              label={t("landing.heroHeadline")}
              fromFontVariationSettings="'wght' 800, 'opsz' 9"
              toFontVariationSettings="'wght' 1000, 'opsz' 40"
              containerRef={heroRef}
              radius={120}
              falloff="exponential"
            />
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Magnet padding={30} magnetStrength={4}>
              <Link
                to="/get-started"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm"
              >
                {t("landing.getStarted")} <ArrowRight className="w-4 h-4" />
              </Link>
            </Magnet>
            <Magnet padding={30} magnetStrength={4}>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-foreground/15 hover:border-foreground/30 text-foreground font-semibold rounded-full transition-colors text-sm"
              >
                {t("landing.login")}
              </Link>
            </Magnet>
          </div>
        </div>
      </section>

      {/* Scroll Velocity Marquee */}
      <div className="py-6 bg-primary overflow-hidden">
        <ScrollVelocity
          texts={[t("landing.marquee1"), t("landing.marquee2")]}
          velocity={80}
          className="text-primary-foreground"
          numCopies={8}
        />
      </div>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div ref={howItWorksRef} className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">{t("landing.howItWorks")}</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              <VariableProximity
                label={t("landing.howItWorksHeadline")}
                fromFontVariationSettings="'wght' 700, 'opsz' 9"
                toFontVariationSettings="'wght' 1000, 'opsz' 40"
                containerRef={howItWorksRef}
                radius={110}
                falloff="linear"
              />
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stepKeys.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <div key={i} className="relative bg-background rounded-2xl border border-border p-6 text-center hover:shadow-md transition-shadow">
                  <div className="absolute -top-3 left-6 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 mt-2">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{t(step.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">{t("landing.whoIsItFor")}</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t("landing.whoIsItForHeadline")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audienceData.map((item, i) => (
              <GlowCard
                key={i}
                glowColor="green"
                customSize
                className="w-full flex flex-col p-8 !aspect-auto min-h-[260px]"
              >
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-5`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">{t(item.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">{t(item.descKey)}</p>
                <Link
                  to="/get-started"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  {t("landing.joinNow")} <ChevronRight className="w-4 h-4" />
                </Link>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary/[0.04] to-background">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">{t("landing.benefits")}</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t("landing.benefitsHeadline")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefitData.map((b, i) => (
              <div key={i} className="flex items-start gap-4 bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">{t(b.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(b.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t("landing.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            {t("landing.ctaSubtitle")}
          </p>
          <Link
            to="/get-started"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm"
          >
            {t("landing.getStartedFree")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src="/assets/vasudha-logo.png" alt="Vasudha Logo" className="w-8 h-8 rounded-lg object-contain" />
                <span className="font-bold text-lg">Vasudha</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.footerTagline")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">{t("landing.platform")}</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.about")}</a>
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.howItWorks")}</a>
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.pricing")}</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">{t("landing.support")}</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.contact")}</a>
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.faq")}</a>
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.helpCenter")}</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">{t("landing.legal")}</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.privacyPolicy")}</a>
                <a href="#" className="hover:text-foreground transition-colors">{t("landing.termsOfService")}</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            {t("landing.copyright")}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
