'use client'

import { useState, useEffect, Suspense } from 'react'
import { Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { initLiff, getProfile, isLoggedIn, login } from '@/lib/liff'

function InstructorAdminContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [instructor, setInstructor] = useState(null)
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
        setNeedsLink(false)
        // 管理画面へリダイレクト（マジックリンク方式）
        redirectToAdmin(data.instructor.id, lineUserId)
      } else {
        setNeedsLink(true)
      }
    } catch (err) {
      console.error('Fetch instructor error:', err)
      setNeedsLink(true)
    }
  }

  const redirectToAdmin = async (instructorId, lineUserId) => {
    try {
      // マジックリンクトークンを生成
      const res = await fetch('/api/instructor/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorId, lineUserId }),
      })

      if (res.ok) {
        const data = await res.json()
        // 管理画面にリダイレクト
        window.location.href = data.redirectUrl
      } else {
        setError('ログインリンクの生成に失敗しました')
      }
    } catch (err) {
      console.error('Magic link error:', err)
      setError('ログインリンクの生成に失敗しました')
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
          <p className="text-gray-500">管理画面へ移動中...</p>
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
            再試行
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

  // 正常な場合は自動リダイレクトするので、このUIは通常表示されない
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-gray-500">管理画面へ移動中...</p>
      </div>
    </div>
  )
}

export default function LiffInstructorAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <InstructorAdminContent />
    </Suspense>
  )
}
