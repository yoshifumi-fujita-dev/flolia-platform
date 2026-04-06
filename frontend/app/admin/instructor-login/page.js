'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

function InstructorLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      verifyToken(token)
    } else {
      setStatus('error')
      setError('トークンが指定されていません')
    }
  }, [searchParams])

  const verifyToken = async (token) => {
    try {
      const res = await fetch('/api/instructor/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        // 少し遅延してから代行募集ページへリダイレクト
        setTimeout(() => {
          router.push('/admin/substitute-requests')
        }, 1000)
      } else {
        setStatus('error')
        setError(data.error || 'ログインに失敗しました')
      }
    } catch (err) {
      console.error('Verify error:', err)
      setStatus('error')
      setError('サーバーエラーが発生しました')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">ログイン中...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">ログインエラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            LINEメニューから再度お試しください
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <p className="text-gray-600">ログイン成功！</p>
        <p className="text-gray-500 text-sm mt-2">管理画面へ移動しています...</p>
      </div>
    </div>
  )
}

export default function InstructorLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <InstructorLoginContent />
    </Suspense>
  )
}
