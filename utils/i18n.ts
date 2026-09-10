import { defaultLocale, isLocale, localeCookieName, type Locale } from "@/i18n/config";
import enCommon from "@/i18n/locales/en/common.json";
import viCommon from "@/i18n/locales/vi/common.json";
import enEditor from "@/i18n/locales/en/editor.json";
import viEditor from "@/i18n/locales/vi/editor.json";
import enSidebar from "@/i18n/locales/en/sidebar.json";
import viSidebar from "@/i18n/locales/vi/sidebar.json";
import enDiagram from "@/i18n/locales/en/diagram.json";
import viDiagram from "@/i18n/locales/vi/diagram.json";

type Namespace = "common" | "editor" | "sidebar" | "diagram";

type MessageShape = Record<string, unknown>;

const messages: Record<Locale, Record<Namespace, MessageShape>> = {
  en: {
    common: enCommon,
    editor: enEditor,
    sidebar: enSidebar,
    diagram: enDiagram,
  },
  vi: {
    common: viCommon,
    editor: viEditor,
    sidebar: viSidebar,
    diagram: viDiagram,
  },
};

function getNestedValue(obj: MessageShape, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function getClientLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const match = document.cookie.match(new RegExp(`${localeCookieName}=([^;]+)`));
  const value = match?.[1];
  return isLocale(value) ? value : defaultLocale;
}

export function t(
  namespace: Namespace,
  key: string,
  values?: Record<string, string | number>,
): string {
  const locale = getClientLocale();
  const nsMessages = messages[locale][namespace];
  const raw = getNestedValue(nsMessages, key);

  if (typeof raw !== "string") {
    // Fallback to English key value if missing; this preserves behavior in SSR.
    const fallbackRaw = getNestedValue(messages[defaultLocale][namespace], key);
    if (typeof fallbackRaw !== "string") return key;
    return interpolate(fallbackRaw, values);
  }

  return interpolate(raw, values);
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
