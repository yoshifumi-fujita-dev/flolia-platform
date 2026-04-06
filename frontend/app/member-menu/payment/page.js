'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CreditCard,
  CheckCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

// カードスタイル
const cardStyle = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
    },
  },
}

// 支払い方法更新フォーム
function PaymentUpdateForm({ member, memberToken, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }
    if (!memberToken) {
      setError('認証が必要です')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // カード情報からPaymentMethodを作成
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      })

      if (pmError) {
        throw new Error(pmError.message)
      }

      // サーバーで支払い方法を更新
      const res = await fetch('/api/member/update-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          payment_method_id: paymentMethod.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '支払い方法の更新に失敗しました')
      }

      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          新しいカード情報
        </label>
        <div className="border border-gray-300 rounded-lg p-4">
          <CardElement options={cardStyle} />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            処理中...
          </span>
        ) : (
          '支払い方法を更新する'
        )}
      </button>
    </form>
  )
}

export default function PaymentUpdatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const memberTokenFromQuery = searchParams.get('memberToken')

  const [member, setMember] = useState(null)
  const [memberToken, setMemberToken] = useState(memberTokenFromQuery || '')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!memberTokenFromQuery && !token) {
      setError('アクセストークンがありません')
      setIsLoading(false)
      return
    }

    fetchMember()
  }, [token, memberTokenFromQuery])

  const fetchMember = async () => {
    try {
      if (memberTokenFromQuery) {
        const res = await fetch('/api/member/me', {
          headers: { Authorization: `Bearer ${memberTokenFromQuery}` },
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error)
        }

        if (!data.member.has_subscription) {
          throw new Error('サブスクリプション契約がありません')
        }

        setMember(data.member)
        setMemberToken(memberTokenFromQuery)
        return
      }

      const res = await fetch('/api/member/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      if (!data.member.has_subscription) {
        throw new Error('サブスクリプション契約がありません')
      }

      setMember(data.member)
      if (!data.memberToken) {
        throw new Error('認証トークンの取得に失敗しました')
      }
      setMemberToken(data.memberToken)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (error && !member) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エラー</h1>
          <p className="text-red-600 mb-8">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <ArrowLeft className="w-5 h-5" />
            戻る
          </button>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">更新完了</h1>
          <p className="text-gray-600 mb-8">
            支払い方法を更新しました。<br />
            次回の決済から新しいカードが使用されます。
          </p>
          <button
            onClick={() => router.push(token ? `/member-menu?token=${token}` : '/member-menu')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <ArrowLeft className="w-5 h-5" />
            メニューに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* 戻るボタン */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-violet-600 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          戻る
        </button>

        <div className="text-center mb-8">
          <a href="/">
            <img src="/logo.png?v=2" alt="FLOLIA" className="h-16 mx-auto" />
          </a>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">支払い方法の変更</h1>
          <p className="text-gray-600 mt-2">新しいクレジットカード情報を入力してください</p>
        </div>

        {/* 会員情報 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-violet-600" />
            <span className="font-medium text-gray-900">会員情報</span>
          </div>
          <p className="text-gray-700">{member?.name}</p>
          <p className="text-sm text-gray-500">会員番号: {member?.member_number}</p>
        </div>

        {/* カード更新フォーム */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <Elements stripe={stripePromise}>
            <PaymentUpdateForm
              member={member}
              memberToken={memberToken}
              onSuccess={() => setIsSuccess(true)}
            />
          </Elements>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          カード情報はStripeによって安全に処理されます。<br />
          FLOLIAではカード情報を保存しません。
        </p>
      </div>
    </div>
  )
}
