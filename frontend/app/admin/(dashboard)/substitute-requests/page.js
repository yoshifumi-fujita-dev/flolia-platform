'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Hand,
  Check,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

export default function SubstituteRequestsPage() {
  const { staff } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [applying, setApplying] = useState(null)

  // 週の開始日
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // 代行募集一覧を取得
  const fetchRequests = async () => {
    setLoading(true)
    setError(null)

    try {
      const from = format(weekStart, 'yyyy-MM-dd')
      const to = format(addDays(weekStart, 13), 'yyyy-MM-dd') // 2週間分

      const res = await fetch(`/api/substitute-requests?date_from=${from}&date_to=${to}&status=open`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '代行募集の取得に失敗しました')
      }

      setRequests(data.requests || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [weekStart])

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
    if (!staff?.instructor_id) {
      alert('インストラクターとして登録されていません')
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
          filled_by_instructor_id: staff.instructor_id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '申請に失敗しました')
      }

      alert('代行を申請しました。スタッフが確認後、確定します。')
      fetchRequests()
    } catch (err) {
      alert(err.message)
    } finally {
      setApplying(null)
    }
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Hand className="w-7 h-7" />
            代行募集
          </h1>
          <p className="text-gray-400 mt-1">募集中の代行案件を確認・申請できます</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          更新
        </button>
      </div>

      {/* 週ナビゲーション */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between">
        <button
          onClick={() => changeWeek(-1)}
          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-white">
            {format(weekStart, 'yyyy年M月', { locale: ja })}
          </h2>
          <span className="text-gray-400">
            {format(weekStart, 'M/d')} - {format(addDays(weekStart, 13), 'M/d')}
          </span>
          <button
            onClick={goToThisWeek}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            今週
          </button>
        </div>

        <button
          onClick={() => changeWeek(1)}
          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : requests.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">現在募集中の代行はありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayRequests = requestsByDate[dateStr] || []
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            const dayOfWeek = day.getDay()

            if (dayRequests.length === 0) return null

            return (
              <div key={dateStr} className="bg-gray-800 rounded-lg overflow-hidden">
                <div className={`px-4 py-3 border-b border-gray-700 ${isToday ? 'bg-violet-500/10' : ''}`}>
                  <h3 className={`font-medium ${isToday ? 'text-violet-400' : 'text-white'}`}>
                    {format(day, 'M月d日', { locale: ja })}
                    <span className={`ml-1 ${dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : ''}`}>
                      ({DAYS_OF_WEEK[dayOfWeek]})
                    </span>
                    {isToday && <span className="ml-2 text-xs bg-violet-500/30 px-2 py-0.5 rounded">今日</span>}
                  </h3>
                </div>
                <div className="divide-y divide-gray-700">
                  {dayRequests.map((request) => (
                    <div
                      key={request.id}
                      className="px-4 py-4 flex items-center justify-between hover:bg-gray-750"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-medium text-white">
                            {request.class_schedules?.start_time?.slice(0, 5)}
                          </span>
                          <span className="text-gray-300">
                            {request.class_schedules?.classes?.name || 'クラス名未設定'}
                          </span>
                        </div>
                        {request.reason && (
                          <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleApply(request)}
                        disabled={applying === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                      >
                        {applying === request.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            申請中...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            代行を申請
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
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4 text-sm text-gray-400">
        <p className="font-medium text-gray-300 mb-2">代行申請について</p>
        <ul className="list-disc list-inside space-y-1">
          <li>申請後、スタッフが確認して確定します</li>
          <li>確定後にキャンセルする場合は、スタッフにご連絡ください</li>
          <li>報酬は各インストラクターの代行単価に基づきます</li>
        </ul>
      </div>
    </div>
  )
}
