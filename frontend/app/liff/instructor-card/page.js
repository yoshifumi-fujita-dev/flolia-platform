'use client'

import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { Loader2, AlertCircle, User, RefreshCw } from 'lucide-react'
import { initLiff, getProfile, isLoggedIn, login } from '@/lib/liff'

function InstructorCardContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [instructor, setInstructor] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null)
  const [lineProfile, setLineProfile] = useState(null)
  const [needsLink, setNeedsLink] = useState(false)

  useEffect(() => {
    initializeLiff()
  }, [])

  const initializeLiff = async () => {
    try {
      const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_INSTRUCTOR_ID || process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID)

      if (!liff) {
        setError('LIFF IDが設定されていません')
        setIsLoading(false)
        return
      }

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

      await fetchLinkedInstructor(profile.userId)
    } catch (err) {
      console.error('LIFF init error:', err)
      setError('初期化に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLinkedInstructor = async (lineUserId) => {
    try {
      const res = await fetch(`/api/instructor/me?line_user_id=${lineUserId}`)
      const data = await res.json()

      if (res.ok && data.instructor) {
        setInstructor(data.instructor)
        await fetchQRCode(data.instructor.qr_code_token)
        setNeedsLink(false)
      } else {
        setNeedsLink(true)
      }
    } catch (err) {
      console.error('Fetch instructor error:', err)
      setNeedsLink(true)
    }
  }

  const fetchQRCode = async (token) => {
    if (!token) return
    try {
      const res = await fetch(`/api/instructor/qrcode?token=${token}`)
      const data = await res.json()
      if (data.qrcode) {
        setQrCodeDataUrl(data.qrcode)
      }
    } catch (err) {
      console.error('QR code fetch error:', err)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    initializeLiff()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">エラー</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center p-4">
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
            インストラクター情報が見つかりません
          </h2>
          <p className="text-gray-600 mb-6">
            このLINEアカウントはインストラクターとして連携されていません。
            <br /><br />
            管理者に連絡して、LINE連携用QRコードを発行してもらってください。
          </p>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <RefreshCw className="w-5 h-5" />
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // インストラクターカード表示
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* インストラクターカード */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* ヘッダー部分 */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <Image src="/logo.png" alt="FLOLIA" width={120} height={40} className="h-10 w-auto brightness-0 invert" />
                <p className="text-emerald-200 text-sm mt-1">INSTRUCTOR CARD</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                インストラクター
              </span>
            </div>
          </div>

          {/* QRコード部分 */}
          <div className="p-8 flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-emerald-100">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="インストラクターQRコード"
                  className="w-56 h-56"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-gray-100 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              )}
            </div>

            <p className="text-gray-400 text-sm mt-4 text-center">
              出退勤時にこのQRコードを<br />タブレットにかざしてください
            </p>
          </div>

          {/* インストラクター情報 */}
          <div className="border-t bg-gray-50 p-6">
            <div className="flex items-center gap-4">
              {instructor?.image_url ? (
                <img
                  src={instructor.image_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-gray-900">{instructor?.name}</p>
                <p className="text-sm text-gray-500">インストラクター</p>
              </div>
            </div>
          </div>
        </div>

        {/* 更新ボタン */}
        <div className="mt-6 text-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
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

export default function LiffInstructorCardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <InstructorCardContent />
    </Suspense>
  )
}
