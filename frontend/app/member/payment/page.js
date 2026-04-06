'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CreditCard, Check } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { initLiff, isLoggedIn, login, getProfile } from '@/lib/liff'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function PaymentForm({ member, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const cardElement = elements.getElement(CardElement)

      // PaymentMethodを作成
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (pmError) {
        throw new Error(pmError.message)
      }

      // APIで決済方法を更新
      const res = await fetch('/api/member/update-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          payment_method_id: paymentMethod.id
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '決済方法の更新に失敗しました')
      }

      onSuccess()
    } catch (err) {
      console.error('Payment method update error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* カード情報入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          クレジットカード情報
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
              hidePostalCode: true,
            }}
          />
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            更新中...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            決済方法を更新
          </>
        )}
      </button>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ 注意事項</h4>
        <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
          <li>次回の決済から新しいカードが使用されます</li>
          <li>既存の定期購読は継続されます</li>
          <li>カード情報は安全に暗号化されて保存されます</li>
        </ul>
      </div>
    </form>
  )
}

export default function MemberPaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    initializeLiff()
  }, [])

  async function initializeLiff() {
    try {
      setLoading(true)

      // LIFF初期化（会員メニュー用LIFF ID）
      const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_MEMBER_MENU_ID)

      if (!liff) {
        throw new Error('LIFF の初期化に失敗しました')
      }

      if (!isLoggedIn()) {
        login()
        return
      }

      // LINEユーザーID取得
      const profile = await getProfile()
      const lineUserId = profile?.userId

      if (!lineUserId) {
        throw new Error('LINEプロフィールの取得に失敗しました')
      }

      // 会員情報取得
      const res = await fetch(`/api/member/profile?line_user_id=${lineUserId}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '会員情報の取得に失敗しました')
      }

      setMember(data.member)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    setSuccess(true)
    setTimeout(() => {
      router.push('/member')
    }, 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-pink-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/member')}
              className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition"
            >
              メニューに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">更新完了！</h2>
            <p className="text-gray-600 mb-4">
              決済方法を正常に更新しました
            </p>
            <p className="text-sm text-gray-500">
              3秒後に会員メニューに戻ります...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/member')}
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">支払い方法更新</h1>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* 会員情報 */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">会員番号</p>
            <p className="text-lg font-semibold text-gray-900 mb-3">
              {member?.member_number}
            </p>
            <p className="text-sm text-gray-600 mb-1">お名前</p>
            <p className="text-lg font-semibold text-gray-900">
              {member?.last_name} {member?.first_name}
            </p>
          </div>

          {/* Stripe Elements */}
          <Elements stripe={stripePromise}>
            <PaymentForm member={member} onSuccess={handleSuccess} />
          </Elements>
        </div>
      </div>
    </div>
  )
}
