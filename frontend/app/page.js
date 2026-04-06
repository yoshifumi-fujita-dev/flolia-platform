'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    // 公開中の店舗を取得してリダイレクト
    const fetchDefaultStore = async () => {
      try {
        const res = await fetch('/api/public/store')
        if (res.ok) {
          const data = await res.json()
          if (data.store?.site_slug) {
            router.replace(`/stores/${data.store.site_slug}`)
            return
          }
        }
        // 公開店舗がない場合
        setError(true)
      } catch {
        setError(true)
      }
    }
    fetchDefaultStore()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">現在公開中の店舗はありません</h1>
        <p className="text-gray-600">準備が整い次第公開いたします。</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
    </div>
  )
}
