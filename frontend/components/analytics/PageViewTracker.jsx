'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics/client'

const isAnalyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false'

export default function PageViewTracker({ storeSlug = null }) {
  const pathname = usePathname()
  const resolvedStoreSlug = storeSlug || (pathname?.startsWith('/stores/') ? pathname.split('/')[2] || null : null)

  useEffect(() => {
    if (!isAnalyticsEnabled) return
    if (!pathname) return
    // 管理画面や内部パスは計測対象外
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return

    // ページビューを記録
    trackPageView(resolvedStoreSlug, pathname)
  }, [pathname, resolvedStoreSlug])

  return null
}
