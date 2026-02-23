import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, MapPin } from "lucide-react";
import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { signup, type UserRole } from "@/services/authService";
import Magnet from "@/components/Magnet";
import { GlowCard } from "@/components/ui/spotlight-card";


const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const role = (searchParams.get("role") as UserRole) || "farmer";

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    location: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await signup({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        location: form.location,
        role,
      });

      toast.success("Account created! Redirecting to dashboard...");
      setTimeout(() => {
        navigate(`/${role}-dashboard`);
      }, 500);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        toast.error("An account already exists with this email.");
      } else if (code === "auth/weak-password") {
        toast.error("Password is too weak. Use at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else {
        toast.error("Signup failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = role === "buyer" ? t("auth.buyer") : role === "logistics" ? t("auth.logisticsProvider") : t("auth.farmer");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <nav className="border-b border-border px-5 md:px-8 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/vasudha-logo.png" alt="Vasudha Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight">Vasudha</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-5 md:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{t("auth.createAccount")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("auth.signingUpAs")} <span className="font-semibold text-primary">{roleLabel}</span>{" "}
              · <Link to="/get-started" className="underline hover:text-foreground">{t("auth.change")}</Link>
            </p>
          </div>

          <GlowCard glowColor="green" customSize className="w-full !aspect-auto p-0">
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("auth.fullName")}</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Rajesh Patil"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>

              {/* Email / Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("auth.emailOrPhone")}</label>
                <input
                  type="text"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@email.com or +91 98765 43210"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="City, State"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>

              <Magnet padding={40} magnetStrength={4} wrapperClassName="w-full">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm disabled:opacity-50"
                >
                  {isSubmitting ? t("auth.creatingAccount") : t("auth.signup")}
                </button>
              </Magnet>
            </form>
          </GlowCard>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              {t("auth.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
