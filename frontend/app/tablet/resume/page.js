'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  PlayCircle,
  ChevronLeft,
  Loader2,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'

function TabletResumeContent() {
  const searchParams = useSearchParams()
  const memberIdFromQR = searchParams.get('member_id')

  const [step, setStep] = useState(memberIdFromQR ? 'loading' : 'error')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [member, setMember] = useState(null)

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

      // 休会中でない場合
      if (memberData.status !== 'paused') {
        setError('この会員は休会中ではありません')
        setStep('error')
        return
      }

      setMember({
        id: memberData.id,
        name: `${memberData.last_name} ${memberData.first_name}`,
        member_number: memberData.member_number,
        status: memberData.status,
        paused_from: memberData.paused_from,
        paused_until: memberData.paused_until,
      })
      setStep('confirm')
    } catch (err) {
      setError('会員情報の取得に失敗しました')
      setStep('error')
    }
  }

  const handleResume = async () => {
    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/tablet/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '復帰処理に失敗しました')
        return
      }

      setStep('complete')
    } catch (err) {
      setError('復帰手続きに失敗しました')
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

  // 完了
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">復帰手続き完了</h1>
            <p className="text-lg text-gray-600 mb-8">
              復帰手続きが完了しました。
              <br />
              翌月から月額料金の請求が再開されます。
              <br /><br />
              またのご利用をお待ちしております！
            </p>
            <a
              href="/tablet/procedures/login"
              className="inline-flex items-center gap-2 px-10 py-4 bg-violet-600 text-white text-lg rounded-xl font-medium hover:bg-violet-700"
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
          <h1 className="text-3xl font-bold text-gray-900 mt-6">復帰手続き</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 会員情報 */}
          <div className="bg-violet-50 rounded-xl p-4 mb-6">
            <p className="text-violet-900">
              <span className="font-medium">{member?.name}</span> 様（会員番号: {member?.member_number}）
            </p>
          </div>

          {/* 休会情報 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
            <h3 className="font-medium text-yellow-800 mb-2">現在の状態</h3>
            <p className="text-yellow-700">
              休会開始日: {member?.paused_from || '未設定'}
            </p>
            {member?.paused_until && (
              <p className="text-yellow-700">
                復帰予定日: {member?.paused_until}
              </p>
            )}
          </div>

          {/* 案内 */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-green-800 mb-2">復帰後について</h3>
            <ul className="text-green-700 space-y-1 text-sm">
              <li>・ 翌月から月額料金の請求が再開されます</li>
              <li>・ レッスンの予約が可能になります</li>
              <li>・ すぐにジムをご利用いただけます</li>
            </ul>
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
              onClick={handleResume}
              disabled={isProcessing}
              className="flex-1 py-4 bg-green-600 text-white rounded-xl text-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6" />
                  復帰する
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TabletResumePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-20 w-auto mx-auto" />
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mt-12" />
        </div>
      </div>
    }>
      <TabletResumeContent />
    </Suspense>
  )
}
