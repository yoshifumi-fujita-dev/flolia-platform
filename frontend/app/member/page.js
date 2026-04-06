'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Users,
  CreditCard,
  Bell,
  LogOut,
  Loader2,
  QrCode,
  Gift
} from 'lucide-react'
import { initLiff, isLoggedIn, login, logout, getProfile } from '@/lib/liff'

export default function MemberMenuPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState(null)
  const [error, setError] = useState(null)

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

      // LINEログインチェック
      if (!isLoggedIn()) {
        login()
        return
      }

      // LINEユーザーID取得
      const profile = await getProfile()
      const lineUserId = profile?.userId

      if (!lineUserId) {
        throw new Error('LINEプロフィールの取得に失敗しました')
      }

      // 会員情報取得
      const res = await fetch(`/api/member/profile?line_user_id=${lineUserId}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '会員情報の取得に失敗しました')
      }

      setMember(data.member)
    } catch (err) {
      console.error('LIFF initialization error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
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
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition"
            >
              再試行
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
          <div>
            <h1 className="text-xl font-bold text-gray-900">会員メニュー</h1>
            <p className="text-sm text-gray-600">{member?.last_name} {member?.first_name} 様</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* メニュー */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* 会員証QRコード */}
        <button
          onClick={() => router.push('/member/qr')}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-gray-900">会員証QRコード</h2>
              <p className="text-sm text-gray-600">入退館時にスキャンしてください</p>
            </div>
            <div className="text-gray-400">›</div>
          </div>
        </button>

        {/* アクティビティ */}
        <button
          onClick={() => router.push('/member/history')}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-gray-900">アクティビティ</h2>
              <p className="text-sm text-gray-600">利用状況・カレンダーを確認</p>
            </div>
            <div className="text-gray-400">›</div>
          </div>
        </button>

        {/* 現在の状況 */}
        <button
          onClick={() => router.push('/member/current-status')}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-gray-900">現在の状況</h2>
              <p className="text-sm text-gray-600">ジム内の在館人数を確認</p>
            </div>
            <div className="text-gray-400">›</div>
          </div>
        </button>

        {/* ジムコネ */}
        <button
          onClick={() => router.push('/liff/gym-connect')}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 rounded-lg flex items-center justify-center">
              <Gift className="w-8 h-8 text-amber-600" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-gray-900">ジムコネ</h2>
              <p className="text-sm text-gray-600">提携店舗の特典をチェック</p>
            </div>
            <div className="text-gray-400">›</div>
          </div>
        </button>

        {/* クレジットカード更新 */}
        <button
          onClick={() => router.push('/member/payment')}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-gray-900">支払い方法更新</h2>
              <p className="text-sm text-gray-600">クレジットカード情報を変更</p>
            </div>
            <div className="text-gray-400">›</div>
          </div>
        </button>

        {/* お知らせ */}
        <button
          onClick={() => router.push('/member/announcements')}
          className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center">
              <Bell className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-gray-900">お知らせ</h2>
              <p className="text-sm text-gray-600">最新情報をチェック</p>
            </div>
            <div className="text-gray-400">›</div>
          </div>
        </button>
      </div>

      {/* フッター */}
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
        <p>FLOLIA - キックボクシングスタジオ</p>
      </div>
    </div>
  )
}
