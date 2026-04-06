'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  FileText,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  User,
  Eye,
  X,
} from 'lucide-react'

const ACTION_LABELS = {
  create: { label: '作成', color: 'bg-green-500/20 text-green-400' },
  update: { label: '更新', color: 'bg-blue-500/20 text-blue-400' },
  delete: { label: '削除', color: 'bg-red-500/20 text-red-400' },
  login: { label: 'ログイン', color: 'bg-violet-500/20 text-violet-400' },
  logout: { label: 'ログアウト', color: 'bg-gray-500/20 text-gray-400' },
  export: { label: 'エクスポート', color: 'bg-orange-500/20 text-orange-400' },
}

const TABLE_LABELS = {
  auth: '認証',
  members: '会員',
  bookings: '予約',
  payments: '決済',
  classes: 'クラス',
  class_schedules: 'スケジュール',
  membership_plans: '料金プラン',
  stores: '店舗',
  announcements: 'お知らせ',
  admin_users: '管理者',
  staff: '従業員',
  auth_users: 'ログインユーザー',
  schedule_exceptions: '休講設定',
}

// アクションカテゴリ
const ACTION_CATEGORIES = {
  all: { label: 'すべて', actions: null },
  auth: { label: '認証（ログイン/ログアウト）', actions: ['login', 'logout'] },
  data: { label: 'データ操作（作成/更新/削除）', actions: ['create', 'update', 'delete'] },
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    action: '',
    action_category: '',
    table_name: '',
    search: '',
    start_date: '',
    end_date: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (filters.action) params.set('action', filters.action)
      if (filters.action_category) params.set('action_category', filters.action_category)
      if (filters.table_name) params.set('table_name', filters.table_name)
      if (filters.search) params.set('search', filters.search)
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date) params.set('end_date', filters.end_date)

      const res = await fetch(`/api/audit-logs?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '監査ログの取得に失敗しました')
      }

      setLogs(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
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
      action: '',
      action_category: '',
      table_name: '',
      search: '',
      start_date: '',
      end_date: '',
    })
    setPage(1)
  }

  const openDetail = (log) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy/MM/dd HH:mm:ss', { locale: ja })
  }

  const renderChanges = (changes) => {
    if (!changes) return null

    return Object.entries(changes).map(([key, value]) => (
      <div key={key} className="mb-2 text-sm">
        <span className="font-medium text-white">{key}:</span>
        <div className="ml-4 grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-500">変更前: </span>
            <span className="text-red-400">
              {value.old !== null && value.old !== undefined
                ? typeof value.old === 'object'
                  ? JSON.stringify(value.old)
                  : String(value.old)
                : '(なし)'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">変更後: </span>
            <span className="text-green-400">
              {value.new !== null && value.new !== undefined
                ? typeof value.new === 'object'
                  ? JSON.stringify(value.new)
                  : String(value.new)
                : '(なし)'}
            </span>
          </div>
        </div>
      </div>
    ))
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            監査ログ
          </h1>
          <p className="text-gray-400 text-sm mt-1">管理画面での操作履歴</p>
        </div>
        <div className="flex gap-2">
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
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>
      </div>

      {/* フィルター */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          {/* カテゴリフィルター（タブスタイル） */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">操作カテゴリ</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ACTION_CATEGORIES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange('action_category', key === 'all' ? '' : key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    (key === 'all' && !filters.action_category) || filters.action_category === key
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">操作種別（詳細）</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="">すべて</option>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">対象</label>
              <select
                value={filters.table_name}
                onChange={(e) => handleFilterChange('table_name', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="">すべて</option>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">開始日</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">終了日</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="説明で検索..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500"
                />
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white transition ml-4"
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
            全 {total.toLocaleString()} 件中 {(page - 1) * 20 + 1} -{' '}
            {Math.min(page * 20, total)} 件を表示
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
            <p className="text-gray-400 mt-2">読み込み中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-gray-400 mt-2">監査ログがありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    操作者
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    操作
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    対象
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                    説明
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-gray-400 font-medium">
                    詳細
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-white">
                          {log.admin_name || log.admin_email || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ACTION_LABELS[log.action] ? (
                        <span
                          className={`px-2 py-1 rounded text-xs ${ACTION_LABELS[log.action].color}`}
                        >
                          {ACTION_LABELS[log.action].label}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">{log.action}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300 line-clamp-1">
                        {log.description || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetail(log)}
                        className="p-1 text-gray-400 hover:text-white transition"
                        title="詳細を見る"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* 詳細モーダル */}
      {isDetailOpen && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">監査ログ詳細</h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="space-y-4">
                {/* 基本情報 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">日時</label>
                    <p className="text-white">{formatDateTime(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">操作者</label>
                    <p className="text-white">
                      {selectedLog.admin_name || selectedLog.admin_email || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">操作</label>
                    {ACTION_LABELS[selectedLog.action] ? (
                      <span
                        className={`px-2 py-1 rounded text-xs ${ACTION_LABELS[selectedLog.action].color}`}
                      >
                        {ACTION_LABELS[selectedLog.action].label}
                      </span>
                    ) : (
                      <p className="text-white">{selectedLog.action}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">対象テーブル</label>
                    <p className="text-white">
                      {TABLE_LABELS[selectedLog.table_name] || selectedLog.table_name}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">説明</label>
                  <p className="text-white">{selectedLog.description || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">レコードID</label>
                  <p className="text-white font-mono text-sm">{selectedLog.record_id || '-'}</p>
                </div>

                {/* IPアドレス・User-Agent */}
                {(selectedLog.ip_address || selectedLog.user_agent) && (
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">接続情報</h3>
                    {selectedLog.ip_address && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">IPアドレス</label>
                        <p className="text-white font-mono text-sm">{selectedLog.ip_address}</p>
                      </div>
                    )}
                    {selectedLog.user_agent && (
                      <div className="mt-2">
                        <label className="block text-sm text-gray-400 mb-1">User-Agent</label>
                        <p className="text-white text-xs break-all">{selectedLog.user_agent}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 変更内容 */}
                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">変更内容</h3>
                    <div className="bg-gray-900 rounded-lg p-4">
                      {renderChanges(selectedLog.changes)}
                    </div>
                  </div>
                )}

                {/* 変更前データ */}
                {selectedLog.old_data && (
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">変更前のデータ</h3>
                    <pre className="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 変更後データ */}
                {selectedLog.new_data && (
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">変更後のデータ</h3>
                    <pre className="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-700">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
