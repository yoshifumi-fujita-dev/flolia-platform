'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const I18nContext = createContext({
  locale: 'ja',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children, translations }) {
  const [locale, setLocaleState] = useState('ja')
  const [isHydrated, setIsHydrated] = useState(false)

  // クライアントサイドでlocalStorageから言語を復元
  useEffect(() => {
    const savedLocale = localStorage.getItem('flolia-locale')
    if (savedLocale && (savedLocale === 'ja' || savedLocale === 'en')) {
      setLocaleState(savedLocale)
    }
    setIsHydrated(true)
  }, [])

  // 言語切り替え関数
  const setLocale = useCallback((newLocale) => {
    if (newLocale === 'ja' || newLocale === 'en') {
      setLocaleState(newLocale)
      localStorage.setItem('flolia-locale', newLocale)
    }
  }, [])

  // 翻訳関数（ネストされたキーに対応: "nav.price" → translations.ja.nav.price）
  const t = useCallback((key, fallback = '') => {
    const keys = key.split('.')
    let value = translations?.[locale]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // フォールバック: 日本語から取得を試みる
        value = translations?.ja
        for (const fk of keys) {
          if (value && typeof value === 'object' && fk in value) {
            value = value[fk]
          } else {
            return fallback || key
          }
        }
        break
      }
    }

    return typeof value === 'string' ? value : fallback || key
  }, [locale, translations])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isHydrated }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
