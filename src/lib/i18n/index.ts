export type Lang = 'it' | 'en' | 'fr' | 'es' | 'de';

export const SUPPORTED_LANGS: Lang[] = ['it', 'en', 'fr', 'es', 'de'];

export const LANG_META: Record<Lang, { label: string; flag: string; locale: string }> = {
  it: { label: 'Italiano',  flag: '🇮🇹', locale: 'it-IT' },
  en: { label: 'English',   flag: '🇬🇧', locale: 'en-GB' },
  fr: { label: 'Français',  flag: '🇫🇷', locale: 'fr-FR' },
  es: { label: 'Español',   flag: '🇪🇸', locale: 'es-ES' },
  de: { label: 'Deutsch',   flag: '🇩🇪', locale: 'de-DE' },
};

export const COOKIE_NAME = 'pss-lang';

/**
 * Determina la lingua da usare.
 * Priorità: cookie → Accept-Language header → inglese (fallback per lingue non supportate)
 */
export function detectLang(
  acceptLanguage: string | null,
  cookieValue: string | null,
): Lang {
  if (cookieValue && SUPPORTED_LANGS.includes(cookieValue as Lang)) {
    return cookieValue as Lang;
  }

  if (acceptLanguage) {
    const langs = acceptLanguage
      .split(',')
      .map((part) => {
        const [code, q] = part.trim().split(';q=');
        return { code: code.trim().toLowerCase().slice(0, 2), q: q ? parseFloat(q) : 1.0 };
      })
      .sort((a, b) => b.q - a.q);

    for (const { code } of langs) {
      if (SUPPORTED_LANGS.includes(code as Lang)) return code as Lang;
    }
  }

  // Lingua non supportata → inglese (es. cinese, arabo, giapponese…)
  return 'en';
}

// ── Dizionari ────────────────────────────────────────────────
import it from './it';
import en from './en';
import fr from './fr';
import es from './es';
import de from './de';

const DICTS: Record<Lang, Record<string, string>> = { it, en, fr, es, de };

export function createT(lang: Lang) {
  const dict = DICTS[lang];
  const fallback = DICTS['en'];
  return function t(key: string, vars?: Record<string, string>): string {
    let value = dict[key] ?? fallback[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{${k}}`, v);
      }
    }
    return value;
  };
}
