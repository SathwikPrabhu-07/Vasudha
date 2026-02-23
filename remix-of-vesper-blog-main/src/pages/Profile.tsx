import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, MapPin, Phone, Mail, Edit2, Wheat, Loader2, Save, Building, Truck } from "lucide-react";
import { getCurrentUser, getUserProfile, updateUserProfile } from "@/services/authService";
import { toast } from "sonner";

const Profile = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editServiceArea, setEditServiceArea] = useState("");

  const user = getCurrentUser();
  const role = user?.role || "farmer";

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const p = await getUserProfile(user.id);
        setProfile(p);
        if (p) {
          setEditName(p.name || user.fullName || "");
          setEditLocation(p.location || "");
          setEditPhone(p.phone || "");
          setEditCompany(p.companyName || "");
          setEditServiceArea(p.serviceArea || "");
        }
      } catch (err) {
        console.error("[Profile] load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const data: Record<string, any> = {
        name: editName,
        location: editLocation,
        phone: editPhone,
      };
      if (role === "buyer") data.companyName = editCompany;
      if (role === "logistics") {
        data.companyName = editCompany;
        data.serviceArea = editServiceArea;
      }
      await updateUserProfile(user.id, data);
      setProfile((prev) => (prev ? { ...prev, ...data } : data));
      setEditing(false);
      toast.success(t("profile.title") + " updated!");
    } catch (err) {
      toast.error("Failed to save profile");
      console.error("[Profile] save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">{t("profile.loadingProfile")}</span>
      </div>
    );
  }

  const displayName = profile?.name || user?.fullName || t("common.user");
  const displayEmail = profile?.email || user?.email || "";
  const displayRole = user?.role ? t(`auth.${user.role}`) : t("common.user");
  const displayLocation = profile?.location || t("common.notSet");
  const displayPhone = profile?.phone || t("common.notSet");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("profile.subtitle")}
        </p>
      </div>

      {/* Profile card */}
      <div className="summary-card">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-primary" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-start justify-between">
              <div>
                {editing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-xl font-bold border-b border-primary bg-transparent outline-none"
                  />
                ) : (
                  <h2 className="text-xl font-bold">{displayName}</h2>
                )}
                <p className="text-sm text-muted-foreground">{displayRole}</p>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> {t("common.edit")}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs font-semibold text-muted-foreground hover:underline"
                  >
                    {t("buyer.cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? t("common.saving") : t("common.save")}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                {displayEmail}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {editing ? (
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder={t("common.location")}
                    className="border-b border-primary bg-transparent outline-none text-sm w-full"
                  />
                ) : (
                  displayLocation
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                {editing ? (
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder={t("profile.phone")}
                    className="border-b border-primary bg-transparent outline-none text-sm w-full"
                  />
                ) : (
                  displayPhone
                )}
              </div>
              {role === "farmer" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wheat className="w-4 h-4" />
                  {displayRole}
                </div>
              )}
              {(role === "buyer" || role === "logistics") && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="w-4 h-4" />
                  {editing ? (
                    <input
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      placeholder={t("profile.companyName")}
                      className="border-b border-primary bg-transparent outline-none text-sm w-full"
                    />
                  ) : (
                    profile?.companyName || t("common.notSet")
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific details */}
      <div className="summary-card">
        <h2 className="text-base font-semibold mb-4">
          {role === "farmer" ? t("profile.farmDetails") : role === "buyer" ? t("profile.companyDetails") : t("profile.serviceDetails")}
        </h2>
        <div className="space-y-4">
          {[
            { label: t("profile.name"), value: displayName },
            { label: t("profile.email"), value: displayEmail },
            { label: t("profile.role"), value: displayRole },
            { label: t("common.location"), value: displayLocation },
            { label: t("profile.phone"), value: displayPhone },
            ...(role === "buyer" || role === "logistics"
              ? [{ label: t("profile.companyName"), value: profile?.companyName || t("common.notSet") }]
              : []),
            ...(role === "logistics"
              ? [{
                label: t("profile.serviceArea"),
                value: editing ? (
                  <input
                    value={editServiceArea}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditServiceArea(e.target.value)}
                    placeholder="e.g. South India"
                    className="border-b border-primary bg-transparent outline-none text-sm"
                  />
                ) : (profile?.serviceArea || t("common.notSet")),
              }]
              : []),
            { label: t("profile.memberSince"), value: profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString("en-IN", { year: "numeric", month: "long" }) : "—" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
