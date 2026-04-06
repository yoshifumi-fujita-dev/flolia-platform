'use client'

import { useState, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, differenceInYears, differenceInMonths, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Users,
  RefreshCw,
  DollarSign,
  LayoutDashboard,
  TrendingUp,
  UserPlus,
  UserMinus,
  PauseCircle,
  PlayCircle,
  DoorOpen,
  Calendar,
  Heart,
  BarChart3,
  Target,
  Clock,
  Store,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

export default function AdminDashboardPage() {
  const { allStores } = useStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('today')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [storeFilter, setStoreFilter] = useState('')

  // 本日の統計
  const [todayStats, setTodayStats] = useState({
    revenue: 0,
    newMembers: 0,
    pausedMembers: 0,
    canceledMembers: 0,
    resumedMembers: 0,
    checkins: 0,
  })

  // 期間の統計
  const [periodStats, setPeriodStats] = useState({
    revenue: 0,
    newMembers: 0,
    pausedMembers: 0,
    canceledMembers: 0,
  })

  // 会員ステータス分布
  const [memberStats, setMemberStats] = useState([])

  // 男女比
  const [genderStats, setGenderStats] = useState({ female: 0, male: 0, other: 0, unknown: 0 })

  // 年齢層分布
  const [ageStats, setAgeStats] = useState([])

  // 継続率
  const [retentionRate, setRetentionRate] = useState(0)
  const [avgMembershipMonths, setAvgMembershipMonths] = useState(0)

  // 成約率
  const [conversionStats, setConversionStats] = useState({
    trialCount: 0,
    convertedCount: 0,
    conversionRate: 0,
  })

  // 今後の体験予約
  const [upcomingTrials, setUpcomingTrials] = useState([])

  // 日付範囲を計算
  const getDateRange = () => {
    const now = new Date()
    let from, to

    if (dateRange === 'today') {
      from = startOfDay(now)
      to = endOfDay(now)
    } else if (dateRange === '7') {
      from = subDays(now, 7)
      to = now
    } else if (dateRange === '30') {
      from = subDays(now, 30)
      to = now
    } else if (dateRange === 'month') {
      from = startOfMonth(now)
      to = endOfMonth(now)
    } else if (dateRange === 'all') {
      from = new Date('2020-01-01')
      to = now
    } else if (dateRange === 'custom') {
      from = customDateFrom ? parseISO(customDateFrom) : subDays(now, 30)
      to = customDateTo ? parseISO(customDateTo) : now
    } else {
      from = subDays(now, 7)
      to = now
    }

    return {
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    }
  }

  // ダッシュボードデータを取得
  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { from, to } = getDateRange()
      const today = format(new Date(), 'yyyy-MM-dd')
      const storeParam = storeFilter ? `&store_id=${storeFilter}` : ''

      // 並列でデータ取得
      const [
        paymentsRes,
        todayPaymentsRes,
        membersRes,
        attendanceRes,
        bookingsRes,
      ] = await Promise.all([
        fetch(`/api/payments/summary?date_from=${from}&date_to=${to}${storeParam}`),
        fetch(`/api/payments/summary?date_from=${today}&date_to=${today}${storeParam}`),
        fetch(`/api/members?limit=10000${storeParam}`),
        fetch(`/api/attendance?date=${today}&limit=20${storeParam}`),
        fetch(`/api/bookings?date_from=${today}&status=confirmed&limit=20${storeParam}`),
      ])

      const paymentsData = await paymentsRes.json()
      const todayPaymentsData = await todayPaymentsRes.json()
      const membersData = await membersRes.json()
      const attendanceData = await attendanceRes.json()
      const bookingsData = await bookingsRes.json()

      const members = membersData.members || []
      const now = new Date()

      // 会員ステータス分布
      const statusCounts = {}
      members.forEach((member) => {
        const status = member.status || 'active'
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })
      setMemberStats(
        Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
      )

      // 男女比（在籍会員のみ）
      const activeMembers = members.filter((m) => m.status === 'active')
      const genderCounts = { female: 0, male: 0, other: 0, unknown: 0 }
      activeMembers.forEach((m) => {
        if (m.gender === 'female') genderCounts.female++
        else if (m.gender === 'male') genderCounts.male++
        else if (m.gender === 'other') genderCounts.other++
        else genderCounts.unknown++
      })
      setGenderStats(genderCounts)

      // 年齢層分布（在籍会員のみ）
      const ageBuckets = {
        '10代': 0,
        '20代': 0,
        '30代': 0,
        '40代': 0,
        '50代': 0,
        '60代以上': 0,
        '不明': 0,
      }
      activeMembers.forEach((m) => {
        if (!m.birth_date) {
          ageBuckets['不明']++
          return
        }
        const age = differenceInYears(now, new Date(m.birth_date))
        if (age < 20) ageBuckets['10代']++
        else if (age < 30) ageBuckets['20代']++
        else if (age < 40) ageBuckets['30代']++
        else if (age < 50) ageBuckets['40代']++
        else if (age < 60) ageBuckets['50代']++
        else ageBuckets['60代以上']++
      })
      setAgeStats(Object.entries(ageBuckets).map(([range, count]) => ({ range, count })))

      // 継続率（在籍 / (在籍 + 退会 + 休会)）
      const activeCount = statusCounts['active'] || 0
      const canceledCount = statusCounts['canceled'] || 0
      const pausedCount = statusCounts['paused'] || 0
      const totalEverJoined = activeCount + canceledCount + pausedCount
      const retention = totalEverJoined > 0 ? Math.round((activeCount / totalEverJoined) * 100) : 0
      setRetentionRate(retention)

      // 平均在籍期間（在籍会員のみ）
      let totalMonths = 0
      let countWithDate = 0
      activeMembers.forEach((m) => {
        if (m.created_at) {
          totalMonths += differenceInMonths(now, new Date(m.created_at))
          countWithDate++
        }
      })
      setAvgMembershipMonths(countWithDate > 0 ? Math.round(totalMonths / countWithDate) : 0)

      // 成約率（体験→正会員）
      // membership_type = 'trial' で登録された人のうち、現在 status = 'active' かつ membership_type = 'monthly' の人
      const trialMembers = members.filter((m) => {
        // 元々体験として来た人（trialステータスか、membership_typeがtrialだった人）
        return m.status === 'trial' || m.membership_type === 'trial'
      })
      // 正会員になった人（membership_type が monthly で status が active）
      const convertedMembers = members.filter((m) =>
        m.membership_type === 'monthly' && m.status === 'active'
      )
      // 体験から入会した可能性のある人（簡易計算）
      // より正確には、体験会員が後に正会員になった履歴が必要
      const trialCount = trialMembers.length + convertedMembers.length // 体験+成約の合計を分母に
      const convertedCount = convertedMembers.length
      const conversionRate = trialCount > 0 ? Math.round((convertedCount / trialCount) * 100) : 0
      setConversionStats({
        trialCount: members.filter(m => m.status === 'trial').length,
        convertedCount,
        conversionRate,
      })

      // 本日の会員変動
      const todayNewMembers = members.filter(
        (m) => m.created_at && m.created_at.startsWith(today)
      ).length
      const todayPausedMembers = members.filter(
        (m) => m.status === 'paused' && m.updated_at && m.updated_at.startsWith(today)
      ).length
      const todayCanceledMembers = members.filter(
        (m) => m.status === 'canceled' && m.updated_at && m.updated_at.startsWith(today)
      ).length

      // 期間内の新規入会
      const periodNewMembers = members.filter((m) => {
        if (!m.created_at) return false
        const createdDate = m.created_at.slice(0, 10)
        return createdDate >= from && createdDate <= to
      }).length

      // 本日の入館数
      const todayCheckins = (attendanceData.logs || []).filter(
        (log) => log.action === 'check_in'
      ).length

      setTodayStats({
        revenue: todayPaymentsData.summary?.total || 0,
        newMembers: todayNewMembers,
        pausedMembers: todayPausedMembers,
        canceledMembers: todayCanceledMembers,
        resumedMembers: 0,
        checkins: todayCheckins,
      })

      setPeriodStats({
        revenue: paymentsData.summary?.total || 0,
        newMembers: periodNewMembers,
        pausedMembers: 0,
        canceledMembers: 0,
      })

      // 今後の体験予約（本日以降、日付昇順で表示）
      const upcomingBookings = (bookingsData.bookings || [])
        .filter((b) => b.booking_date >= today)
        .sort((a, b) => {
          if (a.booking_date !== b.booking_date) {
            return a.booking_date.localeCompare(b.booking_date)
          }
          // 同日なら時間順
          const aTime = a.time_slots?.start_time || '00:00'
          const bTime = b.time_slots?.start_time || '00:00'
          return aTime.localeCompare(bTime)
        })
      setUpcomingTrials(upcomingBookings)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange, storeFilter, customDateFrom, customDateTo])

  const STATUS_LABELS = {
    active: { label: '在籍', color: 'bg-green-500', textColor: 'text-green-400' },
    trial: { label: '体験', color: 'bg-blue-500', textColor: 'text-blue-400' },
    visitor: { label: 'ビジター', color: 'bg-cyan-500', textColor: 'text-cyan-400' },
    paused: { label: '休会', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    canceled: { label: '退会', color: 'bg-red-500', textColor: 'text-red-400' },
    pending: { label: '保留', color: 'bg-gray-500', textColor: 'text-gray-400' },
  }

  const GENDER_LABELS = {
    female: { label: '女性', color: 'bg-pink-500' },
    male: { label: '男性', color: 'bg-blue-500' },
    other: { label: 'その他', color: 'bg-purple-500' },
    unknown: { label: '未設定', color: 'bg-gray-500' },
  }

  const AGE_COLORS = {
    '10代': 'bg-cyan-500',
    '20代': 'bg-green-500',
    '30代': 'bg-yellow-500',
    '40代': 'bg-orange-500',
    '50代': 'bg-red-500',
    '60代以上': 'bg-purple-500',
    '不明': 'bg-gray-500',
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
  }

  const getPeriodLabel = () => {
    switch (dateRange) {
      case 'today': return '本日'
      case '7': return '直近7日間'
      case '30': return '直近30日間'
      case 'month': return '今月'
      case 'all': return '全期間'
      case 'custom': return '指定期間'
      default: return ''
    }
  }

  const totalGender = genderStats.female + genderStats.male + genderStats.other + genderStats.unknown
  const totalAge = ageStats.reduce((sum, a) => sum + a.count, 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7" />
            ダッシュボード
          </h1>
          <p className="text-gray-400 mt-1">売上・会員・入退館統計</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">全店舗</option>
            {(allStores || []).map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="today">本日</option>
            <option value="7">直近7日</option>
            <option value="30">直近30日</option>
            <option value="month">今月</option>
            <option value="all">全期間</option>
            <option value="custom">期間指定</option>
          </select>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <span className="text-gray-400">〜</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : (
        <>
          {/* 本日のサマリー */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              本日のサマリー（{format(new Date(), 'M月d日(E)', { locale: ja })}）
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">売上</span>
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(todayStats.revenue)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DoorOpen className="w-4 h-4 text-violet-400" />
                  <span className="text-gray-400 text-sm">入館</span>
                </div>
                <p className="text-xl font-bold text-white">{todayStats.checkins}人</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400 text-sm">入会</span>
                </div>
                <p className="text-xl font-bold text-white">{todayStats.newMembers}人</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PauseCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400 text-sm">休会</span>
                </div>
                <p className="text-xl font-bold text-white">{todayStats.pausedMembers}人</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserMinus className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400 text-sm">退会</span>
                </div>
                <p className="text-xl font-bold text-white">{todayStats.canceledMembers}人</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PlayCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-400 text-sm">復帰</span>
                </div>
                <p className="text-xl font-bold text-white">{todayStats.resumedMembers}人</p>
              </div>
            </div>
          </div>

          {/* 期間統計 */}
          {dateRange !== 'today' && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-400" />
                {getPeriodLabel()}の統計
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400 text-sm">売上合計</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(periodStats.revenue)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400 text-sm">新規入会</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{periodStats.newMembers}人</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    <span className="text-gray-400 text-sm">在籍会員</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {memberStats.find((s) => s.status === 'active')?.count || 0}人
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PauseCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-400 text-sm">休会中</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {memberStats.find((s) => s.status === 'paused')?.count || 0}人
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 継続率・成約率 */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              会員継続・成約状況
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">継続率</span>
                </div>
                <p className="text-2xl font-bold text-white">{retentionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">在籍/(在籍+休会+退会)</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-400 text-sm">成約率</span>
                </div>
                <p className="text-2xl font-bold text-white">{conversionStats.conversionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">正会員/全会員</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-violet-400" />
                  <span className="text-gray-400 text-sm">平均在籍期間</span>
                </div>
                <p className="text-2xl font-bold text-white">{avgMembershipMonths}ヶ月</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400 text-sm">体験中</span>
                </div>
                <p className="text-2xl font-bold text-white">{conversionStats.trialCount}人</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">正会員</span>
                </div>
                <p className="text-2xl font-bold text-white">{conversionStats.convertedCount}人</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserMinus className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400 text-sm">退会済み</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {memberStats.find((s) => s.status === 'canceled')?.count || 0}人
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {/* 会員ステータス分布 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" />
                会員ステータス
              </h2>
              {memberStats.length === 0 ? (
                <p className="text-gray-500 text-sm">データがありません</p>
              ) : (
                <div className="space-y-3">
                  {memberStats
                    .sort((a, b) => {
                      const order = ['active', 'trial', 'visitor', 'paused', 'canceled', 'pending']
                      return order.indexOf(a.status) - order.indexOf(b.status)
                    })
                    .map((item, index) => {
                      const statusInfo = STATUS_LABELS[item.status] || {
                        label: item.status,
                        color: 'bg-gray-500',
                      }
                      const total = memberStats.reduce((sum, s) => sum + s.count, 0)
                      const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                              <span className="text-gray-300">{statusInfo.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{item.count}人</span>
                              <span className="text-gray-500 text-sm">({percentage}%)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden ml-6">
                            <div
                              className={`h-full rounded-full ${statusInfo.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                <span className="text-gray-400">合計</span>
                <span className="text-white font-bold">
                  {memberStats.reduce((sum, s) => sum + s.count, 0)}人
                </span>
              </div>
            </div>

            {/* 男女比 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                男女比（在籍会員）
              </h2>
              {totalGender === 0 ? (
                <p className="text-gray-500 text-sm">データがありません</p>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 36 36" className="w-32 h-32 transform -rotate-90">
                        {(() => {
                          const femalePercent = totalGender > 0 ? (genderStats.female / totalGender) * 100 : 0
                          const malePercent = totalGender > 0 ? (genderStats.male / totalGender) * 100 : 0
                          const otherPercent = totalGender > 0 ? ((genderStats.other + genderStats.unknown) / totalGender) * 100 : 0
                          let offset = 0
                          const segments = []

                          if (femalePercent > 0) {
                            segments.push(
                              <circle
                                key="female"
                                cx="18" cy="18" r="16"
                                fill="none"
                                stroke="#ec4899"
                                strokeWidth="3"
                                strokeDasharray={`${femalePercent} ${100 - femalePercent}`}
                                strokeDashoffset={-offset}
                              />
                            )
                            offset += femalePercent
                          }
                          if (malePercent > 0) {
                            segments.push(
                              <circle
                                key="male"
                                cx="18" cy="18" r="16"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3"
                                strokeDasharray={`${malePercent} ${100 - malePercent}`}
                                strokeDashoffset={-offset}
                              />
                            )
                            offset += malePercent
                          }
                          if (otherPercent > 0) {
                            segments.push(
                              <circle
                                key="other"
                                cx="18" cy="18" r="16"
                                fill="none"
                                stroke="#6b7280"
                                strokeWidth="3"
                                strokeDasharray={`${otherPercent} ${100 - otherPercent}`}
                                strokeDashoffset={-offset}
                              />
                            )
                          }
                          return segments
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{totalGender}人</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(genderStats).map(([key, count]) => {
                      if (count === 0) return null
                      const info = GENDER_LABELS[key]
                      const percent = totalGender > 0 ? Math.round((count / totalGender) * 100) : 0
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${info.color}`} />
                            <span className="text-gray-300">{info.label}</span>
                          </div>
                          <span className="text-white">{count}人 ({percent}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* 年齢層分布 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                年齢層（在籍会員）
              </h2>
              {totalAge === 0 ? (
                <p className="text-gray-500 text-sm">データがありません</p>
              ) : (
                <div className="space-y-3">
                  {ageStats.map((item) => {
                    if (item.count === 0) return null
                    const percent = totalAge > 0 ? Math.round((item.count / totalAge) * 100) : 0
                    const color = AGE_COLORS[item.range] || 'bg-gray-500'
                    return (
                      <div key={item.range}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-300 text-sm">{item.range}</span>
                          <span className="text-white text-sm">{item.count}人 ({percent}%)</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 今後の体験予約 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              今後の体験予約
            </h2>
            {upcomingTrials.length === 0 ? (
              <p className="text-gray-500 text-sm">今後の体験予約はありません</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingTrials.map((booking) => {
                  const bookingDate = new Date(booking.booking_date)
                  const isToday = booking.booking_date === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <div
                      key={booking.id}
                      className={`p-4 rounded-lg border ${
                        isToday
                          ? 'bg-violet-500/10 border-violet-500/30'
                          : 'bg-gray-700/50 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">{booking.name}</p>
                          <p className="text-gray-400 text-sm">
                            {booking.booking_type === 'trial' ? '体験' : '見学'}
                          </p>
                        </div>
                        {isToday && (
                          <span className="text-xs bg-violet-500 text-white px-2 py-1 rounded">
                            本日
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-300">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {format(bookingDate, 'M月d日(E)', { locale: ja })}
                        </p>
                        <p className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          {booking.time_slots?.start_time?.slice(0, 5) || '--:--'} - {booking.time_slots?.end_time?.slice(0, 5) || '--:--'}
                        </p>
                        {booking.stores?.name && (
                          <p className="flex items-center gap-2 mt-1 text-gray-500">
                            <Store className="w-4 h-4" />
                            {booking.stores.name}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-gray-400 text-xs">{booking.email}</p>
                        <p className="text-gray-400 text-xs">{booking.phone}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
