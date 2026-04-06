'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, CheckCircle, XCircle, Link2 } from 'lucide-react'
import { initLiff, isLoggedIn, login, getProfile, isInLineApp } from '@/lib/liff'

function LinkContent() {
  const searchParams = useSearchParams()

  // ログインリダイレクト後にクエリが liff.state / hash に入る場合があるためフォールバックで取得
  const getTokenFromParams = () => {
    // 1) 通常のクエリ
    const direct = searchParams.get('token')
    if (direct) return direct

    // 2) liff.state に入るケース
    const state = searchParams.get('liff.state')
    if (state) {
      try {
        const decoded = decodeURIComponent(state)
        // 例: "/liff/link?token=...&slug=..."
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

    // 3) hash に入るケース（一部環境でリダイレクト時に # 以下へ移動する場合の保険）
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
  const memberNumber = searchParams.get('memberNumber')
  const slug = searchParams.get('slug')

  const [status, setStatus] = useState('loading') // loading, ready, linking, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [debugUrl, setDebugUrl] = useState({ href: '', hash: '', search: '' })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDebugUrl({
        href: window.location.href,
        hash: window.location.hash,
        search: window.location.search,
      })
    }
  }, [])

  useEffect(() => {
    const initAndLink = async () => {
      if (!token) {
        setStatus('error')
        setErrorMessage('連携トークンが見つかりません')
        return
      }

      try {
        const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID)

        if (!liff) {
          setStatus('error')
          setErrorMessage('LINEアプリで開いてください')
          return
        }

        // LINEアプリ内でない場合
        if (!isInLineApp()) {
          setStatus('error')
          setErrorMessage('このページはLINEアプリ内で開いてください')
          return
        }

        // ログインしていない場合
        if (!isLoggedIn()) {
          login()
          return
        }

        // プロフィール取得
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

      const res = await fetch('/api/member/link-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: profile.userId,
          member_token: token,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'LINE連携に失敗しました')
      }

      setStatus('success')

      // 連携完了を元の完了画面へ伝えるためリダイレクト
      try {
        const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
        const targetPath = slug ? `/stores/${slug}/register/complete` : '/register/complete'
        const url = new URL(base + targetPath)
        url.searchParams.set('lineLinked', '1')
        if (memberNumber) url.searchParams.set('memberNumber', memberNumber)
        if (token) url.searchParams.set('qrToken', token)
        window.location.href = url.toString()
      } catch (e) {
        // リダイレクトに失敗した場合はメッセージだけ表示
        console.error('Redirect after link failed', e)
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message)
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
                <Link2 className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                LINE連携
              </h1>
              {memberNumber && (
                <p className="text-gray-500 mb-6">
                  会員番号: <span className="font-bold text-green-600">{String(memberNumber).padStart(4, '0')}</span>
                </p>
              )}
              <p className="text-sm text-gray-600 mb-6">
                下のボタンをタップして、会員情報とLINEアカウントを紐付けてください。
                連携後はLINEリッチメニューから会員証QRコードを表示できます。
              </p>
              <button
                onClick={handleLink}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 bg-[#06C755] text-white rounded-lg font-medium hover:bg-[#05a847] transition-colors text-lg"
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
                LINEリッチメニューから会員証QRコードを表示できます。
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
              {debugUrl.href && (
                <div className="text-left text-xs text-gray-500 bg-red-50 border border-red-100 rounded-md p-3 space-y-1 break-all">
                  <div>href: {debugUrl.href}</div>
                  <div>search: {debugUrl.search}</div>
                  <div>hash: {debugUrl.hash}</div>
                </div>
              )}
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

export default function LineLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <LinkContent />
    </Suspense>
  )
}
