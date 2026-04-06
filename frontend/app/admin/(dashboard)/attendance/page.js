'use client'

import { useState, useEffect } from 'react'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  DoorOpen,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  User,
  Clock,
  LogIn,
  LogOut,
  Store,
  Download,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'

const STATUS_LABELS = {
  active: { label: '滞在中', color: 'bg-green-500/20 text-green-400' },
  left: { label: '退館済', color: 'bg-gray-500/20 text-gray-400' },
}

export default function AdminAttendancePage() {
  const { staff } = useAuth()
  const isAdmin = staff?.roles?.name === 'Super Admin' || staff?.roles?.name === 'admin'
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stores, setStores] = useState([])
  const [stats, setStats] = useState({
    currentlyInside: 0,
    todayTotal: 0,
    averageDuration: 0,
  })
  const [filters, setFilters] = useState({
    store_id: '',
    search: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: '', // 'active' or 'left'
  })
  const [showFilters, setShowFilters] = useState(false)

  // 店舗一覧を取得
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores')
        if (res.ok) {
          const data = await res.json()
          setStores(data.stores || [])
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      }
    }
    fetchStores()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '30')
      if (filters.store_id) params.set('store_id', filters.store_id)
      if (filters.search) params.set('search', filters.search)
      if (filters.date) params.set('date', filters.date)
      if (filters.status) params.set('status', filters.status)

      const res = await fetch(`/api/attendance?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '入退館ログの取得に失敗しました')
      }

      setLogs(data.logs || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
      setStats(data.stats || {
        currentlyInside: 0,
        todayTotal: 0,
        averageDuration: 0,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({
      store_id: '',
      search: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      status: '',
    })
    setPage(1)
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'HH:mm', { locale: ja })
  }

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}時間${mins}分`
    }
    return `${mins}分`
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.store_id) params.set('store_id', filters.store_id)
      if (filters.date) params.set('date', filters.date)
      params.set('format', 'csv')

      const res = await fetch(`/api/attendance?${params}`)
      const blob = await res.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${filters.date || 'all'}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      alert('エクスポートに失敗しました')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DoorOpen className="w-6 h-6" />
            入退館ログ
          </h1>
          <p className="text-gray-400 text-sm mt-1">会員の入退館履歴を確認</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 店舗フィルター（常時表示） */}
          <select
            value={filters.store_id}
            onChange={(e) => handleFilterChange('store_id', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            {isAdmin && <option value="">すべての店舗</option>}
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              showFilters
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            フィルター
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
          >
            <Download className="w-4 h-4" />
            CSV出力
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">現在滞在中</p>
              <p className="text-2xl font-bold text-white">{stats.currentlyInside}人</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">本日の来館数</p>
              <p className="text-2xl font-bold text-white">{stats.todayTotal}人</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">平均滞在時間</p>
              <p className="text-2xl font-bold text-white">{formatDuration(stats.averageDuration)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">日付</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">店舗</label>
              <select
                value={filters.store_id}
                onChange={(e) => handleFilterChange('store_id', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="">すべて</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">ステータス</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="">すべて</option>
                <option value="active">滞在中</option>
                <option value="left">退館済</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">会員検索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="名前・会員番号..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              フィルターをクリア
            </button>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ログ一覧 */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            全 {total.toLocaleString()} 件中 {(page - 1) * 30 + 1} -{' '}
            {Math.min(page * 30, total)} 件を表示
          </span>
          <span className="text-sm text-gray-500">
            {filters.date && format(new Date(filters.date), 'yyyy年M月d日(E)', { locale: ja })}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
            <p className="text-gray-400 mt-2">読み込み中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <DoorOpen className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-gray-400 mt-2">入退館記録がありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    会員
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    店舗
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    入館時刻
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    退館時刻
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    滞在時間
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs.map((log) => {
                  const isActive = !log.check_out_at
                  const status = isActive ? STATUS_LABELS.active : STATUS_LABELS.left
                  return (
                    <tr key={log.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">
                              {log.member?.last_name} {log.member?.first_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              #{log.member?.member_number}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-300">
                            {log.store?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <LogIn className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-white">
                            {formatDateTime(log.check_in_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.check_out_at ? (
                          <div className="flex items-center gap-2">
                            <LogOut className="w-4 h-4 text-orange-400" />
                            <span className="text-sm text-white">
                              {formatDateTime(log.check_out_at)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">
                          {formatDuration(log.duration_minutes)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
