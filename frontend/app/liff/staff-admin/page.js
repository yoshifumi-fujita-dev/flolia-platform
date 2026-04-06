'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, CheckCircle, XCircle, LogIn, AlertTriangle } from 'lucide-react'

function StaffAdminContent() {
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [staffName, setStaffName] = useState('')

  useEffect(() => {
    const initAndRedirect = async () => {
      try {
        // LIFF IDを取得
        const liffId = process.env.NEXT_PUBLIC_LIFF_STAFF_ADMIN_ID ||
                       process.env.NEXT_PUBLIC_LIFF_STAFF_ID ||
                       process.env.NEXT_PUBLIC_LIFF_ID

        if (!liffId) {
          setStatus('error')
          setErrorMessage('LIFF IDが設定されていません')
          return
        }

        // LIFFを初期化
        const liff = (await import('@line/liff')).default
        await liff.init({ liffId })

        // ログイン状態を確認
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        // プロフィールを取得
        const profile = await liff.getProfile()
        if (!profile?.userId) {
          setStatus('error')
          setErrorMessage('LINEプロフィールの取得に失敗しました')
          return
        }

        setStatus('checking')

        // スタッフ情報を確認
        const meRes = await fetch(`/api/staff/me?line_user_id=${profile.userId}`)
        const meData = await meRes.json()

        if (!meRes.ok) {
          setStatus('error')
          setErrorMessage(meData.error || 'スタッフ情報の取得に失敗しました')
          return
        }

        setStaffName(meData.staff?.name || '')
        setStatus('generating')

        // マジックリンクを生成
        const linkRes = await fetch('/api/staff/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line_user_id: profile.userId }),
        })
        const linkData = await linkRes.json()

        if (!linkRes.ok) {
          setStatus('error')
          setErrorMessage(linkData.error || 'ログインリンクの生成に失敗しました')
          return
        }

        setStatus('redirecting')

        // 外部ブラウザで開く（LIFFブラウザでは管理画面が正常に動作しない可能性があるため）
        if (liff.isInClient()) {
          liff.openWindow({
            url: linkData.redirect_url,
            external: true,
          })
        } else {
          window.location.href = linkData.redirect_url
        }
      } catch (error) {
        console.error('Staff admin LIFF error:', error)
        setStatus('error')
        setErrorMessage(error.message || 'エラーが発生しました')
      }
    }

    initAndRedirect()
  }, [])

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
                認証中...
              </h1>
              <p className="text-gray-500">
                LINEアカウントを確認しています
              </p>
            </>
          )}

          {/* スタッフ確認中 */}
          {status === 'checking' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                スタッフ情報を確認中...
              </h1>
              <p className="text-gray-500">
                しばらくお待ちください
              </p>
            </>
          )}

          {/* マジックリンク生成中 */}
          {status === 'generating' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                ログイン準備中...
              </h1>
              {staffName && (
                <p className="text-gray-500">
                  {staffName} さん
                </p>
              )}
            </>
          )}

          {/* リダイレクト中 */}
          {status === 'redirecting' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                管理画面を開いています
              </h1>
              <p className="text-gray-500 mb-4">
                {staffName && `${staffName} さん、`}ブラウザが開きます
              </p>
              <p className="text-sm text-gray-400">
                画面が切り替わらない場合は、もう一度お試しください
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
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                再試行
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

export default function StaffAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <StaffAdminContent />
    </Suspense>
  )
}
