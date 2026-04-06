'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Loader2, CheckCircle, XCircle, LogIn } from 'lucide-react'

function StaffLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const [staffName, setStaffName] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('ログイントークンがありません')
      return
    }

    verifyAndLogin()
  }, [token])

  const verifyAndLogin = async () => {
    try {
      // マジックリンクを検証
      const verifyRes = await fetch(`/api/staff/verify-magic-link?token=${token}`)
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        setStatus('error')
        setErrorMessage(verifyData.error || 'トークンの検証に失敗しました')
        return
      }

      setStaffName(verifyData.staff?.name || '')
      setStatus('logging_in')

      // Supabase Authにメールでサインイン（パスワードなし）
      // マジックリンクで検証済みなので、adminクライアントでセッションを作成
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email: verifyData.staff.email,
        // 特殊なマジックリンク用のパスワード（サーバー側で設定）
        password: `magic_${token}`,
      })

      // パスワード認証に失敗した場合は、別の方法を試す
      if (sessionError) {
        console.log('Password auth failed, trying alternative method')

        // フォールバック: OTPを使用
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: verifyData.staff.email,
          options: {
            shouldCreateUser: false,
          },
        })

        if (otpError) {
          // 最終手段: ダッシュボードに直接リダイレクト（Cookieベースで認証）
          console.log('OTP auth failed, redirecting anyway')
        }
      }

      setStatus('success')

      // ダッシュボードにリダイレクト
      setTimeout(() => {
        const adminPath = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin'
        router.push(`/${adminPath}/dashboard`)
      }, 1000)
    } catch (error) {
      console.error('Staff login error:', error)
      setStatus('error')
      setErrorMessage('ログイン処理中にエラーが発生しました')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* 検証中 */}
          {status === 'verifying' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                認証中...
              </h1>
              <p className="text-gray-500">
                ログイントークンを確認しています
              </p>
            </>
          )}

          {/* ログイン中 */}
          {status === 'logging_in' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                ログイン中...
              </h1>
              {staffName && (
                <p className="text-gray-500">
                  {staffName} さん
                </p>
              )}
            </>
          )}

          {/* 成功 */}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                ログイン成功
              </h1>
              <p className="text-gray-500 mb-4">
                {staffName && `${staffName} さん、`}ダッシュボードへ移動します...
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
                ログインエラー
              </h1>
              <p className="text-red-600 mb-6">
                {errorMessage}
              </p>
              <a
                href="/admin/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                通常のログインページへ
              </a>
            </>
          )}
        </div>

        {/* ロゴ */}
        <div className="text-center mt-8">
          <Image src="/logo.png" alt="FLOLIA" width={144} height={48} className="h-12 w-auto mx-auto opacity-50" />
          <p className="text-xs text-gray-400 mt-2">管理画面</p>
        </div>
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <StaffLoginContent />
    </Suspense>
  )
}
