'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, QrCode, XCircle, AlertTriangle } from 'lucide-react'

function StaffQrContent() {
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [instructor, setInstructor] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    const initAndLoadQr = async () => {
      try {
        // LIFF IDを取得
        const liffId = process.env.NEXT_PUBLIC_LIFF_STAFF_QR_ID ||
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

        // スタッフ＋インストラクター情報を取得
        const meRes = await fetch(`/api/staff/me?line_user_id=${profile.userId}`)
        const meData = await meRes.json()

        if (!meRes.ok) {
          setStatus('error')
          setErrorMessage(meData.error || 'スタッフ情報の取得に失敗しました')
          return
        }

        // インストラクターでない場合はエラー
        if (!meData.instructor) {
          setStatus('not_instructor')
          return
        }

        setInstructor(meData.instructor)
        setStatus('loading_qr')

        // QRコードを取得
        const qrRes = await fetch(`/api/instructor/qrcode?token=${meData.instructor.qr_code_token}&format=dataurl`)
        const qrData = await qrRes.json()

        if (!qrRes.ok || !qrData.qrcode) {
          setStatus('error')
          setErrorMessage('QRコードの取得に失敗しました')
          return
        }

        setQrCodeUrl(qrData.qrcode)
        setStatus('ready')
      } catch (error) {
        console.error('Staff QR LIFF error:', error)
        setStatus('error')
        setErrorMessage(error.message || 'エラーが発生しました')
      }
    }

    initAndLoadQr()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          {/* ローディング */}
          {(status === 'loading' || status === 'checking' || status === 'loading_qr') && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">
                {status === 'loading' && '認証中...'}
                {status === 'checking' && 'インストラクター情報を確認中...'}
                {status === 'loading_qr' && 'QRコードを読み込み中...'}
              </h1>
            </>
          )}

          {/* 非インストラクター */}
          {status === 'not_instructor' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">
                インストラクター専用機能
              </h1>
              <p className="text-gray-600 text-sm">
                この機能はインストラクターとして登録されているスタッフのみ利用できます。
              </p>
            </>
          )}

          {/* QRコード表示 */}
          {status === 'ready' && instructor && (
            <>
              <div className="mb-4">
                <h1 className="text-lg font-bold text-gray-900">
                  {instructor.name}
                </h1>
                <p className="text-sm text-gray-500">インストラクターQR</p>
              </div>

              {/* QRコード */}
              <div className="bg-white p-4 rounded-xl border-2 border-green-200 inline-block mb-4">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="インストラクターQRコード"
                    className="w-64 h-64 mx-auto"
                  />
                )}
              </div>

              <p className="text-xs text-gray-400 mb-2">
                会員様にこのQRコードをスキャンしてもらってください
              </p>

              {/* インストラクター画像 */}
              {instructor.image_url && (
                <div className="mt-4 flex justify-center">
                  <img
                    src={instructor.image_url}
                    alt={instructor.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-200"
                  />
                </div>
              )}
            </>
          )}

          {/* エラー */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">
                エラーが発生しました
              </h1>
              <p className="text-red-600 text-sm mb-4">
                {errorMessage}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                再試行
              </button>
            </>
          )}
        </div>

        {/* ロゴ */}
        <div className="text-center mt-6">
          <Image src="/logo.png" alt="FLOLIA" width={120} height={40} className="h-10 w-auto mx-auto opacity-50" />
          <p className="text-xs text-gray-400 mt-1">FLOLIA PARTNER</p>
        </div>
      </div>
    </div>
  )
}

export default function StaffQrPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <StaffQrContent />
    </Suspense>
  )
}
