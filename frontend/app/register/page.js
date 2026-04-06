import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function fetchStore(siteSlug) {
  const params = siteSlug ? `?site_slug=${encodeURIComponent(siteSlug)}` : ''
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/public/store${params}`, {
    // 内部APIでも Vercel でキャッシュさせない
    cache: 'no-store',
  })
  if (!res.ok) {
    return null
  }
  const data = await res.json()
  return data?.store || null
}

export default async function RegisterEntryPage({ searchParams }) {
  // リッチメニューから store=slug を付けて呼び出す想定
  const storeSlug = searchParams?.store

  const store = await fetchStore(storeSlug)
  if (!store) {
    // 店舗が無効/存在しない場合は404
    notFound()
  }

  // 該当店舗の登録ページへリダイレクト
  redirect(`/stores/${store.site_slug}/register`)
}
