'use client'

import { useState, useEffect, Suspense } from 'react'
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns'
import { ja } from 'date-fns/locale'
import Image from 'next/image'
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Hand,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

function StaffSubstituteContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [instructor, setInstructor] = useState(null)
  const [staffName, setStaffName] = useState('')
  const [notInstructor, setNotInstructor] = useState(false)

  // 代行募集関連
  const [requests, setRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [applying, setApplying] = useState(null)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  useEffect(() => {
    initializeLiff()
  }, [])

  const initializeLiff = async () => {
    try {
      // LIFF IDを取得
      const liffId = process.env.NEXT_PUBLIC_LIFF_STAFF_SUBSTITUTE_ID ||
                     process.env.NEXT_PUBLIC_LIFF_STAFF_ID ||
                     process.env.NEXT_PUBLIC_LIFF_ID

      if (!liffId) {
        setError('LIFF IDが設定されていません')
        setIsLoading(false)
        return
      }

      // LIFFを初期化
      const liff = (await import('@line/liff')).default
      await liff.init({ liffId })

      // ログイン状態を確認
      if (!liff.isLoggedIn()) {
        liff.login()
        return
      }

      // プロフィールを取得
      const profile = await liff.getProfile()
      if (!profile?.userId) {
        setError('LINEプロフィールの取得に失敗しました')
        setIsLoading(false)
        return
      }

      await fetchStaffAndInstructor(profile.userId)
    } catch (err) {
      console.error('LIFF init error:', err)
      setError('初期化に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStaffAndInstructor = async (lineUserId) => {
    try {
      const res = await fetch(`/api/staff/me?line_user_id=${lineUserId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'スタッフ情報の取得に失敗しました')
        return
      }

      setStaffName(data.staff?.name || '')

      if (data.instructor) {
        setInstructor(data.instructor)
        setNotInstructor(false)
        // 代行募集を取得
        fetchRequests()
      } else {
        setNotInstructor(true)
      }
    } catch (err) {
      console.error('Fetch staff error:', err)
      setError('スタッフ情報の取得に失敗しました')
    }
  }

  const fetchRequests = async () => {
    setLoadingRequests(true)
    try {
      const from = format(weekStart, 'yyyy-MM-dd')
      const to = format(addDays(weekStart, 13), 'yyyy-MM-dd')

      const res = await fetch(`/api/substitute-requests?date_from=${from}&date_to=${to}&status=open`)
      const data = await res.json()

      if (res.ok) {
        setRequests(data.requests || [])
      }
    } catch (err) {
      console.error('Fetch requests error:', err)
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    if (instructor) {
      fetchRequests()
    }
  }, [weekStart, instructor])

  // 週を変更
  const changeWeek = (direction) => {
    setWeekStart((prev) => addDays(prev, direction * 7))
  }

  // 今週に戻る
  const goToThisWeek = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  // 代行申請
  const handleApply = async (request) => {
    if (!instructor?.id) {
      alert('インストラクター情報が取得できていません')
      return
    }

    if (!confirm(`${format(new Date(request.request_date), 'M月d日(E)', { locale: ja })}の代行を申請しますか？`)) {
      return
    }

    setApplying(request.id)
    try {
      const res = await fetch(`/api/substitute-requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filled_by_instructor_id: instructor.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '申請に失敗しました')
      }

      alert('代行を申請しました！\nスタッフが確認後、確定します。')
      fetchRequests()
    } catch (err) {
      alert(err.message)
    } finally {
      setApplying(null)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    initializeLiff()
  }

  // 週の日付リストを生成（2週間分）
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 13),
  })

  // 日付ごとの募集をグループ化
  const requestsByDate = requests.reduce((acc, req) => {
    const date = req.request_date
    if (!acc[date]) acc[date] = []
    acc[date].push(req)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">エラー</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <RefreshCw className="w-5 h-5" />
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  if (notInstructor) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            インストラクター専用機能
          </h2>
          <p className="text-gray-600 mb-6">
            {staffName && `${staffName} さん、`}
            この機能はインストラクターとして登録されているスタッフのみ利用できます。
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            <RefreshCw className="w-5 h-5" />
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // 代行募集一覧表示
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 py-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Hand className="w-6 h-6 text-yellow-500" />
              <h1 className="text-lg font-bold text-gray-900">代行募集</h1>
            </div>
            <button
              onClick={fetchRequests}
              disabled={loadingRequests}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loadingRequests ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {instructor?.name} さん、募集中の代行案件を確認できます
          </p>
        </div>

        {/* 週ナビゲーション */}
        <div className="bg-white rounded-xl shadow p-3 mb-4 flex items-center justify-between">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900">
              {format(weekStart, 'M/d', { locale: ja })} - {format(addDays(weekStart, 13), 'M/d')}
            </span>
            <button
              onClick={goToThisWeek}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              今週
            </button>
          </div>

          <button
            onClick={() => changeWeek(1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 募集一覧 */}
        {loadingRequests ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">現在募集中の代行はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayRequests = requestsByDate[dateStr] || []
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              const dayOfWeek = day.getDay()

              if (dayRequests.length === 0) return null

              return (
                <div key={dateStr} className="bg-white rounded-xl shadow overflow-hidden">
                  <div className={`px-4 py-2 border-b ${isToday ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <h3 className={`font-medium ${isToday ? 'text-green-700' : 'text-gray-900'}`}>
                      {format(day, 'M月d日', { locale: ja })}
                      <span className={`ml-1 ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''}`}>
                        ({DAYS_OF_WEEK[dayOfWeek]})
                      </span>
                      {isToday && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">今日</span>}
                    </h3>
                  </div>
                  <div className="divide-y">
                    {dayRequests.map((request) => (
                      <div
                        key={request.id}
                        className="px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-medium text-gray-900">
                              {request.class_schedules?.start_time?.slice(0, 5)}
                            </span>
                            <span className="text-gray-600 text-sm">
                              {request.class_schedules?.classes?.name || 'クラス'}
                            </span>
                          </div>
                          {request.reason && (
                            <p className="text-xs text-gray-400 mt-1">{request.reason}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleApply(request)}
                          disabled={applying === request.id}
                          className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                        >
                          {applying === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              申請
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 注意事項 */}
        <div className="mt-4 bg-white/60 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-medium text-gray-600 mb-2">代行申請について</p>
          <ul className="list-disc list-inside space-y-1">
            <li>申請後、スタッフが確認して確定します</li>
            <li>確定後のキャンセルはスタッフにご連絡ください</li>
          </ul>
        </div>

        {/* ロゴ */}
        <div className="text-center mt-6">
          <Image src="/logo.png" alt="FLOLIA" width={120} height={40} className="h-10 w-auto mx-auto opacity-50" />
          <p className="text-xs text-gray-400 mt-1">FLOLIA PARTNER</p>
        </div>
      </div>
    </div>
  )
}

export default function StaffSubstitutePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    }>
      <StaffSubstituteContent />
    </Suspense>
  )
}
