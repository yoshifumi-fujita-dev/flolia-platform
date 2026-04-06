'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Calendar,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  User,
  Phone,
  Mail,
  Store,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

const STATUS_LABELS = {
  confirmed: { label: '確定', color: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'キャンセル', color: 'bg-red-500/20 text-red-400' },
  completed: { label: '完了', color: 'bg-gray-500/20 text-gray-400' },
}

const TYPE_LABELS = {
  trial: '体験',
  tour: '見学',
}

export default function AdminBookingsPage() {
  const { stores, isAdmin } = useStore()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    store_id: '',
  })
  const [selectedBooking, setSelectedBooking] = useState(null)

  // 担当店舗が1つの場合は自動選択
  useEffect(() => {
    if (!isAdmin && stores.length === 1 && !filters.store_id) {
      setFilters(prev => ({ ...prev, store_id: stores[0].id }))
    }
  }, [stores, isAdmin, filters.store_id])

  const fetchBookings = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '10')
      if (filters.status) params.set('status', filters.status)
      if (filters.type) params.set('type', filters.type)
      if (filters.store_id) params.set('store_id', filters.store_id)

      const res = await fetch(`/api/bookings?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '予約の取得に失敗しました')
      }

      setBookings(data.bookings || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [page, filters.status, filters.type, filters.store_id])

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        throw new Error('更新に失敗しました')
      }

      fetchBookings()
      setSelectedBooking(null)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-7 h-7" />
          予約管理
        </h1>
        <p className="text-gray-400 mt-1">体験・見学予約の確認と管理</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">フィルター:</span>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">すべてのステータス</option>
            <option value="confirmed">確定</option>
            <option value="cancelled">キャンセル</option>
            <option value="completed">完了</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">すべての種別</option>
            <option value="trial">体験</option>
            <option value="tour">見学</option>
          </select>

          {/* 店舗フィルター: 管理者は全店舗選択可、それ以外は担当店舗のみ */}
          {stores.length > 0 && (
            stores.length === 1 && !isAdmin ? (
              // 担当店舗が1つの場合は表示のみ
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-300">
                <Store className="w-4 h-4" />
                {stores[0].name}
              </div>
            ) : (
              <select
                value={filters.store_id}
                onChange={(e) => setFilters({ ...filters, store_id: e.target.value })}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {isAdmin && <option value="">すべての店舗</option>}
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            )
          )}

          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            読み込み中...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            予約がありません
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      店舗
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      お客様
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      種別
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
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-white">
                              {format(new Date(booking.booking_date), 'M月d日(E)', { locale: ja })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {booking.time_slots?.start_time?.slice(0, 5)} - {booking.time_slots?.end_time?.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-300">
                            {booking.stores?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{booking.name}</p>
                          <p className="text-xs text-gray-400">{booking.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-400">
                          {TYPE_LABELS[booking.booking_type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_LABELS[booking.status]?.color}`}>
                          {STATUS_LABELS[booking.status]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-violet-400 hover:text-violet-300 text-sm"
                        >
                          詳細
                        </button>
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

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelectedBooking(null)}
          />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">予約詳細</h2>

            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500">店舗</dt>
                  <dd className="text-white">{selectedBooking.stores?.name || '-'}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500">日時</dt>
                  <dd className="text-white">
                    {format(new Date(selectedBooking.booking_date), 'yyyy年M月d日(E)', { locale: ja })}
                    {' '}
                    {selectedBooking.time_slots?.start_time?.slice(0, 5)} - {selectedBooking.time_slots?.end_time?.slice(0, 5)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500">お名前</dt>
                  <dd className="text-white">{selectedBooking.name}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500">メールアドレス</dt>
                  <dd className="text-white">{selectedBooking.email}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500">電話番号</dt>
                  <dd className="text-white">{selectedBooking.phone}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500">種別</dt>
                  <dd className="text-white">{TYPE_LABELS[selectedBooking.booking_type]}</dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-3">ステータス変更</p>
              <div className="flex gap-2">
                {selectedBooking.status !== 'confirmed' && (
                  <button
                    onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                    className="flex-1 py-2 px-4 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                  >
                    確定
                  </button>
                )}
                {selectedBooking.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange(selectedBooking.id, 'completed')}
                    className="flex-1 py-2 px-4 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors text-sm"
                  >
                    完了
                  </button>
                )}
                {selectedBooking.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                    className="flex-1 py-2 px-4 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
