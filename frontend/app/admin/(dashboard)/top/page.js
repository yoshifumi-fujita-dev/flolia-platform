'use client'

import { useState, useEffect } from 'react'
import { format, isToday, isTomorrow, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar,
  Users,
  Clock,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
  Save,
  UserCheck,
  UserCog,
  X,
  User,
  Phone,
  Mail,
  DoorOpen,
  LogIn,
  LogOut,
  Home,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

export default function AdminTopPage() {
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [schedules, setSchedules] = useState([])
  const [instructors, setInstructors] = useState([])
  const [bookings, setBookings] = useState([])
  const [reports, setReports] = useState({}) // scheduleId -> report
  const [savingReports, setSavingReports] = useState({}) // scheduleId -> boolean
  const [error, setError] = useState(null)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [attendanceStats, setAttendanceStats] = useState({
    currentlyInside: 0,
    todayTotal: 0,
  })

  // 代行インストラクター選択モーダル
  const [substituteModalOpen, setSubstituteModalOpen] = useState(false)
  const [selectedScheduleId, setSelectedScheduleId] = useState(null)

  const { currentStore, allStores } = useStore()
  const [filterStoreId, setFilterStoreId] = useState('')

  // 店舗初期選択
  useEffect(() => {
    if (currentStore && !filterStoreId) {
      setFilterStoreId(currentStore.id)
    } else if (allStores?.length > 0 && !filterStoreId) {
      setFilterStoreId(allStores[0].id)
    }
  }, [currentStore, allStores])

  // 日付選択用の配列（今日から7日分）
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i)
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: isToday(date)
        ? '今日'
        : isTomorrow(date)
        ? '明日'
        : format(date, 'M/d(E)', { locale: ja }),
      dayOfWeek: date.getDay(),
    }
  })

  // インストラクター一覧を取得
  const fetchInstructors = async () => {
    try {
      const res = await fetch(`/api/instructors?store_id=${filterStoreId}&include_inactive=false`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        setInstructors(data.instructors || [])
      }
    } catch (err) {
      console.error('Instructors fetch error:', err)
    }
  }

  // スケジュールとレポートを取得
  const fetchData = async () => {
    if (!filterStoreId) return

    setLoading(true)
    setError(null)

    try {
      // スケジュール取得（選択日の曜日に対応）
      const dayOfWeek = new Date(selectedDate).getDay()
      const today = format(new Date(), 'yyyy-MM-dd')

      const [schedulesRes, reportsRes, bookingsRes, attendanceRes] = await Promise.all([
        fetch(`/api/schedules?day_of_week=${dayOfWeek}&store_id=${filterStoreId}`, { credentials: 'include' }),
        fetch(`/api/class-reports?date=${selectedDate}&store_id=${filterStoreId}`, { credentials: 'include' }),
        // 本日の予約は店舗フィルターなしで取得（bookingsにstore_idが設定されていない場合も取得）
        fetch(`/api/bookings?date_from=${today}&date_to=${today}&limit=100`, { credentials: 'include' }),
        // 入退館ログ取得
        fetch(`/api/attendance?date=${today}&store_id=${filterStoreId}&limit=20`, { credentials: 'include' }),
      ])

      const schedulesData = await schedulesRes.json()
      const reportsData = await reportsRes.json()
      const bookingsData = await bookingsRes.json()
      const attendanceData = await attendanceRes.json()

      if (schedulesData.error) throw new Error(schedulesData.error)

      // デバッグログ
      console.log('Bookings API response:', bookingsData)

      // スケジュールを時間順にソート
      const sortedSchedules = (schedulesData.schedules || []).sort((a, b) => {
        return (a.start_time || '').localeCompare(b.start_time || '')
      })

      setSchedules(sortedSchedules)

      // bookingsデータをセット（エラーがあってもログに残す）
      if (bookingsData.error) {
        console.error('Bookings fetch error:', bookingsData.error)
      }
      setBookings(bookingsData.bookings || [])

      // 入退館ログをセット
      if (attendanceData.error) {
        console.error('Attendance fetch error:', attendanceData.error)
      }
      setAttendanceLogs(attendanceData.logs || [])
      setAttendanceStats(attendanceData.stats || { currentlyInside: 0, todayTotal: 0 })

      // レポートをscheduleIdでインデックス化
      const reportsMap = {}
      ;(reportsData.reports || []).forEach((r) => {
        reportsMap[r.class_schedule_id] = r
      })
      setReports(reportsMap)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (filterStoreId) {
      fetchData()
      fetchInstructors()
    }
  }, [selectedDate, filterStoreId])

  // レポートの実施チェックボックス変更
  const handleConductedChange = (scheduleId, checked) => {
    setReports((prev) => ({
      ...prev,
      [scheduleId]: {
        ...prev[scheduleId],
        class_schedule_id: scheduleId,
        is_conducted: checked,
        participant_count: prev[scheduleId]?.participant_count || 0,
      },
    }))
  }

  // レポートの参加者数変更
  const handleParticipantChange = (scheduleId, count) => {
    const value = parseInt(count) || 0
    setReports((prev) => ({
      ...prev,
      [scheduleId]: {
        ...prev[scheduleId],
        class_schedule_id: scheduleId,
        participant_count: value,
        is_conducted: prev[scheduleId]?.is_conducted ?? false,
      },
    }))
  }

  // 代行インストラクター変更
  const handleSubstituteChange = (scheduleId, instructorId, instructorName) => {
    setReports((prev) => ({
      ...prev,
      [scheduleId]: {
        ...prev[scheduleId],
        class_schedule_id: scheduleId,
        substitute_instructor_id: instructorId || null,
        substitute_instructor_name: instructorName || null,
      },
    }))
    setSubstituteModalOpen(false)
    setSelectedScheduleId(null)
  }

  // 代行インストラクターをクリア
  const clearSubstitute = (scheduleId) => {
    setReports((prev) => ({
      ...prev,
      [scheduleId]: {
        ...prev[scheduleId],
        class_schedule_id: scheduleId,
        substitute_instructor_id: null,
        substitute_instructor_name: null,
      },
    }))
  }

  // レポート保存
  const saveReport = async (scheduleId) => {
    const report = reports[scheduleId]
    if (!report) return

    setSavingReports((prev) => ({ ...prev, [scheduleId]: true }))

    try {
      const res = await fetch('/api/class-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_schedule_id: scheduleId,
          store_id: filterStoreId,
          report_date: selectedDate,
          is_conducted: report.is_conducted ?? false,
          participant_count: report.participant_count ?? 0,
          substitute_instructor_id: report.substitute_instructor_id || null,
          substitute_instructor_name: report.substitute_instructor_name || null,
          notes: report.notes || null,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // 保存成功
      setReports((prev) => ({
        ...prev,
        [scheduleId]: data.report,
      }))
    } catch (err) {
      console.error('Save report error:', err)
      alert('レポートの保存に失敗しました')
    } finally {
      setSavingReports((prev) => ({ ...prev, [scheduleId]: false }))
    }
  }

  // 代行モーダルを開く
  const openSubstituteModal = (scheduleId) => {
    setSelectedScheduleId(scheduleId)
    setSubstituteModalOpen(true)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Home className="w-7 h-7" />
            トップ
          </h1>
          <p className="text-gray-400 mt-1">直近のクラス実施状況・代行設定</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 店舗選択 */}
          {allStores && allStores.length > 1 && (
            <select
              value={filterStoreId}
              onChange={(e) => setFilterStoreId(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
            >
              {allStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>
      </div>

      {/* 日付選択タブ */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {dateOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedDate(option.value)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedDate === option.value
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">この日のスケジュールはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const report = reports[schedule.id] || {}
            const isSaving = savingReports[schedule.id]
            const substituteInstructor = report.substitute_instructor_name

            return (
              <div key={schedule.id} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* スケジュールカード */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* 時間・クラス情報 */}
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-2xl font-bold text-white">
                          {schedule.start_time?.slice(0, 5) || '-'}
                        </p>
                        <p className="text-xs text-gray-500">
                          〜{schedule.end_time?.slice(0, 5) || '-'}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">
                          {schedule.classes?.name || schedule.class?.name || 'クラス名なし'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-400">
                            担当: {schedule.instructor_name || '未設定'}
                          </span>
                          {substituteInstructor && (
                            <span className="text-sm text-orange-400 flex items-center gap-1">
                              → 代行: {substituteInstructor}
                              <button
                                onClick={() => clearSubstitute(schedule.id)}
                                className="p-0.5 hover:bg-gray-700 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* アクションエリア */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* 代行選択ボタン */}
                      <button
                        onClick={() => openSubstituteModal(schedule.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          substituteInstructor
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                            : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <UserCog className="w-4 h-4" />
                        <span className="text-sm">代行</span>
                      </button>

                      {/* 実施チェック */}
                      <button
                        onClick={() => handleConductedChange(schedule.id, !report.is_conducted)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          report.is_conducted
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        {report.is_conducted ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                        <span className="text-sm font-medium">
                          {report.is_conducted ? '実施済み' : '未実施'}
                        </span>
                      </button>

                      {/* 参加者数入力 */}
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          value={report.participant_count ?? ''}
                          onChange={(e) => handleParticipantChange(schedule.id, e.target.value)}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-center text-sm"
                        />
                        <span className="text-gray-500 text-sm">人</span>
                      </div>

                      {/* 保存ボタン */}
                      <button
                        onClick={() => saveReport(schedule.id)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 本日の予約セクション */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-400" />
          本日の予約
        </h2>
        {bookings.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">本日の予約はありません</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-700">
              {bookings
                .filter((b) => !['canceled_by_member', 'canceled_by_admin', 'cancelled'].includes(b.status))
                .map((booking) => {
                  const memberName = booking.member
                    ? `${booking.member.last_name || ''} ${booking.member.first_name || ''}`.trim() ||
                      booking.member.name
                    : booking.guest_name || booking.name || '名前なし'

                  const bookingTime = booking.time_slots?.start_time?.slice(0, 5) || '-'

                  return (
                    <div
                      key={booking.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-700/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <p className="text-lg font-bold text-violet-400">{bookingTime}</p>
                        </div>
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{memberName}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {booking.booking_type && (
                              <span className={`px-2 py-0.5 rounded ${
                                booking.booking_type === 'trial'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-green-500/20 text-green-400'
                              }`}>
                                {booking.booking_type === 'trial' ? '体験' : '見学'}
                              </span>
                            )}
                            {(booking.member?.phone || booking.phone) && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {booking.member?.phone || booking.phone}
                              </span>
                            )}
                            {(booking.member?.email || booking.email) && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {booking.member?.email || booking.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-green-500/20 text-green-400'
                            : booking.status === 'checked_in'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {booking.status === 'confirmed' ? '確認済み' :
                           booking.status === 'checked_in' ? '来店済み' :
                           booking.status === 'completed' ? '完了' : booking.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* 入退館ログセクション */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-green-400" />
            本日の入退館
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-gray-400">滞在中: <span className="text-white font-medium">{attendanceStats.currentlyInside}人</span></span>
            </div>
            <span className="text-gray-400">本日来館: <span className="text-white font-medium">{attendanceStats.todayTotal}人</span></span>
            <Link
              href="/admin/attendance"
              className="text-violet-400 hover:text-violet-300 transition"
            >
              すべて見る →
            </Link>
          </div>
        </div>
        {attendanceLogs.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">本日の入退館記録はありません</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-700">
              {attendanceLogs.slice(0, 10).map((log) => {
                const isActive = !log.check_out_at
                const memberName = log.member
                  ? `${log.member.last_name || ''} ${log.member.first_name || ''}`.trim()
                  : '不明'

                return (
                  <div
                    key={log.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-700/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{memberName}</p>
                        <p className="text-xs text-gray-500">#{log.member?.member_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm">
                        <LogIn className="w-4 h-4 text-green-400" />
                        <span className="text-white">
                          {log.check_in_at ? format(new Date(log.check_in_at), 'HH:mm') : '-'}
                        </span>
                      </div>
                      {log.check_out_at ? (
                        <div className="flex items-center gap-2 text-sm">
                          <LogOut className="w-4 h-4 text-orange-400" />
                          <span className="text-white">
                            {format(new Date(log.check_out_at), 'HH:mm')}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                          滞在中
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 代行インストラクター選択モーダル */}
      {substituteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">代行インストラクター選択</h2>
              <button
                onClick={() => {
                  setSubstituteModalOpen(false)
                  setSelectedScheduleId(null)
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* 代行なしオプション */}
              <button
                onClick={() => handleSubstituteChange(selectedScheduleId, null, null)}
                className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg mb-2 transition-colors"
              >
                <p className="text-white font-medium">代行なし（通常通り）</p>
                <p className="text-xs text-gray-400">元のインストラクターが担当</p>
              </button>

              {/* インストラクター一覧 */}
              <div className="space-y-2">
                {instructors.map((instructor) => (
                  <button
                    key={instructor.id}
                    onClick={() =>
                      handleSubstituteChange(selectedScheduleId, instructor.id, instructor.name)
                    }
                    className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-3"
                  >
                    {instructor.image_url ? (
                      <Image
                        src={instructor.image_url}
                        alt={instructor.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{instructor.name}</p>
                    </div>
                  </button>
                ))}

                {instructors.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    インストラクターが登録されていません
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
