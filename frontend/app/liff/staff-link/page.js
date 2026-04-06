'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, CheckCircle, XCircle, Link2, Briefcase, AlertTriangle } from 'lucide-react'

function StaffLinkContent() {
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
  const staffName = searchParams.get('name') || searchParams.get('liff.state')?.includes('name=')
    ? decodeURIComponent(searchParams.get('liff.state')?.split('name=')[1]?.split('&')[0] || '')
    : null

  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState({})
  const [liffObject, setLiffObject] = useState(null)

  useEffect(() => {
    const initAndLink = async () => {
      // デバッグ情報を収集
      const debug = {
        url: typeof window !== 'undefined' ? window.location.href : 'SSR',
        token: token ? `${token.substring(0, 8)}...` : 'null',
        liffStaffId: process.env.NEXT_PUBLIC_LIFF_STAFF_ID || 'not set',
        liffId: process.env.NEXT_PUBLIC_LIFF_ID || 'not set',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      }
      setDebugInfo(debug)
      console.log('Debug info:', debug)

      if (!token) {
        setStatus('error')
        setErrorMessage('連携トークンが見つかりません。オンボーディングページからやり直してください。')
        return
      }

      try {
        // スタッフ用LIFF IDを使用（FLOLIA PARTNER用）
        const liffId = process.env.NEXT_PUBLIC_LIFF_STAFF_ID || process.env.NEXT_PUBLIC_LIFF_ID
        console.log('Using LIFF ID:', liffId)

        if (!liffId) {
          setStatus('error')
          setErrorMessage('LIFF IDが設定されていません。管理者にお問い合わせください。')
          return
        }

        // LIFFを直接インポートして初期化
        const liff = (await import('@line/liff')).default

        console.log('Initializing LIFF...')
        await liff.init({ liffId })
        console.log('LIFF initialized successfully')

        setLiffObject(liff)

        // デバッグ情報を更新
        const isInClient = liff.isInClient()
        const isLoggedIn = liff.isLoggedIn()
        const os = liff.getOS()

        setDebugInfo(prev => ({
          ...prev,
          isInClient,
          isLoggedIn,
          os,
        }))

        console.log('LIFF state:', { isInClient, isLoggedIn, os })

        // ログイン状態を確認
        if (!isLoggedIn) {
          console.log('Not logged in, redirecting to LINE login...')
          liff.login()
          return
        }

        // プロフィールを取得
        console.log('Getting profile...')
        try {
          const profile = await liff.getProfile()
          console.log('Profile obtained:', profile?.userId ? 'success' : 'failed')

          if (!profile?.userId) {
            setStatus('error')
            setErrorMessage('LINEプロフィールの取得に失敗しました')
            return
          }

          setDebugInfo(prev => ({
            ...prev,
            profileObtained: true,
            userId: profile.userId.substring(0, 8) + '...',
          }))

          setStatus('ready')
        } catch (profileError) {
          console.error('Profile error:', profileError)
          // プロフィール取得に失敗してもreadyにする（ボタン押下時に再取得）
          setDebugInfo(prev => ({
            ...prev,
            profileError: profileError.message,
          }))
          setStatus('ready')
        }
      } catch (error) {
        console.error('LIFF init error:', error)
        setStatus('error')
        setErrorMessage(`初期化エラー: ${error.message || error.toString()}`)
        setDebugInfo(prev => ({
          ...prev,
          error: error.message || error.toString(),
        }))
      }
    }

    initAndLink()
  }, [token])

  const handleLink = async () => {
    if (!liffObject) {
      setStatus('error')
      setErrorMessage('LIFFが初期化されていません')
      return
    }

    setStatus('linking')
    setErrorMessage('')

    try {
      console.log('Getting profile for link...')
      const profile = await liffObject.getProfile()
      console.log('Profile for link:', profile?.userId ? 'success' : 'failed')

      if (!profile?.userId) {
        throw new Error('LINEプロフィールの取得に失敗しました')
      }

      setDebugInfo(prev => ({
        ...prev,
        linkingUserId: profile.userId.substring(0, 8) + '...',
        linkingToken: token?.substring(0, 8) + '...',
      }))

      console.log('Calling link-line API...')
      const res = await fetch('/api/staff-onboarding/link-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: profile.userId,
          token: token,
        }),
      })

      const data = await res.json()
      console.log('API response:', res.status, data)

      setDebugInfo(prev => ({
        ...prev,
        apiStatus: res.status,
        apiResponse: data,
      }))

      if (!res.ok) {
        const errorDetails = data.details ? `: ${data.details}` : ''
        throw new Error(`${data.error || `API エラー (${res.status})`}${errorDetails}`)
      }

      if (!data.success) {
        throw new Error('API returned without success flag')
      }

      setStatus('success')
    } catch (error) {
      console.error('Link error:', error)
      setStatus('error')
      setErrorMessage(error.message)
      setDebugInfo(prev => ({
        ...prev,
        linkError: error.message,
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* ローディング */}
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
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
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                スタッフLINE連携
              </h1>
              {staffName && (
                <p className="text-gray-500 mb-4">
                  {staffName} さん
                </p>
              )}
              <p className="text-sm text-gray-600 mb-6">
                LINEアカウントを連携すると、重要な通知をLINEで受け取れます。
              </p>
              <button
                onClick={handleLink}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-lg"
              >
                <Link2 className="w-6 h-6" />
                LINE連携する
              </button>
            </>
          )}

          {/* 連携中 */}
          {status === 'linking' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
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
                重要な通知がLINEに届くようになりました。<br />
                この画面を閉じて、オンボーディングを続けてください。
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
              <p className="text-red-600 mb-4">
                {errorMessage}
              </p>
              {/* デバッグ情報（開発用） */}
              <details className="text-left mt-4 p-3 bg-gray-50 rounded-lg text-xs" open>
                <summary className="cursor-pointer text-gray-500">デバッグ情報</summary>
                <pre className="mt-2 overflow-auto text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                再読み込み
              </button>
            </>
          )}
        </div>

        {/* ロゴ */}
        <div className="text-center mt-8">
          <Image src="/logo.png" alt="FLOLIA" width={144} height={48} className="h-12 w-auto mx-auto opacity-50" />
          <p className="text-xs text-gray-400 mt-2">FLOLIA PARTNER</p>
        </div>
      </div>
    </div>
  )
}

// エラーバウンダリ用のフォールバック
function ErrorFallback({ error }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-12 h-12 text-yellow-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            読み込みエラー
          </h1>
          <p className="text-gray-600 mb-4">
            ページの読み込みに失敗しました。
          </p>
          <details className="text-left mt-4 p-3 bg-gray-50 rounded-lg text-xs">
            <summary className="cursor-pointer text-gray-500">エラー詳細</summary>
            <pre className="mt-2 overflow-auto text-red-600">
              {error?.message || error?.toString() || 'Unknown error'}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffLineLinkPage() {
  const [error, setError] = useState(null)

  useEffect(() => {
    // グローバルエラーハンドラー
    const handleError = (event) => {
      console.error('Global error:', event.error)
      setError(event.error)
    }

    const handleRejection = (event) => {
      console.error('Unhandled rejection:', event.reason)
      setError(event.reason)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  if (error) {
    return <ErrorFallback error={error} />
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <StaffLinkContent />
    </Suspense>
  )
}
