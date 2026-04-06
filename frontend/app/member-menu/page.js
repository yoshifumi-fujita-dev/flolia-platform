'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  QrCode,
  User,
  CreditCard,
  PauseCircle,
  XCircle,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Store,
} from 'lucide-react'

const STATUS_LABELS = {
  active: { label: '有効', color: 'bg-green-100 text-green-700' },
  trial: { label: '体験', color: 'bg-blue-100 text-blue-700' },
  visitor: { label: 'ビジター', color: 'bg-gray-100 text-gray-700' },
  paused: { label: '休会中', color: 'bg-yellow-100 text-yellow-700' },
  canceled: { label: '退会済み', color: 'bg-red-100 text-red-700' },
  pending: { label: '手続中', color: 'bg-orange-100 text-orange-700' },
}

// スキャン状態
const SCAN_STATE = {
  SCANNING: 'scanning',
  FOUND: 'found',
  ERROR: 'error',
}

export default function MemberMenuPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scannerRef = useRef(null)

  const [scanState, setScanState] = useState(SCAN_STATE.SCANNING)
  const [member, setMember] = useState(null)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [memberToken, setMemberToken] = useState(null)
  const [qrToken, setQrToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // URLパラメータからトークンを取得（QRコードに埋め込まれたURL経由でアクセスした場合）
  const tokenFromUrl = searchParams.get('token')

  useEffect(() => {
    if (tokenFromUrl) {
      // URLからトークンが渡された場合は直接会員情報を取得
      fetchMemberByToken(tokenFromUrl)
    } else {
      // トークンがない場合はQRスキャナーを起動
      setIsLoading(false)
      initScanner()
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [tokenFromUrl])

  // QRトークンで会員情報を取得
  const fetchMemberByToken = async (token) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/member/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '会員情報の取得に失敗しました')
      }

      setMember(data.member)
      setCurrentPlan(data.currentPlan)
      setMemberToken(data.memberToken || null)
      setQrToken(token)
      setScanState(SCAN_STATE.FOUND)
    } catch (err) {
      setError(err.message)
      setScanState(SCAN_STATE.ERROR)
    } finally {
      setIsLoading(false)
    }
  }

  // QRコードスキャナー初期化
  const initScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        () => {}
      )
    } catch (err) {
      console.error('Scanner init error:', err)
      setError('カメラを起動できませんでした。カメラへのアクセスを許可してください。')
      setScanState(SCAN_STATE.ERROR)
    }
  }

  // スキャン成功時
  const onScanSuccess = useCallback(async (decodedText) => {
    // flolia://member/{token} 形式またはURL形式をチェック
    let qrToken = null

    // flolia://member/{token} 形式
    const match1 = decodedText.match(/^flolia:\/\/member\/([a-f0-9-]+)$/i)
    if (match1) {
      qrToken = match1[1]
    }

    // https://flolia.jp/member-menu?token={token} 形式
    const match2 = decodedText.match(/[?&]token=([a-f0-9-]+)/i)
    if (match2) {
      qrToken = match2[1]
    }

    if (!qrToken) return

    // スキャナーを停止
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
    }

    fetchMemberByToken(qrToken)
  }, [])

  // スキャナーをリセット
  const resetScanner = () => {
    setMember(null)
    setCurrentPlan(null)
    setMemberToken(null)
    setQrToken(null)
    setError('')
    setScanState(SCAN_STATE.SCANNING)
    setIsLoading(false)

    // URLパラメータをクリア
    router.replace('/member-menu')

    // 少し待ってからスキャナーを再起動
    setTimeout(() => {
      initScanner()
    }, 100)
  }

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  // QRスキャン画面
  if (scanState === SCAN_STATE.SCANNING && !tokenFromUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-900 to-purple-900 text-white">
        <div className="max-w-md mx-auto py-12 px-4">
          <div className="text-center mb-8">
            <a href="/">
              <Image src="/logo.png" alt="FLOLIA" width={192} height={64} className="h-16 w-auto mx-auto brightness-0 invert" />
            </a>
            <h1 className="text-2xl font-bold mt-4">会員メニュー</h1>
            <p className="text-violet-200 mt-2">会員証のQRコードをかざしてください</p>
          </div>

          {/* QRリーダー */}
          <div className="relative inline-block w-full">
            <div
              id="qr-reader"
              className="w-full aspect-square mx-auto rounded-2xl overflow-hidden bg-black"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-white/50 rounded-xl" />
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-violet-400 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-violet-400 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-violet-400 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-violet-400 rounded-br-lg" />
            </div>
          </div>

          <p className="text-center text-violet-300 text-sm mt-6">
            LINEの会員証QRコードをかざしてください
          </p>

          <p className="text-center mt-8">
            <a href="/" className="text-violet-300 hover:text-white text-sm">
              サイトに戻る
            </a>
          </p>
        </div>
      </div>
    )
  }

  // エラー画面
  if (scanState === SCAN_STATE.ERROR) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
          <p className="text-red-600 mb-8">{error}</p>
          <button
            onClick={resetScanner}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <RefreshCw className="w-5 h-5" />
            やり直す
          </button>
          <p className="mt-6">
            <a href="/" className="text-gray-500 hover:text-violet-600 text-sm">
              サイトに戻る
            </a>
          </p>
        </div>
      </div>
    )
  }

  // 会員メニュー画面
  const status = STATUS_LABELS[member?.status] || STATUS_LABELS.pending

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <a href="/">
            <Image src="/logo.png" alt="FLOLIA" width={192} height={64} className="h-16 w-auto mx-auto" />
          </a>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">会員メニュー</h1>
        </div>

        {/* 会員情報カード */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{member?.name}</p>
              <p className="text-sm text-gray-500">会員番号: {member?.member_number}</p>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>

          {currentPlan && (
            <div className="bg-violet-50 rounded-xl p-4">
              <p className="text-sm text-violet-600">契約プラン</p>
              <p className="font-medium text-violet-900">{currentPlan.membership_plans?.name}</p>
              <p className="text-sm text-violet-600">
                ¥{currentPlan.membership_plans?.price?.toLocaleString()}
                {currentPlan.membership_plans?.billing_type === 'monthly' && '/月'}
              </p>
            </div>
          )}
        </div>

        {/* メニュー一覧 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <h2 className="px-6 py-4 text-sm font-medium text-gray-500 border-b bg-gray-50">
            各種手続き
          </h2>

          {/* 支払い方法変更 */}
          {member?.has_subscription && (
            <button
              onClick={() => {
                const params = new URLSearchParams()
                const menuToken = searchParams.get('token') || qrToken
                if (menuToken) params.set('token', menuToken)
                if (memberToken) params.set('memberToken', memberToken)
                router.push(`/member-menu/payment?${params.toString()}`)
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b transition-colors"
            >
              <span className="flex items-center gap-3 text-gray-700">
                <CreditCard className="w-5 h-5 text-violet-600" />
                支払い方法の変更（クレジットカード）
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* 休会・退会の案内 */}
          <div className="p-4 border-b">
            <div className="flex items-start gap-3 text-gray-600">
              <Store className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">休会・退会について</p>
                <p className="text-xs text-gray-500 mt-1">
                  休会・退会のお手続きはスタジオにてお受けしております。<br />
                  ご来店時にスタッフまでお申し付けください。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 休会中の場合 */}
        {member?.status === 'paused' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
            <h3 className="font-medium text-yellow-800 flex items-center gap-2">
              <PauseCircle className="w-5 h-5" />
              現在休会中です
            </h3>
            <p className="text-sm text-yellow-700 mt-2">
              休会開始日: {member.paused_from}
            </p>
            {member.paused_until && (
              <p className="text-sm text-yellow-700">
                休会終了予定日: {member.paused_until}
              </p>
            )}
            <p className="text-sm text-yellow-700 mt-3">
              復帰をご希望の方は、スタジオにてお手続きをお願いいたします。
            </p>
          </div>
        )}

        {/* 退会済みの場合 */}
        {member?.status === 'canceled' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <h3 className="font-medium text-red-800 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              退会済みです
            </h3>
            <p className="text-sm text-red-700 mt-2">
              再入会をご希望の場合は、スタジオにてお手続きをお願いいたします。
            </p>
          </div>
        )}

        {/* 別の会員でログイン */}
        <button
          onClick={resetScanner}
          className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-gray-700"
        >
          <QrCode className="w-5 h-5" />
          別のQRコードを読み取る
        </button>

        <p className="text-center text-gray-500 text-sm mt-6">
          <a href="/" className="hover:text-violet-600">サイトに戻る</a>
        </p>
      </div>
    </div>
  )
}
