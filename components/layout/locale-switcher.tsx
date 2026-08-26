"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { type Locale, localeCookieName } from "@/i18n/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("LocaleSwitcher");
  const nextLocale: Locale = locale === "en" ? "vi" : "en";

  function changeLocale() {
    document.cookie = `${localeCookieName}=${nextLocale};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="font-mono text-[0.65rem] uppercase"
      aria-label={t("changeLanguage", { language: t(nextLocale) })}
      title={t("changeLanguage", { language: t(nextLocale) })}
      onClick={changeLocale}
    >
      {locale}
    </Button>
  );
}
