import { useState, useCallback } from 'react';
import { translations } from './translations';

const SUPPORTED = ['en', 'fr', 'sw', 'es'];
const STORAGE_KEY = 'ifb_language';

// Maps browser language codes to our supported languages.
// French-speaking DRC (fr-CD), Swahili regions (sw-KE, sw-TZ, sw-CD), etc.
const LANGUAGE_MAP = {
  'fr-FR': 'fr', 'fr-BE': 'fr', 'fr-CA': 'fr', 'fr-CH': 'fr',
  'fr-CD': 'fr', 'fr-CM': 'fr', 'fr-CI': 'fr', 'fr-SN': 'fr', 'fr-ML': 'fr',
  'fr-BJ': 'fr', 'fr-BF': 'fr', 'fr-NE': 'fr', 'fr-TG': 'fr', 'fr-RW': 'fr',
  'sw-KE': 'sw', 'sw-TZ': 'sw', 'sw-UG': 'sw', 'sw-CD': 'sw',
  'es-ES': 'es', 'es-MX': 'es', 'es-AR': 'es', 'es-CO': 'es',
  'es-PE': 'es', 'es-VE': 'es', 'es-CL': 'es', 'es-EC': 'es',
};

function detectLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;

  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const lang of langs) {
    if (LANGUAGE_MAP[lang]) return LANGUAGE_MAP[lang];
    const base = lang.split('-')[0];
    if (SUPPORTED.includes(base)) return base;
  }
  return 'en';
}

export function useTranslation() {
  const [lang, setLang] = useState(() => detectLanguage());

  const t = useCallback((keyPath) => {
    const keys = keyPath.split('.');
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    if (val !== undefined && val !== null) return val;
    // Fallback to English
    val = translations['en'];
    for (const k of keys) val = val?.[k];
    return val ?? keyPath;
  }, [lang]);

  const setLanguage = useCallback((newLang) => {
    if (!SUPPORTED.includes(newLang)) return;
    localStorage.setItem(STORAGE_KEY, newLang);
    setLang(newLang);
  }, []);

  return { t, lang, setLanguage, supportedLanguages: SUPPORTED };
}
