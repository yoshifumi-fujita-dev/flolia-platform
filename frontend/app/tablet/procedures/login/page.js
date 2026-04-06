'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  QrCode,
  Keyboard,
  ClipboardList,
} from 'lucide-react'

// セッションキー（手続き専用）
const SESSION_KEY = 'tablet_procedures_session'

// ログインモード
const LOGIN_MODE = {
  SELECT: 'select',
  EMAIL: 'email',
  QR: 'qr',
}

export default function TabletProceduresLoginPage() {
  const router = useRouter()
  const scannerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginMode, setLoginMode] = useState(LOGIN_MODE.SELECT)

  // ログインフォーム
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // 既存セッション確認
  useEffect(() => {
    checkExistingSession()
  }, [])

  // QRスキャナー初期化
  useEffect(() => {
    if (loginMode !== LOGIN_MODE.QR) return

    let html5QrCode = null
    let isMounted = true

    const initScanner = async () => {
      await new Promise(resolve => setTimeout(resolve, 100))

      const element = document.getElementById('qr-reader-procedures-login')
      if (!element || !isMounted) return

      try {
        const { Html5Qrcode } = await import('html5-qrcode')

        html5QrCode = new Html5Qrcode('qr-reader-procedures-login')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onQrScanSuccess,
          () => {}
        )
      } catch (err) {
        console.error('Scanner init error:', err)
        if (err.message?.includes('NotFoundError') || err.name === 'NotFoundError') {
          try {
            await html5QrCode?.start(
              { facingMode: 'user' },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
              },
              onQrScanSuccess,
              () => {}
            )
          } catch (fallbackErr) {
            console.error('Fallback scanner error:', fallbackErr)
          }
        }
      }
    }

    initScanner()

    return () => {
      isMounted = false
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {})
      }
    }
  }, [loginMode])

  const checkExistingSession = async () => {
    setIsLoading(true)
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        setIsLoading(false)
        return
      }

      const session = JSON.parse(sessionData)

      // 期限チェック
      if (new Date(session.expires_at) < new Date()) {
        localStorage.removeItem(SESSION_KEY)
        setIsLoading(false)
        return
      }

      // サーバー側でも検証
      const res = await fetch(`/api/tablet/auth?token=${session.token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          router.replace('/tablet/procedures')
          return
        }
      }
      localStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.error('Session check error:', error)
      localStorage.removeItem(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }

  // QRスキャン成功時
  const onQrScanSuccess = async (decodedText) => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
    }

    const match = decodedText.match(/^flolia:\/\/staff\/(.+)$/)
    if (!match) {
      setLoginError('無効なスタッフQRコードです')
      setLoginMode(LOGIN_MODE.SELECT)
      setTimeout(() => setLoginMode(LOGIN_MODE.QR), 100)
      return
    }

    const qrToken = match[1]
    await handleQrLogin(qrToken)
  }

  // QRログイン処理
  const handleQrLogin = async (qrToken) => {
    setLoginError('')
    setIsLoggingIn(true)

    try {
      const res = await fetch('/api/tablet/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: qrToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLoginError(data.error || 'ログインに失敗しました')
        setLoginMode(LOGIN_MODE.SELECT)
        setTimeout(() => setLoginMode(LOGIN_MODE.QR), 100)
        return
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(data.session))
      router.push('/tablet/procedures')
    } catch (error) {
      setLoginError('ログインに失敗しました')
      setLoginMode(LOGIN_MODE.SELECT)
      setTimeout(() => setLoginMode(LOGIN_MODE.QR), 100)
    } finally {
      setIsLoggingIn(false)
    }
  }

  // メール/パスワードログイン処理
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setIsLoggingIn(true)

    try {
      const res = await fetch('/api/tablet/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLoginError(data.error || 'ログインに失敗しました')
        return
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(data.session))
      router.push('/tablet/procedures')
    } catch (error) {
      setLoginError('ログインに失敗しました')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const switchMode = (mode) => {
    setLoginError('')
    setLoginMode(mode)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  // ログインモード選択画面
  if (loginMode === LOGIN_MODE.SELECT) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-md mx-auto py-16 px-4">
          <div className="text-center mb-10">
            <Image src="/logo.png" alt="FLOLIA" width={160} height={64} className="h-16 w-auto mx-auto brightness-0 invert" />
            <div className="flex items-center justify-center gap-2 mt-6">
              <ClipboardList className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">手続きメニュー</h1>
            </div>
            <p className="text-gray-400 mt-2">ログイン方法を選択してください</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => switchMode(LOGIN_MODE.QR)}
              className="w-full flex items-center gap-4 p-6 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all"
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <QrCode className="w-8 h-8" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xl font-bold">QRコードでログイン</p>
                <p className="text-white/70 text-sm">スタッフQRをスキャン</p>
              </div>
            </button>

            <button
              onClick={() => switchMode(LOGIN_MODE.EMAIL)}
              className="w-full flex items-center gap-4 p-6 bg-gray-700 hover:bg-gray-600 rounded-2xl text-white transition-all"
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Keyboard className="w-8 h-8" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xl font-bold">メールアドレスでログイン</p>
                <p className="text-white/70 text-sm">メール・パスワードを入力</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // QRスキャン画面
  if (loginMode === LOGIN_MODE.QR) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-md mx-auto py-16 px-4">
          <div className="text-center mb-10">
            <Image src="/logo.png" alt="FLOLIA" width={160} height={64} className="h-16 w-auto mx-auto brightness-0 invert" />
            <h1 className="text-2xl font-bold mt-6">QRコードでログイン</h1>
            <p className="text-gray-400 mt-2">スタッフQRをスキャンしてください</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-8">
            {isLoggingIn ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">ログイン中...</p>
              </div>
            ) : (
              <div
                id="qr-reader-procedures-login"
                className="mx-auto rounded-xl overflow-hidden bg-black"
                style={{ width: 280, height: 280 }}
              />
            )}

            {loginError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
                {loginError}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => switchMode(LOGIN_MODE.SELECT)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ← 戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // メール/パスワードログイン画面
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="text-center mb-10">
          <Image src="/logo.png" alt="FLOLIA" width={160} height={64} className="h-16 w-auto mx-auto brightness-0 invert" />
          <h1 className="text-2xl font-bold mt-6">メールアドレスでログイン</h1>
          <p className="text-gray-400 mt-2">手続きメニュー</p>
        </div>

        <div className="bg-white/10 rounded-2xl p-8">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="inline w-4 h-4 mr-2" />
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="staff@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="inline w-4 h-4 mr-2" />
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => switchMode(LOGIN_MODE.SELECT)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← 戻る
          </button>
        </div>
      </div>
    </div>
  )
}
