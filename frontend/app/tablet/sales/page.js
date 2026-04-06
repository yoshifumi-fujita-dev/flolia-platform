'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ShoppingCart,
  Store,
  Loader2,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react'

// セッションキー（物販専用）
const SESSION_KEY = 'tablet_sales_session'

export default function TabletSalesSelectPage() {
  const router = useRouter()
  const [stores, setStores] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [staffName, setStaffName] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // 認証チェック
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    setIsAuthChecking(true)
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        router.replace('/tablet/sales/login')
        return
      }

      const session = JSON.parse(sessionData)

      if (new Date(session.expires_at) < new Date()) {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/sales/login')
        return
      }

      const res = await fetch(`/api/tablet/auth?token=${session.token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          setStaffName(data.session.staff_name)
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem(SESSION_KEY)
          router.replace('/tablet/sales/login')
          return
        }
      } else {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/sales/login')
        return
      }
    } catch (error) {
      console.error('Session check error:', error)
      localStorage.removeItem(SESSION_KEY)
      router.replace('/tablet/sales/login')
    } finally {
      setIsAuthChecking(false)
    }
  }

  // 店舗一覧を取得
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchStores = async () => {
      try {
        const res = await fetch('/api/public/stores')
        if (res.ok) {
          const data = await res.json()
          setStores(data.stores || [])
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStores()
  }, [isAuthenticated])

  const handleLogout = async () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        await fetch(`/api/tablet/auth?token=${session.token}`, {
          method: 'DELETE',
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem(SESSION_KEY)
      router.replace('/tablet/sales/login')
    }
  }

  // 店舗を選択
  const selectStore = (store) => {
    router.push(`/tablet/sales/${store.site_slug}`)
  }

  if (isAuthChecking || (isAuthenticated && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShoppingCart className="w-8 h-8 text-pink-400" />
            <h1 className="text-2xl font-bold">物販 - 店舗選択</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-300">
              <User className="w-5 h-5" />
              <span>{staffName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Store className="w-8 h-8 text-pink-400" />
              <h2 className="text-xl font-bold">店舗を選択してください</h2>
            </div>

            <div className="space-y-3">
              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => selectStore(store)}
                  className="w-full flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <div className="text-left">
                    <p className="font-bold text-lg">{store.name}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </button>
              ))}

              {stores.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  店舗がありません
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
