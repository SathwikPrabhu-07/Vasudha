import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Users, ShoppingCart, Truck } from "lucide-react";
import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { login, type UserRole } from "@/services/authService";
import Magnet from "@/components/Magnet";
import { GlowCard } from "@/components/ui/spotlight-card";
import DotGrid from "@/components/DotGrid";


const roleOptions = [
  { id: "farmer" as UserRole, icon: Users, labelKey: "auth.farmer" },
  { id: "buyer" as UserRole, icon: ShoppingCart, labelKey: "auth.buyer" },
  { id: "logistics" as UserRole, icon: Truck, labelKey: "auth.logistics" },
];

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    (searchParams.get("role") as UserRole) || "farmer"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await login({
        email: form.email,
        password: form.password,
        role: selectedRole,
      });

      toast.success("Login successful! Redirecting...");
      setTimeout(() => {
        // Redirect by the Firestore role, not the UI selector
        navigate(`/${user.role}-dashboard`);
      }, 500);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        toast.error("No account found with this email.");
      } else if (code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background DotGrid */}
      <div className="absolute inset-0 pointer-events-auto z-0 opacity-40">
        <DotGrid
          dotSize={4}
          gap={20}
          baseColor="#064e3b"
          activeColor="#10b981"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      {/* Header */}
      <nav className="border-b border-border px-5 md:px-8 py-4 relative z-10 bg-background/50 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/vasudha-logo.png" alt="Vasudha Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight">Vasudha</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-5 md:p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{t("auth.welcomeBack")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          {/* Role Selection */}
          <div className="flex gap-2 mb-6">
            {roleOptions.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${selectedRole === role.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
              >
                <role.icon className="w-4 h-4" />
                <span>{t(role.labelKey)}</span>
              </button>
            ))}
          </div>

          <GlowCard glowColor="green" customSize className="w-full !aspect-auto p-0">
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t("auth.password")}</label>
                  <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
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

              <Magnet padding={40} magnetStrength={4} wrapperClassName="w-full">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm disabled:opacity-50"
                >
                  {isSubmitting ? t("auth.signingIn") : t("auth.login")}
                </button>
              </Magnet>
            </form>
          </GlowCard>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.noAccount")}{" "}
            <Link to="/get-started" className="text-primary font-semibold hover:underline">
              {t("auth.getStarted")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
