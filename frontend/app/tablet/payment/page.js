'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  CreditCard,
  ChevronLeft,
  Loader2,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

function TabletPaymentContent() {
  const searchParams = useSearchParams()
  const memberIdFromQR = searchParams.get('member_id')

  const [step, setStep] = useState(memberIdFromQR ? 'loading' : 'error')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [member, setMember] = useState(null)
  const [portalUrl, setPortalUrl] = useState(null)

  useEffect(() => {
    if (memberIdFromQR) {
      fetchMemberById(memberIdFromQR)
    } else {
      setError('会員IDが指定されていません')
    }
  }, [memberIdFromQR])

  const fetchMemberById = async (memberId) => {
    try {
      const res = await fetch(`/api/members/${memberId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '会員情報が見つかりません')
        setStep('error')
        return
      }

      const memberData = data.member

      // Stripe顧客IDがない場合
      if (!memberData.stripe_customer_id) {
        setError('この会員には決済情報が登録されていません')
        setStep('error')
        return
      }

      setMember({
        id: memberData.id,
        name: `${memberData.last_name} ${memberData.first_name}`,
        member_number: memberData.member_number,
        status: memberData.status,
        stripe_customer_id: memberData.stripe_customer_id,
      })
      setStep('confirm')
    } catch (err) {
      setError('会員情報の取得に失敗しました')
      setStep('error')
    }
  }

  const handleOpenPortal = async () => {
    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: member.stripe_customer_id,
          return_url: `${window.location.origin}/tablet/procedures`,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'ポータルの作成に失敗しました')
        return
      }

      // Stripeカスタマーポータルへリダイレクト
      window.location.href = data.url
    } catch (err) {
      setError('支払い方法変更画面の表示に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // ローディング
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
          <div className="mt-12">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto" />
            <p className="text-xl text-gray-600 mt-4">会員情報を取得中...</p>
          </div>
        </div>
      </div>
    )
  }

  // エラー
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
          <div className="mt-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">エラー</h1>
            <p className="text-red-600 mb-8">{error}</p>
            <a
              href="/tablet/procedures/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              <ArrowLeft className="w-5 h-5" />
              スタッフメニューに戻る
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 確認画面
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
          <h1 className="text-3xl font-bold text-gray-900 mt-6">支払い方法変更</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 会員情報 */}
          <div className="bg-violet-50 rounded-xl p-4 mb-6">
            <p className="text-violet-900">
              <span className="font-medium">{member?.name}</span> 様（会員番号: {member?.member_number}）
            </p>
          </div>

          {/* 案内 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5" />
              クレジットカード情報の変更
            </h3>
            <p className="text-blue-700 text-sm">
              ボタンを押すとStripeの決済管理画面に移動します。<br />
              そこで新しいクレジットカード情報を登録できます。
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <a
              href="/tablet/procedures/login"
              className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl text-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-6 h-6" />
              戻る
            </a>
            <button
              onClick={handleOpenPortal}
              disabled={isProcessing}
              className="flex-1 py-4 bg-violet-600 text-white rounded-xl text-lg font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <ExternalLink className="w-6 h-6" />
                  変更画面へ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TabletPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mt-12" />
        </div>
      </div>
    }>
      <TabletPaymentContent />
    </Suspense>
  )
}
