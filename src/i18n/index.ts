import { ko } from './ko';
import { en } from './en';

export type Locale = 'ko' | 'en';
export type LocaleStrings = typeof ko;

// Cast en to LocaleStrings since literal types differ per language
export const locales: Record<Locale, LocaleStrings> = { ko, en: en as unknown as LocaleStrings };

let currentLocale: Locale = 'ko';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: keyof LocaleStrings): string {
  return locales[currentLocale][key];
}
