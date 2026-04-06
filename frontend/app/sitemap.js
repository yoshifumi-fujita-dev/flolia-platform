/**
 * 動的Sitemap生成
 *
 * Next.js 14のApp Routerでsitemap.xmlを自動生成
 * 公開中の店舗（is_active=true）のみをSitemapに含める
 */

import { createAnonClient } from '@/lib/supabase/server'

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flolia.jp'

  // Supabaseから公開中の店舗のみ取得
  const supabase = createAnonClient()
  const { data: stores, error } = await supabase
    .from('stores')
    .select('site_slug, updated_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch stores for sitemap:', error)
  }

  // 静的ページのURL
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/parental-consent`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // 公開中の店舗のURL（/stores/[slug]）
  const storePages =
    stores?.map((store) => ({
      url: `${baseUrl}/stores/${store.site_slug}`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    })) || []

  // 公開中の店舗の登録ページURL（/stores/[slug]/register）
  const registerPages =
    stores?.map((store) => ({
      url: `${baseUrl}/stores/${store.site_slug}/register`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    })) || []

  return [...staticPages, ...storePages, ...registerPages]
}
