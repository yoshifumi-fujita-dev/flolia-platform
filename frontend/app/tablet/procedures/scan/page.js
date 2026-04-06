'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Loader2,
  RefreshCw,
  XCircle,
  ArrowLeft,
  UserX,
  PauseCircle,
  CreditCard,
  PlayCircle,
  ShieldAlert,
} from 'lucide-react'

const PROCEDURE_CONFIG = {
  cancel: {
    label: '退会手続き',
    icon: UserX,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    path: '/tablet/cancel',
  },
  freeze: {
    label: '休会手続き',
    icon: PauseCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    path: '/tablet/pause',
  },
  resume: {
    label: '復帰手続き',
    icon: PlayCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    path: '/tablet/resume',
  },
  payment: {
    label: '支払い方法変更',
    icon: CreditCard,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    path: '/tablet/payment',
  },
}

// セッションキー（手続き専用）
const SESSION_KEY = 'tablet_procedures_session'

function ScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scannerRef = useRef(null)

  const procedureType = searchParams.get('procedure') || 'cancel'
  const urlToken = searchParams.get('token')
  const config = PROCEDURE_CONFIG[procedureType] || PROCEDURE_CONFIG.cancel

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setIsAuthChecking(true)
    try {
      let token = urlToken
      if (!token) {
        const sessionData = localStorage.getItem(SESSION_KEY)
        if (sessionData) {
          const session = JSON.parse(sessionData)
          token = session.token
        }
      }

      if (!token) {
        setIsAuthenticated(false)
        setIsAuthChecking(false)
        return
      }

      const res = await fetch(`/api/tablet/auth?token=${token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setIsAuthenticated(false)
    } finally {
      setIsAuthChecking(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && !isAuthChecking) {
      initScanner()
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [isAuthenticated, isAuthChecking])

  const initScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      const html5QrCode = new Html5Qrcode('qr-reader-procedures')
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

      setIsScanning(true)
    } catch (err) {
      console.error('Scanner init error:', err)
      setError('カメラを起動できませんでした。カメラへのアクセスを許可してください。')
    }
  }

  const onScanSuccess = useCallback(async (decodedText) => {
    const match = decodedText.match(/^flolia:\/\/member\/([a-f0-9-]+)$/i)
    if (!match) return

    const qrToken = match[1]

    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
    }

    setIsProcessing(true)

    try {
      const res = await fetch('/api/tablet/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: qrToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '会員情報の取得に失敗しました')
      }

      router.push(`${config.path}?member_id=${data.member.id}`)
    } catch (err) {
      setError(err.message)
      setIsProcessing(false)
    }
  }, [config.path, router])

  const handleBack = () => {
    router.push('/tablet/procedures')
  }

  const handleRetry = () => {
    setError('')
    initScanner()
  }

  const handleLogin = () => {
    router.push('/tablet/procedures/login')
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">認証確認中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-md mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">認証が必要です</h1>
          <p className="text-gray-400 mb-8">
            このページにアクセスするにはスタッフログインが必要です。
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            ログインページへ
          </button>
        </div>
      </div>
    )
  }

  const Icon = config.icon

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-md mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">エラー</h1>
          <p className="text-red-400 mb-8">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              <RefreshCw className="w-5 h-5" />
              やり直す
            </button>
            <button
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-2 py-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              メニューに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-xl">会員情報を確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-md mx-auto py-8 px-4">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="FLOLIA" width={120} height={48} className="h-12 w-auto mx-auto brightness-0 invert" />
        </div>

        <div className={`${config.bgColor} rounded-xl p-4 mb-6 flex items-center gap-3`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
          <span className={`font-medium ${config.color}`}>{config.label}</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">会員証をかざしてください</h1>
          <p className="text-gray-400">LINEの会員証QRコードをカメラにかざしてください</p>
        </div>

        <div className="relative">
          <div
            id="qr-reader-procedures"
            className="w-full aspect-square mx-auto rounded-2xl overflow-hidden bg-black"
          />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white/50 rounded-xl" />
            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
          </div>
        </div>

        {!isScanning && (
          <div className="mt-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
            <p className="text-gray-400 text-sm mt-2">カメラを起動中...</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={handleBack}
            className="flex items-center justify-center gap-2 text-gray-400 hover:text-white mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            メニューに戻る
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TabletProceduresScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
