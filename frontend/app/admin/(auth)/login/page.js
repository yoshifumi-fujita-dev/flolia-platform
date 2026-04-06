'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, Mail, Clock, QrCode, Keyboard } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timeoutMessage, setTimeoutMessage] = useState(false)
  const [loginMode, setLoginMode] = useState('password') // 'password' or 'qr'
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('reason') === 'timeout') {
      setTimeoutMessage(true)
    }
  }, [searchParams])

  // QRスキャナーの初期化
  useEffect(() => {
    if (loginMode === 'qr' && !scannerRef.current) {
      const initScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode('qr-reader')
          scannerRef.current = html5QrCode

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            async (decodedText) => {
              if (processingRef.current) return
              processingRef.current = true
              await handleQrLogin(decodedText)
              processingRef.current = false
            },
            () => {} // エラー時は無視
          )
          setScannerReady(true)
        } catch (err) {
          console.error('QR Scanner init error:', err)
          setError('カメラの起動に失敗しました。カメラへのアクセスを許可してください。')
        }
      }
      initScanner()
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
        setScannerReady(false)
      }
    }
  }, [loginMode])

  const handleQrLogin = async (qrToken) => {
    setIsLoading(true)
    setError('')

    try {
      // スキャナーを停止
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
        setScannerReady(false)
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: qrToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'QRログインに失敗しました')
      }

      // ログイン成功
      window.location.href = '/backoffice/top'
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
      // エラー時はQRモードのままスキャナーを再起動
      if (loginMode === 'qr') {
        processingRef.current = false
        // スキャナー再初期化のためモードを一度リセット
        setLoginMode('password')
        setTimeout(() => setLoginMode('qr'), 100)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'ログインに失敗しました')
      }

      // ログイン成功
      window.location.href = '/backoffice/top'
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setError('')
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
      setScannerReady(false)
    }
    setLoginMode(loginMode === 'password' ? 'qr' : 'password')
  }

  return (
    <>
      {timeoutMessage && (
        <div className="mb-6 p-4 bg-amber-900/30 border border-amber-600/30 rounded-lg text-amber-400 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>セッションがタイムアウトしました。再度ログインしてください。</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* モード切り替えタブ */}
      <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
        <button
          type="button"
          onClick={() => loginMode !== 'password' && toggleMode()}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
            loginMode === 'password'
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          パスワード
        </button>
        <button
          type="button"
          onClick={() => loginMode !== 'qr' && toggleMode()}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
            loginMode === 'qr'
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          QRコード
        </button>
      </div>

      {loginMode === 'password' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder=""
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                ログイン中...
              </>
            ) : (
              'ログイン'
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <div
              id="qr-reader"
              className="w-full aspect-square bg-gray-700 rounded-lg overflow-hidden"
            />
            {!scannerReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">カメラを起動中...</p>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">ログイン中...</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-center text-gray-400 text-sm">
            スタッフ証のQRコードをかざしてください
          </p>
        </div>
      )}
    </>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="FLOLIA"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-serif text-white">FLOLIA SYSTEM</h1>
          </div>

          <Suspense fallback={<div className="text-center text-gray-400">読み込み中...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p>
            <a href="/backoffice/forgot-password" className="text-violet-400 hover:text-violet-300 text-sm">
              パスワードを忘れた場合
            </a>
          </p>
          <p className="text-gray-500 text-sm">
            <a href="/" className="hover:text-gray-400">← サイトに戻る</a>
          </p>
        </div>
      </div>
    </div>
  )
}
