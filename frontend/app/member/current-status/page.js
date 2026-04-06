'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Users, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { initLiff, isLoggedIn, login } from '@/lib/liff'

const CROWD_LEVELS = {
  empty: { level: '空いています', color: 'text-green-600', bgColor: 'bg-green-100', icon: TrendingDown },
  moderate: { level: 'やや混雑', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Minus },
  busy: { level: '混雑', color: 'text-red-600', bgColor: 'bg-red-100', icon: TrendingUp },
}

export default function MemberCurrentStatusPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    initializeLiff()
  }, [])

  async function initializeLiff() {
    try {
      setLoading(true)

      // LIFF初期化（会員メニュー用LIFF ID）
      const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_MEMBER_MENU_ID)

      if (!liff) {
        throw new Error('LIFF の初期化に失敗しました')
      }

      if (!isLoggedIn()) {
        login()
        return
      }

      await fetchStatus()
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStatus() {
    try {
      setRefreshing(true)
      const res = await fetch('/api/member/current-status')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '状況の取得に失敗しました')
      }

      setStatus(data)
    } catch (err) {
      console.error('Error fetching status:', err)
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchStatus()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-pink-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/member')}
              className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition"
            >
              メニューに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/member')}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">現在の状況</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-900 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* 店舗ごとの在館状況 */}
        {status?.stores?.map((store) => {
          const crowdInfo = store.crowd_level ? CROWD_LEVELS[store.crowd_level] : null
          const CrowdIcon = crowdInfo?.icon

          return (
            <div key={store.store_id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{store.store_name}</h2>
                  <p className="text-sm text-gray-600">{store.address}</p>
                </div>
                {crowdInfo && (
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${crowdInfo.bgColor} ${crowdInfo.color}`}>
                    <CrowdIcon className="w-3 h-3" />
                    {crowdInfo.level}
                  </div>
                )}
              </div>

              {/* 在館人数 */}
              <div className="flex items-center justify-center py-8 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg mb-4">
                <div className="text-center">
                  <Users className="w-12 h-12 text-pink-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">現在の在館人数</p>
                  <p className="text-5xl font-bold text-gray-900">
                    {store.current_count}
                    <span className="text-2xl text-gray-500 ml-1">人</span>
                  </p>
                </div>
              </div>

              {/* 最終更新時刻 */}
              <p className="text-xs text-gray-500 text-center">
                最終更新: {new Date(store.last_updated).toLocaleTimeString('ja-JP')}
              </p>
            </div>
          )
        })}

        {/* 注意事項 */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">ご案内</h3>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>在館人数は入退館記録に基づいて自動的に更新されます</li>
            <li>混雑状況の目安としてご活用ください</li>
            <li>更新ボタンで最新の状況を確認できます</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
