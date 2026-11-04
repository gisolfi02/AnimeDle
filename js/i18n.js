/* Animedle — multilingual UI (Phase 1: Home)
 * Shared engine: reusable for the four games in future phases.
 * Translation files are loaded from /locales/ relative to this script.
 */
(() => {
  "use strict";

  const LANGUAGES = ["it", "en", "es", "fr", "de"];
  const STORAGE_KEY = "animedle-language";
  const defaultLanguage = "it";
  const script = document.currentScript;
  const localesUrl = new URL("../locales/", script.src);
  const dictionaries = new Map();
  let currentLanguage = defaultLanguage;
  let dictionary = null;
  let latestRequest = 0;

  function getSavedLanguage() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return LANGUAGES.includes(saved) ? saved : defaultLanguage;
    } catch {
      return defaultLanguage;
    }
  }

  function saveLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* Storage may be unavailable (private browsing, privacy settings). */
    }
  }

  function findTranslation(source, key) {
    return key.split(".").reduce((node, part) => node?.[part], source);
  }

  async function loadTranslations(language) {
    if (dictionaries.has(language)) return dictionaries.get(language);

    const response = await fetch(new URL(`${language}.json`, localesUrl), { cache: "no-store" });
    if (!response.ok) throw new Error(`Translations not available (${response.status}): ${language}`);

    const translations = await response.json();
    dictionaries.set(language, translations);
    return translations;
  }

  function translateAttribute(attribute, targetAttribute) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((element) => {
      const key = element.getAttribute(`data-i18n-${attribute}`);
      const value = findTranslation(dictionary, key);
      if (typeof value === "string") element.setAttribute(targetAttribute, value);
    });
  }

  function translatePage() {
    if (!dictionary) return;

    document.documentElement.lang = currentLanguage;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = findTranslation(dictionary, element.dataset.i18n);
      if (typeof value === "string") element.textContent = value;
    });

    translateAttribute("aria-label", "aria-label");
    translateAttribute("title", "title");
    translateAttribute("placeholder", "placeholder");
    translateAttribute("content", "content");

    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
    });

    // Mostra nel pulsante circolare la bandiera della lingua selezionata.
    const activeOption = document.querySelector(`[data-language="${currentLanguage}"]`);
    const activeFlag = document.getElementById("currentLanguageFlag");
    const trigger = document.getElementById("languageTrigger");
    if (activeOption && activeFlag) activeFlag.src = activeOption.dataset.flagSrc;
    if (trigger) {
      const languageNames = {
        it: "italian",
        en: "english",
        es: "spanish",
        fr: "french",
        de: "german",
      };

      const activeName = findTranslation(dictionary, `shared.language.${languageNames[currentLanguage]}`) || currentLanguage;
      const action = findTranslation(dictionary, "shared.language.label");
      trigger.setAttribute("aria-label", `${action}: ${activeName}`);
      trigger.title = activeName;
    }
  }

  async function changeLanguage(language) {
    if (!LANGUAGES.includes(language)) return;
    const request = ++latestRequest;

    try {
      const translations = await loadTranslations(language);
      if (request !== latestRequest) return; // Ignore a slower, obsolete request.
      currentLanguage = language;
      dictionary = translations;
      translatePage();
      saveLanguage(language);
      document.dispatchEvent(
        new CustomEvent("animedle:languagechange", {
          detail: { language },
        }),
      );
    } catch (error) {
      console.error("Animedle: cannot load translations", error);
      if (request === latestRequest) translatePage(); // Restore button state.
    }
  }

  function start() {
    const picker = document.getElementById("languagePicker");
    const trigger = document.getElementById("languageTrigger");
    const menu = document.getElementById("languageMenu");

    function closeMenu(restoreFocus = false) {
      if (!trigger || !menu) return;
      const wasOpen = !menu.hidden;
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (wasOpen && restoreFocus) trigger.focus();
    }

    if (picker && trigger && menu) {
      trigger.addEventListener("click", () => {
        const willOpen = menu.hidden;
        menu.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(willOpen));
      });

      trigger.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          menu.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          (menu.querySelector('[aria-pressed="true"]') || menu.querySelector("button"))?.focus();
        }
      });

      document.addEventListener("click", (event) => {
        if (!picker.contains(event.target)) closeMenu();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !menu.hidden) closeMenu(true);
      });
    }

    document.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => {
        changeLanguage(button.dataset.language);
        closeMenu(true);
      });
    });
    changeLanguage(getSavedLanguage());
  }

  window.AnimedleI18n = {
    getLanguage: () => currentLanguage,
    t: (key) => findTranslation(dictionary, key) ?? key,
    changeLanguage,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
