'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  AlertCircle,
  UserCheck,
  Megaphone,
  Send,
  Loader2,
} from 'lucide-react'

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState([])
  const [instructors, setInstructors] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [substituteRequests, setSubstituteRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 週の開始日
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // モーダル状態
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSendingNotification, setIsSendingNotification] = useState(false)

  // フォーム
  const [formData, setFormData] = useState({
    exception_type: 'canceled', // 'canceled', 'substitute', 'recruiting'
    reason: '',
    substitute_instructor_id: '',
  })

  // スケジュール一覧を取得
  const fetchSchedules = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/schedules?include_class=true')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'スケジュールの取得に失敗しました')
      }

      setSchedules(data.schedules || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // インストラクター一覧を取得
  const fetchInstructors = async () => {
    try {
      const res = await fetch('/api/instructors?include_inactive=false')
      const data = await res.json()
      if (res.ok) {
        setInstructors(data.instructors || [])
      }
    } catch (err) {
      console.error('Failed to fetch instructors:', err)
    }
  }

  // 例外一覧を取得
  const fetchExceptions = async () => {
    try {
      const from = format(weekStart, 'yyyy-MM-dd')
      const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')

      const res = await fetch(`/api/schedules/exceptions?date_from=${from}&date_to=${to}`)
      const data = await res.json()

      if (res.ok) {
        setExceptions(data.exceptions || [])
      }
    } catch (err) {
      console.error('Failed to fetch exceptions:', err)
    }
  }

  // 代行募集一覧を取得
  const fetchSubstituteRequests = async () => {
    try {
      const from = format(weekStart, 'yyyy-MM-dd')
      const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')

      const res = await fetch(`/api/substitute-requests?date_from=${from}&date_to=${to}`)
      const data = await res.json()

      if (res.ok) {
        setSubstituteRequests(data.requests || [])
      }
    } catch (err) {
      console.error('Failed to fetch substitute requests:', err)
    }
  }

  useEffect(() => {
    fetchSchedules()
    fetchInstructors()
  }, [])

  useEffect(() => {
    fetchExceptions()
    fetchSubstituteRequests()
  }, [weekStart])

  // 週を変更
  const changeWeek = (direction) => {
    setWeekStart((prev) => addDays(prev, direction * 7))
  }

  // 今週に戻る
  const goToThisWeek = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  // 特定日のスケジュールを取得
  const getSchedulesForDay = (dayOfWeek) => {
    return schedules
      .filter((s) => s.day_of_week === dayOfWeek && s.is_active)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
  }

  // 特定日・スケジュールの例外を取得
  const getException = (scheduleId, date) => {
    return exceptions.find(
      (e) => e.class_schedule_id === scheduleId && e.exception_date === date
    )
  }

  // 特定日・スケジュールの代行募集を取得
  const getSubstituteRequest = (scheduleId, date) => {
    return substituteRequests.find(
      (r) => r.class_schedule_id === scheduleId && r.request_date === date
    )
  }

  // モーダルを開く
  const openModal = (schedule, date) => {
    setSelectedSchedule(schedule)
    setSelectedDate(date)
    const existing = getException(schedule.id, date)
    const request = getSubstituteRequest(schedule.id, date)

    if (request && request.status === 'open') {
      setFormData({
        exception_type: 'recruiting',
        reason: request.reason || '',
        substitute_instructor_id: '',
      })
    } else {
      setFormData({
        exception_type: existing?.exception_type || 'canceled',
        reason: existing?.reason || '',
        substitute_instructor_id: existing?.substitute_instructor_id || '',
      })
    }
    setIsModalOpen(true)
  }

  // 保存
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (formData.exception_type === 'recruiting') {
        // 代行募集を作成
        const payload = {
          class_schedule_id: selectedSchedule.id,
          request_date: selectedDate,
          original_instructor_id: selectedSchedule.instructor_id || null,
          reason: formData.reason || null,
        }

        const res = await fetch('/api/substitute-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '保存に失敗しました')
        }

        setIsModalOpen(false)
        fetchSubstituteRequests()
      } else {
        // 通常の例外設定
        const payload = {
          class_schedule_id: selectedSchedule.id,
          exception_date: selectedDate,
          exception_type: formData.exception_type,
          reason: formData.reason || null,
          substitute_instructor_id:
            formData.exception_type === 'substitute' && formData.substitute_instructor_id
              ? formData.substitute_instructor_id
              : null,
        }

        const res = await fetch('/api/schedules/exceptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '保存に失敗しました')
        }

        // 代行募集があれば削除
        const existingRequest = getSubstituteRequest(selectedSchedule.id, selectedDate)
        if (existingRequest) {
          await fetch(`/api/substitute-requests/${existingRequest.id}`, {
            method: 'DELETE',
          })
        }

        setIsModalOpen(false)
        fetchExceptions()
        fetchSubstituteRequests()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // 削除
  const handleDelete = async () => {
    try {
      // 例外を削除
      const existing = getException(selectedSchedule.id, selectedDate)
      if (existing) {
        const res = await fetch(`/api/schedules/exceptions/${existing.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          throw new Error('削除に失敗しました')
        }
      }

      // 代行募集を削除
      const existingRequest = getSubstituteRequest(selectedSchedule.id, selectedDate)
      if (existingRequest) {
        const res = await fetch(`/api/substitute-requests/${existingRequest.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          throw new Error('削除に失敗しました')
        }
      }

      setIsModalOpen(false)
      fetchExceptions()
      fetchSubstituteRequests()
    } catch (err) {
      alert(err.message)
    }
  }

  // LINE通知を送信
  const handleSendNotification = async () => {
    if (!confirm('インストラクター全員にLINE通知を送信しますか？')) return

    setIsSendingNotification(true)
    try {
      const res = await fetch('/api/substitute-requests/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_schedule_id: selectedSchedule.id,
          request_date: selectedDate,
          class_name: selectedSchedule.class?.name || selectedSchedule.classes?.name,
          start_time: selectedSchedule.start_time,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '通知の送信に失敗しました')
      }

      alert(`${data.notified}名のインストラクターに通知を送信しました`)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSendingNotification(false)
    }
  }

  // 週の日付リストを生成
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  })

  // インストラクター名を取得
  const getInstructorName = (id) => {
    const instructor = instructors.find((i) => i.id === id)
    return instructor?.name || ''
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-7 h-7" />
            休講・代行管理
          </h1>
          <p className="text-gray-400 mt-1">クラスの休講設定と代行インストラクターの登録</p>
        </div>
        <button
          onClick={() => {
            fetchSchedules()
            fetchExceptions()
            fetchSubstituteRequests()
          }}
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
            {format(weekStart, 'M/d')} - {format(addDays(weekStart, 6), 'M/d')}
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
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : (
        /* 週間スケジュールグリッド */
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-700">
            {weekDays.map((day, index) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              const dayOfWeek = (index + 1) % 7 // 月曜始まりなので調整

              return (
                <div
                  key={index}
                  className={`p-3 text-center border-r border-gray-700 last:border-r-0 ${
                    isToday ? 'bg-violet-500/10' : ''
                  }`}
                >
                  <p className={`text-sm font-medium ${isToday ? 'text-violet-400' : 'text-gray-400'}`}>
                    {DAYS_OF_WEEK[dayOfWeek]}
                  </p>
                  <p className={`text-lg ${isToday ? 'text-white font-bold' : 'text-gray-300'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-7">
            {weekDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayOfWeek = (index + 1) % 7
              const daySchedules = getSchedulesForDay(dayOfWeek)

              return (
                <div
                  key={index}
                  className="min-h-[300px] p-2 border-r border-gray-700 last:border-r-0"
                >
                  {daySchedules.length === 0 ? (
                    <p className="text-gray-600 text-xs text-center py-4">クラスなし</p>
                  ) : (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => {
                        const exception = getException(schedule.id, dateStr)
                        const request = getSubstituteRequest(schedule.id, dateStr)
                        const isCanceled = exception?.exception_type === 'canceled'
                        const hasSubstitute = exception?.exception_type === 'substitute'
                        const isRecruiting = request?.status === 'open'
                        const substituteInstructor = hasSubstitute
                          ? getInstructorName(exception.substitute_instructor_id)
                          : null

                        return (
                          <div
                            key={schedule.id}
                            className={`p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              isCanceled
                                ? 'bg-red-500/20 border border-red-500/30'
                                : hasSubstitute
                                ? 'bg-blue-500/20 border border-blue-500/30'
                                : isRecruiting
                                ? 'bg-yellow-500/20 border border-yellow-500/30 animate-pulse'
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                            onClick={() => openModal(schedule, dateStr)}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-medium text-white">
                                {schedule.start_time?.slice(0, 5)}
                              </span>
                              {isCanceled && (
                                <span className="px-1.5 py-0.5 bg-red-500/30 text-red-400 rounded text-[10px]">
                                  休講
                                </span>
                              )}
                              {hasSubstitute && (
                                <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-400 rounded text-[10px]">
                                  代行
                                </span>
                              )}
                              {isRecruiting && (
                                <span className="px-1.5 py-0.5 bg-yellow-500/30 text-yellow-400 rounded text-[10px]">
                                  募集中
                                </span>
                              )}
                            </div>
                            <p className={`${isCanceled ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                              {schedule.class?.name || schedule.classes?.name || '-'}
                            </p>
                            {/* 担当インストラクター */}
                            <p className="text-gray-500 mt-1">
                              {hasSubstitute ? (
                                <span className="text-blue-400">{substituteInstructor}</span>
                              ) : isRecruiting ? (
                                <span className="text-yellow-400">代行募集中</span>
                              ) : (
                                schedule.instructor_name || '担当未定'
                              )}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 凡例 */}
      <div className="mt-4 flex items-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-700" />
          <span>通常</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/30" />
          <span>休講</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500/30" />
          <span>代行募集中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/30" />
          <span>代行確定</span>
        </div>
        <p className="ml-auto text-gray-500">クリックして休講・代行を設定</p>
      </div>

      {/* Modal */}
      {isModalOpen && selectedSchedule && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-2">
              {format(new Date(selectedDate), 'M月d日(E)', { locale: ja })} の設定
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {selectedSchedule.start_time?.slice(0, 5)} -{' '}
              {selectedSchedule.class?.name || selectedSchedule.classes?.name}
              <br />
              <span className="text-gray-500">
                通常担当: {selectedSchedule.instructor_name || '未定'}
              </span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">設定タイプ</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, exception_type: 'canceled' })}
                    className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${
                      formData.exception_type === 'canceled'
                        ? 'border-red-500 bg-red-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-xs text-gray-200">休講</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, exception_type: 'recruiting' })}
                    className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${
                      formData.exception_type === 'recruiting'
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <Megaphone className="w-5 h-5 text-yellow-400" />
                    <span className="text-xs text-gray-200">代行募集</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, exception_type: 'substitute' })}
                    className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${
                      formData.exception_type === 'substitute'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-gray-200">代行確定</span>
                  </button>
                </div>
              </div>

              {formData.exception_type === 'substitute' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    代行インストラクター
                  </label>
                  <select
                    value={formData.substitute_instructor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, substitute_instructor_id: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  >
                    <option value="">選択してください</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name}
                        {instructor.substitute_rate > 0 && ` (代行単価: ${instructor.substitute_rate.toLocaleString()}円)`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.exception_type === 'recruiting' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm mb-3">
                    代行募集を開始すると、インストラクターにLINE通知を送信できます。
                  </p>
                  <button
                    type="button"
                    onClick={handleSendNotification}
                    disabled={isSendingNotification}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    {isSendingNotification ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        LINE通知を送信
                      </>
                    )}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">理由・メモ</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={
                    formData.exception_type === 'canceled'
                      ? '休講理由（任意）'
                      : formData.exception_type === 'recruiting'
                      ? '代行が必要な理由（任意）'
                      : '代行の経緯など（任意）'
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
                {(getException(selectedSchedule.id, selectedDate) || getSubstituteRequest(selectedSchedule.id, selectedDate)) && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    設定解除
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
