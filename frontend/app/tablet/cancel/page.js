'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  XCircle,
  AlertTriangle,
  ChevronLeft,
  Loader2,
  CheckCircle,
  User,
  Mail,
  ArrowLeft,
} from 'lucide-react'

const CANCEL_REASONS = [
  '料金が高い',
  '通う時間がない',
  '引っ越し・転勤',
  '他のジムに移る',
  '効果を感じられなかった',
  '体調・健康上の理由',
  'その他',
]

function TabletCancelContent() {
  const searchParams = useSearchParams()
  const memberIdFromQR = searchParams.get('member_id')

  const [step, setStep] = useState(memberIdFromQR ? 'loading' : 'verify') // loading, verify, form, complete
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [member, setMember] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [isFromQR, setIsFromQR] = useState(!!memberIdFromQR)

  // 本人確認用
  const [verifyData, setVerifyData] = useState({
    member_number: '',
    email: '',
  })

  // QRスキャンから来た場合は会員情報を取得
  useEffect(() => {
    if (memberIdFromQR) {
      fetchMemberById(memberIdFromQR)
    }
  }, [memberIdFromQR])

  const fetchMemberById = async (memberId) => {
    try {
      const res = await fetch(`/api/members/${memberId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '会員情報が見つかりません')
        setStep('verify')
        return
      }

      const memberData = data.member

      // 既に退会済みの場合
      if (memberData.status === 'canceled') {
        setError('この会員は既に退会済みです')
        setStep('verify')
        return
      }

      setMember({
        id: memberData.id,
        name: `${memberData.last_name} ${memberData.first_name}`,
        member_number: memberData.member_number,
        status: memberData.status,
      })
      setStep('form')
    } catch (err) {
      setError('会員情報の取得に失敗しました')
      setStep('verify')
    }
  }

  // 退会理由
  const [formData, setFormData] = useState({
    reason: '',
    reason_detail: '',
  })

  // 本人確認
  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setIsProcessing(true)

    try {
      const res = await fetch('/api/tablet/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '会員情報が見つかりません')
        return
      }

      // 既に退会済みの場合
      if (data.member.status === 'canceled') {
        setError('この会員は既に退会済みです')
        return
      }

      setMember(data.member)
      setStep('form')
    } catch (err) {
      setError('確認に失敗しました。もう一度お試しください。')
    } finally {
      setIsProcessing(false)
    }
  }

  // 退会処理
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (confirmText !== '退会する') {
      setError('確認のため「退会する」と入力してください')
      return
    }

    setError('')
    setIsProcessing(true)

    try {
      const reason = formData.reason === 'その他'
        ? formData.reason_detail
        : formData.reason + (formData.reason_detail ? `: ${formData.reason_detail}` : '')

      const res = await fetch('/api/tablet/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          reason,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '退会処理に失敗しました')
        return
      }

      setStep('complete')
    } catch (err) {
      setError('退会手続きに失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // ローディング画面
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center">
            <a href="/">
              <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
            </a>
            <div className="mt-12 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
              <p className="text-xl text-gray-600">会員情報を取得中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 完了画面
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <a href="/">
              <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-gray-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">退会手続き完了</h1>
            <p className="text-lg text-gray-600 mb-8">
              退会手続きが完了しました。
              <br />
              月額料金の請求は停止されました。
              <br /><br />
              ご利用いただきありがとうございました。
              <br />
              またのご利用をお待ちしております。
            </p>
            {isFromQR ? (
              <a
                href="/tablet/procedures/login"
                className="inline-flex items-center gap-2 px-10 py-4 bg-violet-600 text-white text-lg rounded-xl font-medium hover:bg-violet-700"
              >
                <ArrowLeft className="w-5 h-5" />
                スタッフメニューに戻る
              </a>
            ) : (
              <button
                onClick={() => {
                  setStep('verify')
                  setMember(null)
                  setVerifyData({ member_number: '', email: '' })
                  setFormData({ reason: '', reason_detail: '' })
                  setConfirmText('')
                }}
                className="px-10 py-4 bg-violet-600 text-white text-lg rounded-xl font-medium hover:bg-violet-700"
              >
                最初に戻る
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 本人確認画面
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <a href="/">
              <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
            </a>
            <h1 className="text-3xl font-bold text-gray-900 mt-6">退会手続き</h1>
            <p className="text-gray-600 mt-2">本人確認を行います</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  <User className="inline w-5 h-5 mr-2" />
                  会員番号
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={verifyData.member_number}
                  onChange={(e) => setVerifyData({ ...verifyData, member_number: e.target.value })}
                  className="w-full px-5 py-4 text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="例: 1234"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  <Mail className="inline w-5 h-5 mr-2" />
                  登録メールアドレス
                </label>
                <input
                  type="email"
                  value={verifyData.email}
                  onChange={(e) => setVerifyData({ ...verifyData, email: e.target.value })}
                  className="w-full px-5 py-4 text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="example@email.com"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-violet-600 text-white text-xl rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    確認中...
                  </>
                ) : (
                  '本人確認して進む'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // 退会フォーム画面
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <a href="/">
            <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
          </a>
          <h1 className="text-3xl font-bold text-gray-900 mt-6">退会手続き</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 会員情報 */}
          <div className="bg-violet-50 rounded-xl p-4 mb-6">
            <p className="text-violet-900">
              <span className="font-medium">{member?.name}</span> 様（会員番号: {member?.member_number}）
            </p>
          </div>

          {/* 警告 */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3 text-lg">
              <AlertTriangle className="w-6 h-6" />
              退会についてのご注意
            </h3>
            <ul className="text-red-700 space-y-2">
              <li>・ 退会すると月額料金の請求が停止されます</li>
              <li>・ 退会後は予約やレッスンの利用ができなくなります</li>
              <li>・ 再入会の場合は新規登録が必要です</li>
              <li>・ 退会処理は即時反映されます</li>
            </ul>
          </div>

          {/* 休会の提案 */}
          {member?.status === 'active' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-yellow-800 mb-2 text-lg">
                一時的なお休みなら休会がおすすめ
              </h3>
              <p className="text-yellow-700 mb-3">
                休会なら月額料金を停止しながら、いつでも簡単に復帰できます。
              </p>
              <a
                href="/tablet/pause"
                className="inline-block text-yellow-800 underline hover:no-underline font-medium"
              >
                休会手続きへ進む →
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                退会理由（任意）
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">選択してください</option>
                {CANCEL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                詳細・ご意見（任意）
              </label>
              <textarea
                value={formData.reason_detail}
                onChange={(e) => setFormData({ ...formData, reason_detail: e.target.value })}
                rows={3}
                className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="今後のサービス改善の参考にさせていただきます"
              />
            </div>

            {/* 確認入力 */}
            <div className="border-t pt-6">
              <label className="block text-lg font-medium text-gray-700 mb-3">
                確認のため「退会する」と入力してください
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-5 py-4 text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="退会する"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              {isFromQR ? (
                <a
                  href="/tablet/procedures/login"
                  className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl text-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-6 h-6" />
                  戻る
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStep('verify')
                    setMember(null)
                    setError('')
                  }}
                  className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl text-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-6 h-6" />
                  戻る
                </button>
              )}
              <button
                type="submit"
                disabled={isProcessing || confirmText !== '退会する'}
                className="flex-1 py-4 bg-red-600 text-white rounded-xl text-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6" />
                    退会する
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Suspenseでラップしたエクスポート
export default function TabletCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center">
            <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
            <div className="mt-12 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
              <p className="text-xl text-gray-600">読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <TabletCancelContent />
    </Suspense>
  )
}
