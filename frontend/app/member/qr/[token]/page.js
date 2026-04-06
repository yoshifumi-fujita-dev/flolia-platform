'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

export default function MemberQRPage() {
  const params = useParams()
  const token = params.token
  const [memberInfo, setMemberInfo] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Service Worker登録
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }

    // デバイス判定
    const ua = navigator.userAgent
    setIsIOS(/iPhone|iPad|iPod/.test(ua))
    setIsAndroid(/Android/.test(ua))

    // PWAとして起動されているか判定
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true
    setIsStandalone(standalone)

    // 初回アクセス時にインストール案内を表示（PWAでない場合）
    if (!standalone) {
      const dismissed = localStorage.getItem('pwa_install_dismissed')
      if (!dismissed) {
        setShowInstallGuide(true)
      }
    }

    // オンライン/オフライン状態の監視
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const fetchMemberInfo = async () => {
      // オフライン時はキャッシュされた情報を使用
      const cachedInfo = localStorage.getItem(`member_qr_${token}`)
      if (cachedInfo) {
        setMemberInfo(JSON.parse(cachedInfo))
        setLoading(false)
      }

      if (!navigator.onLine) {
        if (!cachedInfo) {
          setError('オフラインです。初回はオンラインで読み込んでください。')
        }
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/member/scan?token=${token}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || '会員情報の取得に失敗しました')
        }

        // ローカルストレージにキャッシュ
        localStorage.setItem(`member_qr_${token}`, JSON.stringify(data.member))
        setMemberInfo(data.member)
        setError(null)
      } catch (err) {
        if (!cachedInfo) {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchMemberInfo()
    }
  }, [token])

  const dismissInstallGuide = () => {
    setShowInstallGuide(false)
    localStorage.setItem('pwa_install_dismissed', 'true')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">エラー</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      {/* ヘッダー */}
      <header className="bg-purple-600 text-white py-4 px-6 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">FLOLIA</h1>
          {isOffline && (
            <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full">
              オフライン
            </span>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-md mx-auto p-6">
        {/* 会員情報 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {memberInfo?.name}
            </h2>
            <p className="text-gray-500 text-sm">会員様</p>
          </div>

          {/* QRコード */}
          <div className="bg-white border-4 border-purple-100 rounded-2xl p-6 flex items-center justify-center">
            <QRCodeSVG
              value={token}
              size={200}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#7c3aed"
            />
          </div>

          <p className="text-center text-gray-500 text-sm mt-4">
            このQRコードを受付でスキャンしてください
          </p>
        </div>

        {/* 利用案内 */}
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-purple-700 text-sm">
            {isStandalone
              ? 'オフラインでもQRコードを表示できます'
              : 'ホーム画面に追加するとオフラインでも使えます'}
          </p>
        </div>
      </main>

      {/* ホーム画面追加の案内モーダル */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                ホーム画面に追加
              </h3>
              <button
                onClick={dismissInstallGuide}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              ホーム画面に追加すると、通信なしでQRコードを表示できます。
            </p>

            {isIOS && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">共有ボタンをタップ</p>
                    <p className="text-gray-500 text-sm">画面下の共有アイコン（□↑）をタップ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">「ホーム画面に追加」を選択</p>
                    <p className="text-gray-500 text-sm">メニューをスクロールして探してください</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">「追加」をタップ</p>
                    <p className="text-gray-500 text-sm">右上の「追加」ボタンをタップで完了</p>
                  </div>
                </div>
              </div>
            )}

            {isAndroid && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">メニューを開く</p>
                    <p className="text-gray-500 text-sm">右上の「︙」メニューをタップ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">「ホーム画面に追加」を選択</p>
                    <p className="text-gray-500 text-sm">または「アプリをインストール」</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">「追加」をタップ</p>
                    <p className="text-gray-500 text-sm">確認画面で「追加」をタップ</p>
                  </div>
                </div>
              </div>
            )}

            {!isIOS && !isAndroid && (
              <p className="text-gray-600 text-sm">
                ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択してください。
              </p>
            )}

            <button
              onClick={dismissInstallGuide}
              className="w-full mt-6 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-6">
        <p className="text-center text-gray-400 text-xs">
          FLOLIA Kickboxing Studio
        </p>
      </footer>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
