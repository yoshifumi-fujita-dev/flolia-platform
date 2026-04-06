'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Flame, Award, Timer } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { initLiff, isLoggedIn, login, getProfile } from '@/lib/liff'

export default function MemberActivityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    initializeLiff()
  }, [])

  async function initializeLiff() {
    try {
      setLoading(true)

      const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_MEMBER_MENU_ID)

      if (!liff) {
        throw new Error('LIFF の初期化に失敗しました')
      }

      if (!isLoggedIn()) {
        login()
        return
      }

      const profile = await getProfile()
      const lineUserId = profile?.userId

      if (!lineUserId) {
        throw new Error('LINEプロフィールの取得に失敗しました')
      }

      const res = await fetch(`/api/member/attendance-logs?line_user_id=${lineUserId}&include_stats=true`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error('利用履歴の取得に失敗しました')
      }

      setAttendanceLogs(data.logs || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 入会からの期間を計算
  const membershipDuration = useMemo(() => {
    if (!stats?.member_since) return null
    const start = new Date(stats.member_since)
    const now = new Date()
    const years = now.getFullYear() - start.getFullYear()
    const months = now.getMonth() - start.getMonth() + (years * 12)
    const displayYears = Math.floor(months / 12)
    const displayMonths = months % 12
    if (displayYears > 0) {
      return `${displayYears}年${displayMonths}ヶ月`
    }
    if (displayMonths > 0) {
      return `${displayMonths}ヶ月`
    }
    return '1ヶ月未満'
  }, [stats?.member_since])

  // カレンダー用：日付ごとのログをマッピング
  const logsByDate = useMemo(() => {
    const map = {}
    attendanceLogs.forEach(log => {
      if (log.check_in_at) {
        const dateKey = format(new Date(log.check_in_at), 'yyyy-MM-dd')
        if (!map[dateKey]) {
          map[dateKey] = []
        }
        map[dateKey].push(log)
      }
    })
    return map
  }, [attendanceLogs])

  // 選択された日のログ
  const selectedDateLogs = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return logsByDate[dateKey] || []
  }, [selectedDate, logsByDate])

  // カレンダーの日付を生成
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  const formatDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-'
    const diff = new Date(checkOut) - new Date(checkIn)
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}時間${minutes}分`
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
          <h1 className="text-xl font-bold text-gray-900">アクティビティ</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* 統計カード */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.monthly_count}</p>
              <p className="text-xs text-gray-500 mt-1">今月の利用回数</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <Award className="w-6 h-6 text-pink-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.total_count}</p>
              <p className="text-xs text-gray-500 mt-1">累計利用回数</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <Timer className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">{membershipDuration}</p>
              <p className="text-xs text-gray-500 mt-1">継続期間</p>
            </div>
          </div>
        )}

        {/* カレンダー */}
        <div className="bg-white rounded-lg shadow-md p-4">
          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-gray-900">
              {format(currentMonth, 'yyyy年M月', { locale: ja })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
              <div key={day} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const hasLogs = !!logsByDate[dateKey]
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isTodayDate = isToday(day)
              const dayOfWeek = day.getDay()

              return (
                <button
                  key={dateKey}
                  onClick={() => {
                    if (hasLogs) {
                      setSelectedDate(isSelected ? null : day)
                    }
                  }}
                  className={`
                    relative aspect-square flex items-center justify-center rounded-lg text-sm transition
                    ${!isCurrentMonth ? 'text-gray-300' : dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'}
                    ${isSelected ? 'bg-pink-500 text-white' : ''}
                    ${hasLogs && !isSelected ? 'bg-pink-100 font-semibold' : ''}
                    ${isTodayDate && !isSelected ? 'ring-2 ring-pink-400' : ''}
                    ${hasLogs ? 'cursor-pointer hover:bg-pink-200' : 'cursor-default'}
                  `}
                >
                  {format(day, 'd')}
                  {hasLogs && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-pink-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>

          {/* 選択した日の詳細 */}
          {selectedDate && selectedDateLogs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {format(selectedDate, 'M月d日(E)', { locale: ja })}の利用
              </p>
              {selectedDateLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between bg-pink-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-pink-500" />
                    <span className="text-gray-700">
                      {format(new Date(log.check_in_at), 'HH:mm')}
                      {' - '}
                      {log.check_out_at ? format(new Date(log.check_out_at), 'HH:mm') : '在館中'}
                    </span>
                  </div>
                  <div className="text-right">
                    {log.store_name && (
                      <p className="text-xs text-gray-500">{log.store_name}</p>
                    )}
                    <p className="text-xs font-medium text-pink-600">
                      {formatDuration(log.check_in_at, log.check_out_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 利用履歴リスト */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">利用履歴</h2>
          <div className="space-y-3">
            {attendanceLogs.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600">利用履歴がありません</p>
              </div>
            )}
            {attendanceLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-semibold text-gray-900">
                        {log.check_in_at ? format(new Date(log.check_in_at), 'yyyy年MM月dd日(E)', { locale: ja }) : '-'}
                      </p>
                      {log.store_name && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {log.store_name}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <p className="text-gray-500 mb-1">入館</p>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <p className="font-medium text-gray-900">
                            {log.check_in_at ? format(new Date(log.check_in_at), 'HH:mm') : '-'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">退館</p>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <p className="font-medium text-gray-900">
                            {log.check_out_at ? format(new Date(log.check_out_at), 'HH:mm') : '在館中'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">滞在時間</p>
                    <p className="text-sm font-semibold text-pink-600">
                      {formatDuration(log.check_in_at, log.check_out_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
