import { Link, useNavigate } from "react-router-dom";
import { Users, ShoppingCart, Truck, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import LiquidChrome from "@/components/LiquidChrome";
import { GlowCard } from "@/components/ui/spotlight-card";


const roles = [
  {
    id: "farmer",
    icon: Users,
    titleKey: "auth.farmer",
    descKey: "landing.farmersDesc",
    color: "border-primary hover:bg-primary/5",
    selectedColor: "border-primary bg-primary/10 ring-2 ring-primary/30",
  },
  {
    id: "buyer",
    icon: ShoppingCart,
    titleKey: "auth.buyer",
    descKey: "landing.buyersDesc",
    color: "border-accent hover:bg-accent/5",
    selectedColor: "border-accent bg-accent/10 ring-2 ring-accent/30",
  },
  {
    id: "logistics",
    icon: Truck,
    titleKey: "auth.logisticsProvider",
    descKey: "landing.logisticsProvidersDesc",
    color: "border-status-info hover:bg-status-info/5",
    selectedColor: "border-status-info bg-status-info/10 ring-2 ring-status-info/30",
  },
];

const GetStarted = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleContinue = () => {
    if (selected) {
      navigate(`/signup?role=${selected}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* LiquidChrome full-page background */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <LiquidChrome
          baseColor={[0.02, 0.07, 0.06]}
          speed={0.15}
          amplitude={0.25}
          frequencyX={2.5}
          frequencyY={2.5}
          interactive={true}
        />
        <div className="absolute inset-0 bg-background/75" />
      </div>

      {/* Content above WebGL layer */}
      <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>

        {/* Header */}
        <nav className="border-b border-border px-5 md:px-8 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/assets/vasudha-logo.png" alt="Vasudha Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-lg font-bold tracking-tight">Vasudha</span>
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center p-5 md:p-8">
          <GlowCard glowColor="green" customSize className="w-full max-w-2xl !aspect-auto p-8">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{t("auth.chooseRole")}</h1>
              <p className="text-muted-foreground">{t("auth.chooseRoleSubtitle")}</p>
            </div>

            <div className="grid gap-4">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelected(role.id)}
                  className={`flex items-start gap-5 p-6 rounded-2xl border-2 text-left transition-all duration-200 ${selected === role.id ? role.selectedColor : role.color
                    }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <role.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{t(role.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(role.descKey)}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleContinue}
              disabled={!selected}
              className="w-full mt-8 py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t("auth.getStarted")} <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t("auth.login")}
              </Link>
            </p>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
