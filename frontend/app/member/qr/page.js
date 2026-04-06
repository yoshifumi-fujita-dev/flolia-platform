'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import { initLiff, isLoggedIn, login, getProfile } from '@/lib/liff'

export default function MemberQRPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
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

      // QRコード生成
      if (data.member.qr_code_token) {
        const qrData = await QRCode.toDataURL(data.member.qr_code_token, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrDataUrl(qrData)
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/member')}
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">会員証QRコード</h1>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* 会員情報 */}
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold mb-4">
              会員番号: {member?.member_number}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {member?.last_name} {member?.first_name}
            </h2>
            <p className="text-gray-600">{member?.last_name_kana} {member?.first_name_kana}</p>
          </div>

          {/* QRコード */}
          {qrDataUrl && (
            <div className="flex flex-col items-center">
              <div className="bg-white p-6 rounded-lg shadow-xl border-4 border-pink-200 mb-6">
                <img
                  src={qrDataUrl}
                  alt="会員証QRコード"
                  className="w-72 h-72"
                />
              </div>
              <div className="text-center bg-pink-50 rounded-lg p-4 mb-4 max-w-md">
                <p className="text-sm text-gray-700 font-medium mb-2">
                  📱 入退館時にスキャンしてください
                </p>
                <p className="text-xs text-gray-600">
                  タブレット端末のカメラでこのQRコードを読み取ると、自動的に入退館が記録されます。
                </p>
              </div>
            </div>
          )}

          {/* 会員ステータス */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">ステータス</p>
                <p className="text-sm font-semibold text-gray-900">
                  {member?.status === 'active' && '✅ アクティブ'}
                  {member?.status === 'paused' && '⏸️ 休会中'}
                  {member?.status === 'trial' && '🎫 体験中'}
                  {member?.status === 'visitor' && '👋 ビジター'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">プラン</p>
                <p className="text-sm font-semibold text-gray-900">
                  {member?.plan || '未設定'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ 注意事項</h3>
          <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
            <li>このQRコードは会員証としてご利用いただけます</li>
            <li>他人に見せたり、共有しないでください</li>
            <li>QRコードのスクリーンショットは禁止です</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
