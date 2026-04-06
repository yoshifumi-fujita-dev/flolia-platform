'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  CreditCard,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Calendar,
  User,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Store,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

const PAYMENT_TYPE_LABELS = {
  monthly_fee: { label: '月謝', color: 'bg-violet-900/50 text-violet-400' },
  trial_fee: { label: '体験料', color: 'bg-blue-900/50 text-blue-400' },
  merchandise: { label: '物販', color: 'bg-orange-900/50 text-orange-400' },
  other: { label: 'その他', color: 'bg-gray-700 text-gray-400' },
}

const PAYMENT_METHOD_LABELS = {
  cash: '現金',
  card: 'カード',
  bank_transfer: '銀行振込',
  other: 'その他',
}

const STATUS_LABELS = {
  pending: { label: '未入金', color: 'bg-yellow-900/50 text-yellow-400' },
  completed: { label: '入金済', color: 'bg-green-900/50 text-green-400' },
  refunded: { label: '返金済', color: 'bg-red-900/50 text-red-400' },
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [members, setMembers] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState('list')
  const { stores, isAdmin } = useStore()
  const [filters, setFilters] = useState({
    payment_type: '',
    status: '',
    store_id: '',
    from_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    store_id: '',
    payment_type: 'monthly_fee',
    amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'cash',
    status: 'completed',
    description: '',
  })

  // 担当店舗が1つの場合は自動選択
  useEffect(() => {
    if (!isAdmin && stores.length === 1 && !filters.store_id) {
      setFilters(prev => ({ ...prev, store_id: stores[0].id }))
    }
  }, [stores, isAdmin, filters.store_id])

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (filters.payment_type) params.set('payment_type', filters.payment_type)
      if (filters.status) params.set('status', filters.status)
      if (filters.store_id) params.set('store_id', filters.store_id)
      if (filters.from_date) params.set('from_date', filters.from_date)
      if (filters.to_date) params.set('to_date', filters.to_date)

      const res = await fetch(`/api/payments?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setPayments(data.payments || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members?limit=1000')
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members || [])
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    }
  }

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/payments/summary?year=${selectedYear}`)
      const data = await res.json()
      if (res.ok) {
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err)
    }
  }

  useEffect(() => {
    fetchPayments()
    fetchMembers()
  }, [page, filters.payment_type, filters.status, filters.store_id])

  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary()
    }
  }, [activeTab, selectedYear])

  const handleSearch = () => {
    setPage(1)
    fetchPayments()
  }

  const openCreateModal = () => {
    setIsEditing(false)
    // 担当店舗が1つの場合は自動選択
    const defaultStoreId = !isAdmin && stores.length === 1 ? stores[0].id : (filters.store_id || '')
    setFormData({
      member_id: '',
      store_id: defaultStoreId,
      payment_type: 'monthly_fee',
      amount: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
      status: 'completed',
      description: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (payment) => {
    setIsEditing(true)
    setSelectedPayment(payment)
    setFormData({
      member_id: payment.member_id || '',
      store_id: payment.store_id || '',
      payment_type: payment.payment_type,
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method || 'cash',
      status: payment.status,
      description: payment.description || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditing ? `/api/payments/${selectedPayment.id}` : '/api/payments'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseInt(formData.amount),
          member_id: formData.member_id || null,
          store_id: formData.store_id || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setIsModalOpen(false)
      fetchPayments()
      if (activeTab === 'summary') fetchSummary()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('この入金記録を削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchPayments()
      if (activeTab === 'summary') fetchSummary()
    } catch (err) {
      alert(err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7" />
            売上・決済管理
          </h1>
          <p className="text-gray-400 mt-1">入金状況の確認と管理</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          入金登録
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              入金一覧
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'summary'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              売上サマリー
            </button>
          </nav>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div className="bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400">フィルター:</span>
              </div>

              <select
                value={filters.payment_type}
                onChange={(e) => setFilters({ ...filters, payment_type: e.target.value })}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">すべての種別</option>
                <option value="monthly_fee">月謝</option>
                <option value="trial_fee">体験料</option>
                <option value="merchandise">物販</option>
                <option value="other">その他</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">すべてのステータス</option>
                <option value="pending">未入金</option>
                <option value="completed">入金済</option>
                <option value="refunded">返金済</option>
              </select>

              {/* 店舗フィルター */}
              {stores.length > 0 && (
                stores.length === 1 && !isAdmin ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-300">
                    <Store className="w-4 h-4" />
                    {stores[0].name}
                  </div>
                ) : (
                  <select
                    value={filters.store_id}
                    onChange={(e) => setFilters({ ...filters, store_id: e.target.value })}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {isAdmin && <option value="">すべての店舗</option>}
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                )
              )}

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                検索
              </button>

              <button
                onClick={fetchPayments}
                className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                更新
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                読み込み中...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                入金記録がありません
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          日付
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          会員
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          種別
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          金額
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          支払方法
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          ステータス
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              {format(new Date(payment.payment_date), 'yyyy/MM/dd', { locale: ja })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {payment.members ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-300">{payment.members.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${PAYMENT_TYPE_LABELS[payment.payment_type]?.color}`}>
                              {PAYMENT_TYPE_LABELS[payment.payment_type]?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-white">
                              {formatCurrency(payment.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-400">
                              {PAYMENT_METHOD_LABELS[payment.payment_method] || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${STATUS_LABELS[payment.status]?.color}`}>
                              {STATUS_LABELS[payment.status]?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(payment)}
                                className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {page} / {totalPages} ページ
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Year Selector */}
          <div className="bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">年度:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-900/50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">年間合計</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(summary.total)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-900/50 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">月謝</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(summary.byType.monthly_fee)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">体験料</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(summary.byType.trial_fee)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-900/50 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">物販</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(summary.byType.merchandise)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">その他</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(summary.byType.other)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h2 className="font-medium text-white">月別売上</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          月
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          月謝
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          体験料
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          物販
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          その他
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          合計
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {summary.byMonth.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                            データがありません
                          </td>
                        </tr>
                      ) : (
                        summary.byMonth.map((row) => (
                          <tr key={row.month} className="hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {row.month.replace('-', '年')}月
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                              {formatCurrency(row.monthly_fee)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                              {formatCurrency(row.trial_fee)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                              {formatCurrency(row.merchandise)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                              {formatCurrency(row.other)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-violet-400">
                              {formatCurrency(row.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditing ? '入金編集' : '入金登録'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  会員（任意）
                </label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">選択なし</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  店舗 <span className="text-red-400">*</span>
                </label>
                {stores.length === 1 && !isAdmin ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300">
                    <Store className="w-4 h-4" />
                    {stores[0].name}
                  </div>
                ) : (
                  <select
                    required
                    value={formData.store_id}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">店舗を選択</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  種別 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="monthly_fee">月謝</option>
                  <option value="trial_fee">体験料</option>
                  <option value="merchandise">物販</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  金額 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="例: 10000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  入金日 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  支払方法
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="cash">現金</option>
                  <option value="card">カード</option>
                  <option value="bank_transfer">銀行振込</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="completed">入金済</option>
                  <option value="pending">未入金</option>
                  <option value="refunded">返金済</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  備考
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
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
                  {isEditing ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
