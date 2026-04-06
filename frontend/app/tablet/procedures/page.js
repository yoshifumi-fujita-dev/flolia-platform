'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  UserX,
  PauseCircle,
  CreditCard,
  PlayCircle,
  ChevronRight,
  Loader2,
  LogOut,
  User,
  UserPlus,
  ClipboardList,
} from 'lucide-react'

const MENU_ITEMS = [
  {
    id: 'register',
    label: '入会手続き',
    description: '新規会員を登録します',
    icon: UserPlus,
    color: 'bg-blue-600 hover:bg-blue-700',
    path: '/tablet/procedures/register',
  },
  {
    id: 'cancel',
    label: '退会手続き',
    description: '会員契約を解約します',
    icon: UserX,
    color: 'bg-red-600 hover:bg-red-700',
    path: '/tablet/procedures/cancel',
  },
  {
    id: 'freeze',
    label: '休会手続き',
    description: '一時的に契約を休止します',
    icon: PauseCircle,
    color: 'bg-yellow-600 hover:bg-yellow-700',
    path: '/tablet/procedures/freeze',
  },
  {
    id: 'resume',
    label: '復帰手続き',
    description: '休会中の会員を復帰させます',
    icon: PlayCircle,
    color: 'bg-green-600 hover:bg-green-700',
    path: '/tablet/procedures/resume',
  },
  {
    id: 'payment',
    label: '支払い方法変更',
    description: 'クレジットカード情報を変更します',
    icon: CreditCard,
    color: 'bg-violet-600 hover:bg-violet-700',
    path: '/tablet/procedures/payment',
  },
]

// セッションキー（手続き専用）
const SESSION_KEY = 'tablet_procedures_session'

export default function TabletProceduresMenuPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [staffName, setStaffName] = useState('')

  // セッション確認
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    setIsLoading(true)
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        router.replace('/tablet/procedures/login')
        return
      }

      const session = JSON.parse(sessionData)

      // 期限チェック
      if (new Date(session.expires_at) < new Date()) {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/procedures/login')
        return
      }

      // サーバー側でも検証
      const res = await fetch(`/api/tablet/auth?token=${session.token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          setStaffName(data.session.staff_name)
        } else {
          localStorage.removeItem(SESSION_KEY)
          router.replace('/tablet/procedures/login')
          return
        }
      } else {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/procedures/login')
        return
      }
    } catch (error) {
      console.error('Session check error:', error)
      localStorage.removeItem(SESSION_KEY)
      router.replace('/tablet/procedures/login')
      return
    } finally {
      setIsLoading(false)
    }
  }

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
      router.replace('/tablet/procedures/login')
    }
  }

  const handleMenuSelect = (menu) => {
    router.push(menu.path)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <Image src="/logo.png" alt="FLOLIA" width={160} height={64} className="h-16 w-auto mx-auto brightness-0 invert" />
          <div className="flex items-center justify-center gap-2 mt-6">
            <ClipboardList className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">手続きメニュー</h1>
          </div>
          <p className="text-gray-400 mt-2">手続きを選択してください</p>
        </div>

        {/* ログイン中スタッフ表示 */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mb-6">
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

        {/* メニュー一覧 */}
        <div className="space-y-4">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleMenuSelect(item)}
                className={`w-full flex items-center gap-4 p-6 rounded-2xl text-white transition-all ${item.color}`}
              >
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xl font-bold">{item.label}</p>
                  <p className="text-white/70 text-sm">{item.description}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/50" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
