'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, CheckCircle, XCircle, Link2, Sparkles } from 'lucide-react'
import { initLiff, isLoggedIn, login, getProfile, isInLineApp } from '@/lib/liff'

function InstructorLinkContent() {
  const searchParams = useSearchParams()

  // トークンを取得（liff.state対応）
  const getTokenFromParams = () => {
    const direct = searchParams.get('token')
    if (direct) return direct

    const state = searchParams.get('liff.state')
    if (state) {
      try {
        const decoded = decodeURIComponent(state)
        const queryPart = decoded.startsWith('?')
          ? decoded.slice(1)
          : decoded.includes('?')
            ? decoded.slice(decoded.indexOf('?') + 1)
            : decoded
        const stateParams = new URLSearchParams(queryPart)
        const fromState = stateParams.get('token')
        if (fromState) return fromState
      } catch (e) {
        // noop
      }
    }

    if (typeof window !== 'undefined' && window.location.hash) {
      try {
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
        const hashParams = new URLSearchParams(hash)
        const fromHash = hashParams.get('token')
        if (fromHash) return fromHash
      } catch (e) {
        // noop
      }
    }

    return null
  }

  const token = getTokenFromParams()
  const instructorName = searchParams.get('name')

  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const initAndLink = async () => {
      if (!token) {
        setStatus('error')
        setErrorMessage('連携トークンが見つかりません。管理画面からQRコードを再取得してください。')
        return
      }

      try {
        const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_INSTRUCTOR_ID || process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID)

        if (!liff) {
          setStatus('error')
          setErrorMessage('LINEアプリで開いてください')
          return
        }

        if (!isInLineApp()) {
          setStatus('error')
          setErrorMessage('このページはLINEアプリ内で開いてください')
          return
        }

        if (!isLoggedIn()) {
          login()
          return
        }

        const profile = await getProfile()
        if (!profile?.userId) {
          setStatus('error')
          setErrorMessage('LINEプロフィールの取得に失敗しました')
          return
        }

        setStatus('ready')
      } catch (error) {
        console.error('LIFF init error:', error)
        setStatus('error')
        setErrorMessage('初期化に失敗しました')
      }
    }

    initAndLink()
  }, [token])

  const handleLink = async () => {
    setStatus('linking')
    setErrorMessage('')

    try {
      const profile = await getProfile()
      if (!profile?.userId) {
        throw new Error('LINEプロフィールの取得に失敗しました')
      }

      const res = await fetch('/api/instructor/link-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: profile.userId,
          token: token,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'LINE連携に失敗しました')
      }

      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* ローディング */}
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                読み込み中...
              </h1>
              <p className="text-gray-500">
                しばらくお待ちください
              </p>
            </>
          )}

          {/* 連携準備完了 */}
          {status === 'ready' && (
            <>
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-violet-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                インストラクターLINE連携
              </h1>
              {instructorName && (
                <p className="text-gray-500 mb-4">
                  {instructorName} さん
                </p>
              )}
              <p className="text-sm text-gray-600 mb-6">
                LINEアカウントを連携すると、代行募集の通知をLINEで受け取れます。
              </p>
              <button
                onClick={handleLink}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors text-lg"
              >
                <Link2 className="w-6 h-6" />
                LINE連携する
              </button>
            </>
          )}

          {/* 連携中 */}
          {status === 'linking' && (
            <>
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                連携中...
              </h1>
              <p className="text-gray-500">
                しばらくお待ちください
              </p>
            </>
          )}

          {/* 成功 */}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                LINE連携が完了しました
              </h1>
              <p className="text-gray-500 mb-6">
                代行募集の通知がLINEに届くようになりました。
              </p>
              <p className="text-sm text-gray-400">
                この画面を閉じてください
              </p>
            </>
          )}

          {/* エラー */}
          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                エラーが発生しました
              </h1>
              <p className="text-red-600 mb-6">
                {errorMessage}
              </p>
            </>
          )}
        </div>

        {/* ロゴ */}
        <div className="text-center mt-8">
          <Image src="/logo.png" alt="FLOLIA" width={144} height={48} className="h-12 w-auto mx-auto opacity-50" />
        </div>
      </div>
    </div>
  )
}

export default function InstructorLineLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <InstructorLinkContent />
    </Suspense>
  )
}
