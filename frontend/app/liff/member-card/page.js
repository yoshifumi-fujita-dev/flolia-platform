'use client'

import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { Loader2, AlertCircle, User, RefreshCw } from 'lucide-react'
import { initLiff, getProfile, isInLineApp, isLoggedIn, login, getAccessToken } from '@/lib/liff'
import { useSearchParams } from 'next/navigation'

const STATUS_LABELS = {
  active: { label: '有効', color: 'bg-green-100 text-green-700' },
  trial: { label: '体験', color: 'bg-blue-100 text-blue-700' },
  visitor: { label: 'ビジター', color: 'bg-gray-100 text-gray-700' },
  paused: { label: '休会中', color: 'bg-yellow-100 text-yellow-700' },
  canceled: { label: '退会済み', color: 'bg-red-100 text-red-700' },
  pending: { label: '手続中', color: 'bg-orange-100 text-orange-700' },
}

function MemberCardContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [member, setMember] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null)
  const [lineProfile, setLineProfile] = useState(null)
  const [needsLink, setNeedsLink] = useState(false)
  const [liffAvailable, setLiffAvailable] = useState(false)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    initializeLiff()
  }, [])

  const initializeLiff = async () => {
    try {
      const liff = await initLiff()

      if (!liff) {
        // LIFF未設定の場合は通常のWebページとして表示
        setError('LIFF IDが設定されていません。LINE Developersで設定してください。')
        setIsLoading(false)
        return
      }

      setLiffAvailable(true)

      // LINEログインしていない場合
      if (!isLoggedIn()) {
        login()
        return
      }

      // LINEプロフィール取得
      const profile = await getProfile()
      if (!profile) {
        setError('LINEプロフィールの取得に失敗しました')
        setIsLoading(false)
        return
      }
      setLineProfile(profile)

      const memberToken = searchParams?.get('memberToken')

      // memberToken があれば先に紐付けを試行
      if (memberToken) {
        setLinking(true)
        const linkRes = await fetch('/api/member/link-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_user_id: profile.userId,
            member_token: memberToken,
          }),
        })
        if (!linkRes.ok) {
          const errJson = await linkRes.json().catch(() => ({}))
          setError(errJson.error || 'LINE連携に失敗しました')
          setLinking(false)
          setIsLoading(false)
          return
        }
        setLinking(false)
      }

      await fetchLinkedMember(profile.userId)
    } catch (err) {
      console.error('LIFF init error:', err)
      setError('初期化に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLinkedMember = async (lineUserId) => {
    const accessToken = getAccessToken()
    if (!accessToken) {
      setError('LINE認証が必要です')
      return
    }

    const res = await fetch(`/api/member/link-line?line_user_id=${lineUserId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()

    if (data.linked && data.member) {
      setMember(data.member)
      if (data.qrcode) {
        setQrCodeDataUrl(data.qrcode)
      }
      setNeedsLink(false)
    } else {
      setNeedsLink(true)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    initializeLiff()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">エラー</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <RefreshCw className="w-5 h-5" />
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // LINE未連携の場合
  if (needsLink) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {lineProfile && (
            <div className="mb-6">
              {lineProfile.pictureUrl && (
                <img
                  src={lineProfile.pictureUrl}
                  alt={lineProfile.displayName}
                  className="w-20 h-20 rounded-full mx-auto mb-3"
                />
              )}
              <p className="text-gray-600">{lineProfile.displayName} さん</p>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-3">
            会員情報が見つかりません
          </h2>
          <p className="text-gray-600 mb-6">
            このLINEアカウントはFLOLIA会員と連携されていません。
            <br /><br />
            会員登録時にLINE友だち追加をされていない場合は、店舗スタッフにお問い合わせください。
          </p>

          <p className="text-sm text-gray-400 mt-6">
            まだ会員登録がお済みでない方は、店舗ページから新規登録をお願いします。
          </p>
        </div>
      </div>
    )
  }

  // 会員証表示
  const status = STATUS_LABELS[member?.status] || STATUS_LABELS.pending

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* 会員証カード */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* ヘッダー部分 */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <Image src="/logo.png" alt="FLOLIA" width={120} height={40} className="h-10 w-auto brightness-0 invert" />
                <p className="text-violet-200 text-sm mt-1">MEMBER CARD</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white`}>
                {status.label}
              </span>
            </div>
          </div>

          {/* QRコード部分 */}
          <div className="p-8 flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-violet-100">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="会員QRコード"
                  className="w-56 h-56"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-gray-100 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                </div>
              )}
            </div>

            <p className="text-gray-400 text-sm mt-4 text-center">
              入退館時にこのQRコードを<br />タブレットにかざしてください
            </p>
          </div>

          {/* 会員情報 */}
          <div className="border-t bg-gray-50 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{member?.name}</p>
                <p className="text-sm text-gray-500">会員番号: {member?.member_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 更新ボタン */}
        <div className="mt-6 text-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700"
          >
            <RefreshCw className="w-4 h-4" />
            情報を更新
          </button>
        </div>

        {/* ロゴ */}
        <div className="text-center mt-8">
          <Image src="/logo.png" alt="FLOLIA" width={96} height={32} className="h-8 w-auto mx-auto opacity-30" />
        </div>
      </div>
    </div>
  )
}

export default function LiffMemberCardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <MemberCardContent />
    </Suspense>
  )
}
