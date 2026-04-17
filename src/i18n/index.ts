import { ko } from './ko';
import { en } from './en';
import { zh } from './zh';
import { ja } from './ja';

export type Locale = 'ko' | 'en' | 'zh' | 'ja';
export type LocaleStrings = typeof ko;

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

export const LOCALE_ORDER: Locale[] = ['ko', 'en', 'zh', 'ja'];

export const locales: Record<Locale, LocaleStrings> = {
  ko,
  en: en as unknown as LocaleStrings,
  zh: zh as unknown as LocaleStrings,
  ja: ja as unknown as LocaleStrings,
};

const STORAGE_KEY = 'shogi12_locale';

let currentLocale: Locale = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved && LOCALE_ORDER.includes(saved) ? saved : 'en';
  } catch {
    return 'ko';
  }
})();

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: keyof LocaleStrings): string {
  return locales[currentLocale][key];
}

/** 국가 코드 → 국기 이모지. 빈 문자열이면 '🌐' 반환. */
export function countryFlag(code: string): string {
  if (!code) return '🌐';
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1F1E6))
    .join('');
}
