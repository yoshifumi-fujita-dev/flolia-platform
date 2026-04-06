'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, UserPlus, Smartphone, Loader2 } from 'lucide-react'

const SESSION_KEY = 'tablet_procedures_session'

export default function TabletProceduresRegisterPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [storeSlug, setStoreSlug] = useState('tsujido')

  useEffect(() => {
    const sessionData = localStorage.getItem(SESSION_KEY)
    if (sessionData) {
      const session = JSON.parse(sessionData)
      if (session.token && new Date(session.expires_at) > new Date()) {
        setIsAuthenticated(true)
        if (session.store_slug) {
          setStoreSlug(session.store_slug)
        }
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/tablet/procedures/login')
    }
  }, [isLoading, isAuthenticated, router])

  const handleStart = () => {
    router.push(`/stores/${storeSlug}/register`)
  }

  const handleBack = () => {
    router.push('/tablet/procedures')
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="FLOLIA" width={160} height={64} className="h-16 w-auto mx-auto brightness-0 invert" />
        </div>

        <div className="bg-white/10 rounded-3xl p-8 text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">入会手続き</h2>
          <p className="text-gray-400">新規会員を登録します</p>
        </div>

        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Smartphone className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-200 mb-1">お客様へタブレットをお渡しください</p>
              <p className="text-sm text-blue-300">
                「開始する」ボタンを押すと入会登録フォームが表示されます。<br />
                お客様に必要事項を入力していただいてください。
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleStart}
            className="w-full py-5 rounded-xl text-xl font-bold transition-all bg-blue-600 hover:bg-blue-700"
          >
            開始する
          </button>
          <button
            onClick={handleBack}
            className="w-full flex items-center justify-center gap-2 py-4 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            メニューに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
