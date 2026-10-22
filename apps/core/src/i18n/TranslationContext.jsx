import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations';

const SUPPORTED = ['en', 'fr', 'sw', 'es'];
const STORAGE_KEY = 'ifb_language';

const LANGUAGE_MAP = {
  'fr-FR': 'fr', 'fr-BE': 'fr', 'fr-CA': 'fr', 'fr-CH': 'fr',
  'fr-CD': 'fr', 'fr-CM': 'fr', 'fr-CI': 'fr', 'fr-SN': 'fr', 'fr-ML': 'fr',
  'fr-BJ': 'fr', 'fr-BF': 'fr', 'fr-NE': 'fr', 'fr-TG': 'fr', 'fr-RW': 'fr',
  'sw-KE': 'sw', 'sw-TZ': 'sw', 'sw-UG': 'sw', 'sw-CD': 'sw',
  'es-ES': 'es', 'es-MX': 'es', 'es-AR': 'es', 'es-CO': 'es',
  'es-PE': 'es', 'es-VE': 'es', 'es-CL': 'es', 'es-EC': 'es',
};

function detectLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {}
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const lang of langs) {
    if (LANGUAGE_MAP[lang]) return LANGUAGE_MAP[lang];
    const base = lang.split('-')[0];
    if (SUPPORTED.includes(base)) return base;
  }
  return 'en';
}

const TranslationContext = createContext(null);

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState(() => detectLanguage());

  const t = useCallback((keyPath) => {
    const keys = keyPath.split('.');
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    if (val !== undefined && val !== null) return val;
    val = translations['en'];
    for (const k of keys) val = val?.[k];
    return val ?? keyPath;
  }, [lang]);

  const setLanguage = useCallback((newLang) => {
    if (!SUPPORTED.includes(newLang)) return;
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch {}
    setLang(newLang);
  }, []);

  return (
    <TranslationContext.Provider value={{ t, lang, setLanguage, supportedLanguages: SUPPORTED }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used inside TranslationProvider');
  return ctx;
}
