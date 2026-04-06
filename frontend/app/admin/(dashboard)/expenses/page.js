'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Receipt,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Image as ImageIcon,
  HelpCircle,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

const STATUS_LABELS = {
  pending: { label: '審査中', color: 'bg-yellow-900/50 text-yellow-400', icon: Clock },
  approved: { label: '承認済み', color: 'bg-green-900/50 text-green-400', icon: CheckCircle },
  rejected: { label: '却下', color: 'bg-red-900/50 text-red-400', icon: XCircle },
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [staff, setStaff] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { stores, isAdmin } = useStore()

  const [filters, setFilters] = useState({
    status: '',
    staff_id: '',
    category_id: '',
    store_id: '',
    start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    exported: '',
  })

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [exportSettings, setExportSettings] = useState({
    start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    include_exported: false,
    mark_as_exported: true,
  })
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // 担当店舗が1つの場合は自動選択
  useEffect(() => {
    if (!isAdmin && stores.length === 1 && !filters.store_id) {
      setFilters(prev => ({ ...prev, store_id: stores[0].id }))
    }
  }, [stores, isAdmin, filters.store_id])

  const fetchExpenses = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (filters.status) params.set('status', filters.status)
      if (filters.staff_id) params.set('staff_id', filters.staff_id)
      if (filters.category_id) params.set('category_id', filters.category_id)
      if (filters.store_id) params.set('store_id', filters.store_id)
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date) params.set('end_date', filters.end_date)
      if (filters.exported) params.set('exported', filters.exported)

      const res = await fetch(`/api/expenses?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setExpenses(data.expenses || [])
      setSummary(data.summary || null)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/expenses/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff?limit=1000')
      const data = await res.json()
      if (res.ok) {
        setStaff(data.staff || [])
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    }
  }

  useEffect(() => {
    fetchExpenses()
    fetchCategories()
    fetchStaff()
  }, [page])

  const handleSearch = () => {
    setPage(1)
    fetchExpenses()
  }

  const handleApprove = async (expense) => {
    if (!confirm('この経費申請を承認しますか？')) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      await fetchExpenses()
      setIsDetailModalOpen(false)
    } catch (err) {
      alert(err.message || '承認に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください')
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      await fetchExpenses()
      setIsRejectModalOpen(false)
      setIsDetailModalOpen(false)
      setRejectionReason('')
    } catch (err) {
      alert(err.message || '却下に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/expenses/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportSettings),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      // CSVをダウンロード
      const csvContent = atob(data.csv_base64)
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert(`${data.expense_count}件の経費（合計¥${data.total_amount.toLocaleString()}）をエクスポートしました`)
      setIsExportModalOpen(false)
      await fetchExpenses()
    } catch (err) {
      alert(err.message || 'エクスポートに失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const openDetailModal = (expense) => {
    setSelectedExpense(expense)
    setIsDetailModalOpen(true)
  }

  const StatusIcon = ({ status }) => {
    const config = STATUS_LABELS[status]
    const Icon = config?.icon || Clock
    return <Icon className="w-4 h-4" />
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">経費管理</h1>
            <p className="text-gray-400 text-sm">経費申請の承認・エクスポート</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            MF会計エクスポート
          </button>
          <button
            onClick={fetchExpenses}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
      </div>

      {/* ヘルプセクション */}
      <div className="mb-6 bg-blue-900/20 border border-blue-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsHelpOpen(!isHelpOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-900/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-blue-300">経費申請・承認の使い方</span>
          </div>
          {isHelpOpen ? (
            <ChevronUp className="w-5 h-5 text-blue-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-400" />
          )}
        </button>
        {isHelpOpen && (
          <div className="p-4 pt-0 space-y-4 text-sm">
            {/* 概要 */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">経費管理とは</h3>
              <p className="text-gray-300">
                スタッフ・インストラクターがLINEアプリ（FLOLIA PARTNER）から申請した経費を、
                管理者がこの画面で承認・却下します。承認された経費はMFクラウド会計にエクスポートできます。
              </p>
            </div>

            {/* 申請方法 */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">経費申請の方法（スタッフ向け）</h3>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside">
                <li>LINE公式アカウント「FLOLIA PARTNER」を開く</li>
                <li>メニューから「経費申請」をタップ</li>
                <li>必要事項を入力
                  <ul className="ml-6 mt-1 space-y-1 text-gray-400 list-disc list-inside">
                    <li>経費カテゴリ（交通費、消耗品費など）</li>
                    <li>金額</li>
                    <li>利用日</li>
                    <li>内容（詳細な説明）</li>
                    <li>領収書画像（任意）</li>
                  </ul>
                </li>
                <li>「申請する」ボタンで送信</li>
              </ol>
            </div>

            {/* 承認フロー */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">承認フロー</h3>
              <div className="flex items-center gap-2 text-gray-300 flex-wrap">
                <span className="px-3 py-1 bg-yellow-900/50 text-yellow-400 rounded-full text-xs font-medium">
                  審査中
                </span>
                <span className="text-gray-500">→</span>
                <span className="text-gray-400">管理者が内容を確認</span>
                <span className="text-gray-500">→</span>
                <div className="flex flex-col gap-1">
                  <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-xs font-medium">
                    承認済み
                  </span>
                  <span className="px-3 py-1 bg-red-900/50 text-red-400 rounded-full text-xs font-medium">
                    却下
                  </span>
                </div>
              </div>
              <ul className="mt-3 text-gray-300 space-y-1">
                <li>• <strong>承認:</strong> 経費として認められ、MF会計へのエクスポート対象になります</li>
                <li>• <strong>却下:</strong> 経費として認められません。却下理由は申請者に通知されます</li>
              </ul>
            </div>

            {/* 権限について */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">権限について</h3>
              <table className="w-full text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 font-medium">操作</th>
                    <th className="text-left py-2 font-medium">必要な権限</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2">経費の申請</td>
                    <td className="py-2">スタッフ・インストラクター（LINEアプリから）</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2">経費一覧の閲覧</td>
                    <td className="py-2">管理者メニューの「経費管理」権限</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2">承認・却下</td>
                    <td className="py-2">管理者（デフォルト）</td>
                  </tr>
                  <tr>
                    <td className="py-2">MF会計エクスポート</td>
                    <td className="py-2">管理者（デフォルト）</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-gray-400 text-xs mt-2">
                ※ 権限は「権限管理」ページで変更できます
              </p>
            </div>

            {/* MF会計連携 */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">MFクラウド会計への連携</h3>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside">
                <li>画面右上の「MF会計エクスポート」ボタンをクリック</li>
                <li>エクスポート期間を選択</li>
                <li>「エクスポート済みを含める」: 再エクスポートする場合はON</li>
                <li>「エクスポート済みとしてマーク」: 通常はONのまま</li>
                <li>「CSVをダウンロード」でファイルを保存</li>
                <li>MFクラウド会計の「仕訳帳」→「インポート」からCSVを取り込み</li>
              </ol>
            </div>

            {/* 注意事項 */}
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
              <h3 className="font-bold text-amber-300 mb-2">注意事項</h3>
              <ul className="text-amber-200/80 space-y-1">
                <li>• 却下した経費は復元できません。誤って却下した場合は、申請者に再申請を依頼してください</li>
                <li>• エクスポート済みの経費を再度エクスポートすると、MF会計側で重複する可能性があります</li>
                <li>• 領収書画像は申請時に添付されます。経費詳細から確認できます</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* サマリー */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm">審査中</p>
            <p className="text-2xl font-bold text-yellow-400">{summary.pending.count}件</p>
            <p className="text-gray-500 text-sm">¥{summary.pending.amount.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm">承認済み</p>
            <p className="text-2xl font-bold text-green-400">{summary.approved.count}件</p>
            <p className="text-gray-500 text-sm">¥{summary.approved.amount.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm">却下</p>
            <p className="text-2xl font-bold text-red-400">{summary.rejected.count}件</p>
            <p className="text-gray-500 text-sm">¥{summary.rejected.amount.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm">合計</p>
            <p className="text-2xl font-bold text-white">{summary.total.count}件</p>
            <p className="text-gray-500 text-sm">¥{summary.total.amount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">フィルター</span>
        </div>
        <div className="grid grid-cols-6 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">ステータス</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">すべて</option>
              <option value="pending">審査中</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">申請者</label>
            <select
              value={filters.staff_id}
              onChange={(e) => setFilters(prev => ({ ...prev, staff_id: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">すべて</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">すべて</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              検索
            </button>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-900/50 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 経費一覧テーブル */}
      <div className="bg-gray-800/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ステータス</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">申請日</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">申請者</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">経費日</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">カテゴリ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">支払先</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">金額</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">エクスポート</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  経費申請がありません
                </td>
              </tr>
            ) : (
              expenses.map((expense) => {
                const statusConfig = STATUS_LABELS[expense.status]
                return (
                  <tr key={expense.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.color}`}>
                        <StatusIcon status={expense.status} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {format(new Date(expense.submitted_at), 'MM/dd HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {expense.staff?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {format(new Date(expense.expense_date), 'yyyy/MM/dd')}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {expense.category?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {expense.vendor_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-white font-medium">
                      ¥{expense.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expense.exported_at ? (
                        <span className="text-xs text-green-400">済</span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetailModal(expense)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 詳細モーダル */}
      {isDetailModalOpen && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">経費申請詳細</h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* ステータス */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">ステータス</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${STATUS_LABELS[selectedExpense.status].color}`}>
                  <StatusIcon status={selectedExpense.status} />
                  {STATUS_LABELS[selectedExpense.status].label}
                </span>
              </div>

              {/* 領収書画像 */}
              {selectedExpense.receipt_image_url && (
                <div>
                  <span className="text-gray-400 text-sm block mb-2">領収書</span>
                  <img
                    src={selectedExpense.receipt_image_url}
                    alt="領収書"
                    className="w-full h-48 object-contain bg-gray-900 rounded-lg"
                  />
                </div>
              )}

              {/* 詳細情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">申請者</span>
                  <p className="text-white">{selectedExpense.staff?.name}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">申請日時</span>
                  <p className="text-white">{format(new Date(selectedExpense.submitted_at), 'yyyy/MM/dd HH:mm')}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">経費発生日</span>
                  <p className="text-white">{format(new Date(selectedExpense.expense_date), 'yyyy/MM/dd')}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">カテゴリ</span>
                  <p className="text-white">{selectedExpense.category?.name}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">金額</span>
                  <p className="text-white text-lg font-bold">¥{selectedExpense.amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">支払先</span>
                  <p className="text-white">{selectedExpense.vendor_name || '-'}</p>
                </div>
              </div>

              {selectedExpense.description && (
                <div>
                  <span className="text-gray-400 text-sm">内容・備考</span>
                  <p className="text-white bg-gray-700/50 rounded-lg p-3 mt-1">{selectedExpense.description}</p>
                </div>
              )}

              {selectedExpense.status === 'rejected' && selectedExpense.rejection_reason && (
                <div>
                  <span className="text-red-400 text-sm">却下理由</span>
                  <p className="text-red-300 bg-red-900/30 rounded-lg p-3 mt-1">{selectedExpense.rejection_reason}</p>
                </div>
              )}

              {selectedExpense.reviewer && (
                <div>
                  <span className="text-gray-400 text-sm">承認者</span>
                  <p className="text-white">{selectedExpense.reviewer.name} ({format(new Date(selectedExpense.reviewed_at), 'yyyy/MM/dd HH:mm')})</p>
                </div>
              )}

              {/* アクションボタン */}
              {selectedExpense.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleApprove(selectedExpense)}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    承認
                  </button>
                  <button
                    onClick={() => {
                      setIsRejectModalOpen(true)
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    却下
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 却下理由入力モーダル */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">却下理由</h2>
              <button
                onClick={() => {
                  setIsRejectModalOpen(false)
                  setRejectionReason('')
                }}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="却下理由を入力してください"
                rows={4}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsRejectModalOpen(false)
                    setRejectionReason('')
                  }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  却下する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* エクスポートモーダル */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">MF会計エクスポート</h2>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-gray-400 text-sm">
                承認済みの経費をMF会計にインポート可能なCSV形式でエクスポートします。
              </p>

              <div>
                <label className="block text-sm text-gray-400 mb-1">開始日</label>
                <input
                  type="date"
                  value={exportSettings.start_date}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">終了日</label>
                <input
                  type="date"
                  value={exportSettings.end_date}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportSettings.include_exported}
                    onChange={(e) => setExportSettings(prev => ({ ...prev, include_exported: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-300 text-sm">エクスポート済みを含める</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportSettings.mark_as_exported}
                    onChange={(e) => setExportSettings(prev => ({ ...prev, mark_as_exported: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-300 text-sm">エクスポート済みとしてマーク</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleExport}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  エクスポート
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
