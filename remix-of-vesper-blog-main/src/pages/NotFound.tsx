import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold font-sans">{t("notFound.title")}</h1>
        <p className="mb-4 text-xl text-foreground/60 font-serif">{t("notFound.subtitle")}</p>
        <a href="/" className="text-foreground underline hover:opacity-70 transition-opacity duration-200 font-sans uppercase text-sm tracking-wide">
          {t("notFound.goHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
