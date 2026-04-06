'use client'

import { useState } from 'react'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'エラーが発生しました')
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-serif text-violet-900 mb-4">メールを送信しました</h1>
              <p className="text-gray-600 mb-6">
                入力されたメールアドレスが登録されている場合、パスワードリセット用のメールを送信しました。
                メールに記載された認証コードを使用して、新しいパスワードを設定してください。
              </p>
              <a
                href={`/backoffice/reset-password?email=${encodeURIComponent(email)}`}
                className="inline-block w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-center"
              >
                認証コードを入力する
              </a>
            </div>
          </div>

          <p className="text-center text-violet-400 text-sm mt-6">
            <a href="/backoffice/login" className="hover:text-violet-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              ログイン画面に戻る
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif text-violet-900">パスワードをお忘れですか？</h1>
            <p className="text-gray-500 text-sm mt-2">
              登録したメールアドレスを入力してください。<br />
              パスワードリセット用の認証コードをお送りします。
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="example@flolia.jp"
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
                  送信中...
                </>
              ) : (
                'リセットメールを送信'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-violet-400 text-sm mt-6">
          <a href="/backoffice/login" className="hover:text-violet-600 flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            ログイン画面に戻る
          </a>
        </p>
      </div>
    </div>
  )
}
