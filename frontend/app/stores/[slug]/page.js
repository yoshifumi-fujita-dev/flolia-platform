'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LandingPage from '@/components/landing/LandingPage'

export default function StorePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug
  const isPreview = searchParams.get('preview') === 'true'

  const [store, setStore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStore = async () => {
      try {
        // プレビューモードの場合は非公開の店舗も取得可能
        const url = isPreview
          ? `/api/public/store?site_slug=${slug}&preview=true`
          : `/api/public/store?site_slug=${slug}`
        const res = await fetch(url)
        if (!res.ok) {
          if (res.status === 404) {
            setError('notfound')
            return
          }
          throw new Error('店舗情報の取得に失敗しました')
        }
        const data = await res.json()
        setStore(data.store)
      } catch (err) {
        console.error('Store fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchStore()
    }
  }, [slug, isPreview])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (error === 'notfound') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">店舗が見つかりません</h1>
        <p className="text-gray-600 mb-6">指定されたURLの店舗は存在しないか、公開されていません。</p>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-full hover:bg-violet-600 transition-colors"
        >
          トップページへ戻る
        </Link>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">エラーが発生しました</h1>
        <p className="text-gray-600 mb-6">{error || '店舗情報を取得できませんでした'}</p>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-full hover:bg-violet-600 transition-colors"
        >
          トップページへ戻る
        </Link>
      </div>
    )
  }

  return <LandingPage store={store} storeSlug={slug} isPreview={isPreview} />
}
