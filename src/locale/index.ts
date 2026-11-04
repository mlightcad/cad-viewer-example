import { i18n as viewerI18n } from '@mlightcad/cad-viewer'
import { AcApI18n } from '@mlightcad/cad-simple-viewer'

import en from './en'
import zh from './zh'

/**
 * Merge the host app's command descriptions into the viewer's locales.
 *
 * `@mlightcad/cad-viewer` ships its own `vue-i18n` instance, so messages must be
 * registered on both registries: `AcApI18n` (framework-free core translation)
 * and `viewerI18n` (the Vue UI).
 */
export const initializeLocale = () => {
  const locales = [
    ['en', en],
    ['zh', zh]
  ] as const

  for (const [locale, messages] of locales) {
    AcApI18n.mergeLocaleMessage(locale, messages)
    viewerI18n.global.mergeLocaleMessage(locale, messages)
  }
}
