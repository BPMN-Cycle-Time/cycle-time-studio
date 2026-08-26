import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale, localeCookieName, type Locale } from "@/i18n/config";

async function loadLocaleMessages(locale: Locale) {
  const [common, home, sidebar, editor, simulation, diagram, localeSwitcher] = await Promise.all([
    import(`@/i18n/locales/${locale}/common.json`),
    import(`@/i18n/locales/${locale}/home.json`),
    import(`@/i18n/locales/${locale}/sidebar.json`),
    import(`@/i18n/locales/${locale}/editor.json`),
    import(`@/i18n/locales/${locale}/simulation.json`),
    import(`@/i18n/locales/${locale}/diagram.json`),
    import(`@/i18n/locales/${locale}/localeSwitcher.json`),
  ]);

  return {
    common: common.default,
    Home: home.default,
    Sidebar: sidebar.default,
    editor: editor.default,
    simulation: simulation.default,
    diagram: diagram.default,
    LocaleSwitcher: localeSwitcher.default,
  };
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const messages = await loadLocaleMessages(locale);

  return { locale, messages };
});
