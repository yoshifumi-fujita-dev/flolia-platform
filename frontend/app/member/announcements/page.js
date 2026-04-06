'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Bell, Calendar, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { initLiff, isLoggedIn, login } from '@/lib/liff'

export default function MemberAnnouncementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
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

      await fetchAnnouncements()
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAnnouncements() {
    try {
      setRefreshing(true)
      const res = await fetch('/api/member/announcements')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'お知らせの取得に失敗しました')
      }

      setAnnouncements(data.announcements || [])
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchAnnouncements()
  }

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'important':
        return { bg: 'bg-red-100', text: 'text-red-800', label: '重要' }
      case 'event':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'イベント' }
      case 'maintenance':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'メンテナンス' }
      case 'campaign':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'キャンペーン' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'お知らせ' }
    }
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
            <h1 className="text-xl font-bold text-gray-900">お知らせ</h1>
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
        {announcements.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">新しいお知らせはありません</p>
          </div>
        )}

        {announcements.map((announcement) => {
          const categoryStyle = getCategoryStyle(announcement.category)

          return (
            <div
              key={announcement.id}
              className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition"
            >
              {/* カテゴリとタイトル */}
              <div className="flex items-start gap-3 mb-3">
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${categoryStyle.bg} ${categoryStyle.text}`}>
                  {categoryStyle.label}
                </span>
                {announcement.is_pinned && (
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-pink-100 text-pink-800">
                    📌 ピン留め
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-gray-900 mb-2">
                {announcement.title}
              </h2>

              {/* 日時 */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Calendar className="w-3 h-3" />
                <span>
                  {announcement.published_at
                    ? format(new Date(announcement.published_at), 'yyyy年MM月dd日(E) HH:mm', { locale: ja })
                    : format(new Date(announcement.created_at), 'yyyy年MM月dd日(E) HH:mm', { locale: ja })
                  }
                </span>
              </div>

              {/* 本文 */}
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {announcement.content}
              </div>

              {/* リンク */}
              {announcement.link_url && (
                <a
                  href={announcement.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-sm text-pink-600 hover:text-pink-700 font-medium"
                >
                  詳細を見る →
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
