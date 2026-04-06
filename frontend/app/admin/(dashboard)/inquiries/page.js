'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  MessageCircle,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Store,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const STATUS_LABELS = {
  open: { label: '未対応', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
  in_progress: { label: '対応中', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  resolved: { label: '解決済み', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  closed: { label: 'クローズ', color: 'bg-gray-500/20 text-gray-400', icon: X },
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    store_id: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [stores, setStores] = useState([])

  // 店舗一覧を取得
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores')
        const data = await res.json()
        if (res.ok && data.stores) {
          setStores(data.stores)
        }
      } catch (err) {
        console.error('Error fetching stores:', err)
      }
    }
    fetchStores()
  }, [])

  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (filters.status) params.set('status', filters.status)
      if (filters.store_id) params.set('store_id', filters.store_id)

      const res = await fetch(`/api/inquiries?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'お問い合わせの取得に失敗しました')
      }

      setInquiries(data.inquiries || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      console.error('Error fetching inquiries:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  // 10秒ごとに自動更新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInquiries()
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchInquiries])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const getUnreadCount = (inquiry) => {
    return inquiry.unread_count || 0
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">LINE お問い合わせ</h1>
            <p className="text-sm text-gray-400">LINEからのお問い合わせを管理</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={fetchInquiries}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>
      </div>

      {/* フィルター */}
      {showFilters && (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">ステータス</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-violet-500 focus:outline-none"
            >
              <option value="">すべて</option>
              <option value="open">未対応</option>
              <option value="in_progress">対応中</option>
              <option value="resolved">解決済み</option>
              <option value="closed">クローズ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">店舗</label>
            <select
              value={filters.store_id}
              onChange={(e) => handleFilterChange('store_id', e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-violet-500 focus:outline-none"
            >
              <option value="">すべての店舗</option>
              <option value="none">店舗未選択</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading && inquiries.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* お問い合わせ一覧 */}
          <div className="bg-gray-800/50 rounded-lg overflow-hidden">
            {inquiries.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>お問い合わせはありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {inquiries.map((inquiry) => {
                  const statusConfig = STATUS_LABELS[inquiry.status] || STATUS_LABELS.open
                  const StatusIcon = statusConfig.icon
                  const unreadCount = getUnreadCount(inquiry)

                  return (
                    <Link
                      key={inquiry.id}
                      href={`/admin/inquiries/${inquiry.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-700/50 transition"
                    >
                      {/* プロフィール画像 */}
                      <div className="relative">
                        {inquiry.profile_image_url ? (
                          <Image
                            src={inquiry.profile_image_url}
                            alt={inquiry.display_name || 'ユーザー'}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        {/* 未読バッジ */}
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white truncate">
                            {inquiry.display_name || '名前未設定'}
                          </span>
                          {inquiry.member && (
                            <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">
                              会員
                            </span>
                          )}
                          {inquiry.store ? (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                              <Store className="w-3 h-3" />
                              {inquiry.store.name}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">
                              店舗未選択
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          {inquiry.last_message?.content || 'メッセージなし'}
                        </p>
                      </div>

                      {/* メタ情報 */}
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {inquiry.last_message_at
                            ? format(new Date(inquiry.last_message_at), 'M/d HH:mm', { locale: ja })
                            : '-'
                          }
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <span className="text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
