'use client'

import { useSearchParams, useParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle, RotateCcw, QrCode, ChevronDown, ChevronUp, Link2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { initLiff, isLoggedIn, login, getProfile, isInLineApp } from '@/lib/liff'

function CompleteContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const memberNumber = searchParams.get('memberNumber')
  const qrToken = searchParams.get('qrToken')
  const slug = params.slug

  const [memberQRCode, setMemberQRCode] = useState(null)
  const [showMemberQR, setShowMemberQR] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const [linkError, setLinkError] = useState('')
  const [inLineApp, setInLineApp] = useState(false)
  const [lineLinkQRCode, setLineLinkQRCode] = useState(null)

  useEffect(() => {
    // 会員QRコードを生成
    if (qrToken) {
      fetch(`/api/member/qrcode?token=${qrToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.qrcode) {
            setMemberQRCode(data.qrcode)
          }
        })
        .catch(console.error)
    }
  }, [qrToken])

  useEffect(() => {
    // LINE連携用QRコードを生成（ブラウザで開いている場合のみ）
    if (qrToken && slug && !inLineApp) {
      const params = new URLSearchParams()
      params.set('token', qrToken)
      params.set('slug', slug)
      if (memberNumber) {
        params.set('memberNumber', memberNumber)
      }
      fetch(`/api/member/line-link-qrcode?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (data.qrcode) {
            setLineLinkQRCode(data.qrcode)
          }
        })
        .catch(console.error)
    }
  }, [qrToken, slug, memberNumber, inLineApp])

  useEffect(() => {
    // LINEアプリ内かどうかを事前に記録（UI表示用）
    initLiff(process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID).then((liff) => {
      if (liff && isInLineApp()) {
        setInLineApp(true)
      }
    }).catch(() => {})
  }, [])

  // クエリで lineLinked=1 が渡された場合に連携完了メッセージを即時表示
  useEffect(() => {
    const linkedFlag = searchParams.get('lineLinked')
    if (linkedFlag === '1' || linkedFlag === 'true') {
      setLinkMessage('LINE公式アカウントから会員証QRコードを表示できます。')
    }
  }, [searchParams])

  const handleLineLink = async () => {
    if (!qrToken) return
    setLinkError('')
    setLinkMessage('')
    setLinking(true)

    try {
      const tokenParams = new URLSearchParams()
      tokenParams.set('token', qrToken)
      tokenParams.set('slug', slug)
      if (memberNumber) {
        tokenParams.set('memberNumber', memberNumber)
      }
      const tokenRes = await fetch(`/api/member/line-link-qrcode?${tokenParams.toString()}`)
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok || !tokenData.memberToken) {
        throw new Error(tokenData.error || 'LINE連携用トークンの取得に失敗しました')
      }

      const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID)
      if (!liff) {
        throw new Error('LINEアプリで開いて「LINE連携する」をタップしてください')
      }

      if (!isLoggedIn()) {
        login()
        setLinking(false)
        return
      }

      const profile = await getProfile()
      if (!profile?.userId) {
        throw new Error('LINEプロフィールの取得に失敗しました')
      }

      const res = await fetch('/api/member/link-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: profile.userId,
          member_token: tokenData.memberToken,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'LINE連携に失敗しました')
      }

      setLinkMessage('LINE連携が完了しました。LINEリッチメニューから会員証を開けます。')
    } catch (error) {
      setLinkError(error.message)
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* 成功アイコン */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            入会登録が完了しました
          </h1>
          <p className="text-gray-500 mb-8">
            FLOLIAへようこそ！
          </p>

          {/* 会員番号 */}
          {memberNumber && (
            <div className="bg-violet-50 rounded-xl p-6 mb-8">
              <p className="text-sm text-violet-600 mb-2">会員番号</p>
              <p className="text-4xl font-bold text-violet-700">
                {String(memberNumber).padStart(4, '0')}
              </p>
            </div>
          )}

          {/* 会員証QRコード */}
          {memberQRCode && (
            <div className="border border-violet-200 bg-violet-50 rounded-xl overflow-hidden mb-6">
              <button
                onClick={() => setShowMemberQR(!showMemberQR)}
                className="w-full flex items-center justify-between p-4 hover:bg-violet-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-violet-700">
                  <QrCode className="w-5 h-5" />
                  <span className="font-medium">会員証QRコード</span>
                </div>
                {showMemberQR ? (
                  <ChevronUp className="w-5 h-5 text-violet-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-violet-500" />
                )}
              </button>
              {showMemberQR && (
                <div className="p-4 pt-0">
                  <div className="bg-white p-4 rounded-xl inline-block">
                    <img
                      src={memberQRCode}
                      alt="会員証QRコード"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-xs text-violet-600 mt-3">
                    このQRコードは入退館時に使用します。<br />
                    LINEのリッチメニューからも表示できます。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* LINE連携 */}
          {qrToken && !linkMessage && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">LINE連携</h2>
              </div>

              {inLineApp ? (
                // LINEアプリ内で開いている場合：ボタンを表示
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    「LINE連携する」をタップすると、この会員情報とLINEアカウントを紐付けます。
                    LINEリッチメニューから会員証QRコードを表示できるようになります。
                  </p>
                  <button
                    onClick={handleLineLink}
                    disabled={linking}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#06C755] text-white rounded-lg hover:bg-[#05a847] transition-colors disabled:opacity-60"
                  >
                    {linking ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        連携中...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-5 h-5" />
                        LINE連携する
                      </>
                    )}
                  </button>
                </>
              ) : (
                // ブラウザで開いている場合：QRコードを表示
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    下のQRコードをLINEで読み取ると、会員情報とLINEアカウントを紐付けできます。
                    連携後はLINEリッチメニューから会員証QRコードを表示できます。
                  </p>
                  {lineLinkQRCode ? (
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-3 rounded-xl shadow-inner border border-green-100">
                        <img
                          src={lineLinkQRCode}
                          alt="LINE連携用QRコード"
                          className="w-40 h-40"
                        />
                      </div>
                      <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        LINEのカメラで読み取ってください
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                    </div>
                  )}
                </>
              )}

              {linkError && (
                <p className="text-sm text-red-600 mt-3">{linkError}</p>
              )}
            </div>
          )}

          {/* LINE連携完了メッセージ */}
          {linkMessage && (
            <div className="border border-green-300 bg-green-50 rounded-lg p-5 mb-8">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-medium">LINE連携が完了しました</p>
                  <p className="text-sm text-green-700">
                    LINE公式アカウントから会員証QRコードを表示できます。
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                このまま登録を終了できます。LINEリッチメニューから会員証を開いて入退館にご利用ください。
              </p>
            </div>
          )}

        </div>

        {/* ロゴ */}
        <div className="text-center mt-8">
          <Image src="/logo.png" alt="FLOLIA" width={120} height={48} className="h-12 w-auto mx-auto opacity-50" />
        </div>
      </div>
    </div>
  )
}

export default function StoreRegisterCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <CompleteContent />
    </Suspense>
  )
}
