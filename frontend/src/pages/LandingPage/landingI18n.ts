import { translations, type Language } from "./landingI18nData";

export type { Language } from "./landingI18nData";

export function normalizeLanguage(value: string | null | undefined): Language {
  if (value === "en" || value === "ru" || value === "uz") return value;
  return "uz";
}

export function applyLanguage(lang: Language) {
  const langData = translations[lang];
  const elements = document.querySelectorAll<HTMLElement>("[data-i18n]");

  for (const element of elements) {
    const key = element.getAttribute("data-i18n");
    if (!key) continue;

    const translation = (langData as Record<string, string | undefined>)[key];
    if (!translation) continue;

    if (
      (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
      element.hasAttribute("placeholder")
    ) {
      element.placeholder = translation;
      continue;
    }

    if (element instanceof HTMLButtonElement) {
      element.textContent = translation;
      continue;
    }

    element.innerHTML = translation;
  }
}

export function getDocumentTitle(lang: Language) {
  const titles: Record<Language, string> = {
    uz: "Seero - Ilmiy metodlar bilan o'rganing",
    ru: "Seero - Изучайте с научными методами",
    en: "Seero - Learn with Science-Based Methods",
  };

  return titles[lang];
}

export function getAppAlertMessage(lang: Language) {
  const messages: Record<Language, string> = {
    uz: "Ilova hali ishlab chiqilmoqda. Tez orada chiqadi!",
    ru: "Приложение находится в разработке. Скоро будет доступно!",
    en: "The app is under development. Coming soon!",
  };

  return messages[lang];
}
