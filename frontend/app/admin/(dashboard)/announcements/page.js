'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Bell,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Edit,
  Trash2,
  Send,
  Mail,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  FileText,
  Globe,
  Eye,
  Store,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

const TARGET_GROUP_LABELS = {
  all: { label: '全会員', color: 'bg-violet-900/50 text-violet-400' },
  monthly: { label: '月会費会員', color: 'bg-blue-900/50 text-blue-400' },
  trial: { label: '体験会員', color: 'bg-green-900/50 text-green-400' },
  visitor: { label: 'ビジター', color: 'bg-orange-900/50 text-orange-400' },
}

const DELIVERY_METHOD_LABELS = {
  none: { label: 'Webサイトのみ', icon: Globe },
  email: { label: 'メール', icon: Mail },
  line: { label: 'LINE', icon: MessageSquare },
  both: { label: 'メール + LINE', icon: Send },
}

const STATUS_LABELS = {
  draft: { label: '下書き', color: 'bg-gray-700 text-gray-400' },
  sent: { label: '配信済', color: 'bg-green-900/50 text-green-400' },
}

export default function AdminAnnouncementsPage() {
  const { selectedStoreId, allStores } = useStore()

  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    store_id: '',
  })
  const [sending, setSending] = useState(false)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_group: 'all',
    delivery_method: 'none',
    is_public: false,
    store_id: '',
  })

  // Preview modal
  const [previewAnnouncement, setPreviewAnnouncement] = useState(null)

  const fetchAnnouncements = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (filters.status) params.set('status', filters.status)
      if (filters.store_id) params.set('store_id', filters.store_id)

      const res = await fetch(`/api/announcements?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setAnnouncements(data.announcements || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [page, filters.status, filters.store_id])

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      title: '',
      content: '',
      target_group: 'all',
      delivery_method: 'none',
      is_public: false,
      store_id: selectedStoreId || '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (announcement) => {
    if (announcement.status === 'sent') {
      alert('配信済みのお知らせは編集できません')
      return
    }
    setIsEditing(true)
    setSelectedAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_group: announcement.target_group,
      delivery_method: announcement.delivery_method,
      is_public: announcement.is_public || false,
      store_id: announcement.store_id || '',
    })
    setIsModalOpen(true)
  }

  // 店舗名を取得するヘルパー
  const getStoreName = (storeId) => {
    if (!storeId) return '全店舗'
    const store = (allStores || []).find((s) => s.id === storeId)
    return store?.name || '不明な店舗'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditing ? `/api/announcements/${selectedAnnouncement.id}` : '/api/announcements'
      const method = isEditing ? 'PUT' : 'POST'

      // store_idが空文字の場合はnullに変換（全店舗向け）
      const submitData = {
        ...formData,
        store_id: formData.store_id || null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setIsModalOpen(false)
      fetchAnnouncements()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('このお知らせを削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchAnnouncements()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSend = async (announcement) => {
    if (announcement.status === 'sent') {
      alert('このお知らせは既に配信済みです')
      return
    }

    const targetLabel = TARGET_GROUP_LABELS[announcement.target_group]?.label
    if (!confirm(`「${announcement.title}」を${targetLabel}に配信しますか？\n\n配信後は取り消しできません。`)) {
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/announcements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement_id: announcement.id }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      alert(data.message)
      fetchAnnouncements()
    } catch (err) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-7 h-7" />
            お知らせ配信
          </h1>
          <p className="text-gray-400 mt-1">会員へのお知らせ作成と配信</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規作成
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400">フィルター:</span>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">すべてのステータス</option>
            <option value="draft">下書き</option>
            <option value="sent">配信済</option>
          </select>

          <select
            value={filters.store_id}
            onChange={(e) => setFilters({ ...filters, store_id: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">すべての店舗</option>
            {(allStores || []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchAnnouncements}
            className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Announcements List */}
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            読み込み中...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            お知らせがありません
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-700">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        announcement.status === 'sent' ? 'bg-green-900/50' : 'bg-gray-700'
                      }`}>
                        {announcement.status === 'sent' ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-white">{announcement.title}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_LABELS[announcement.status]?.color}`}>
                            {STATUS_LABELS[announcement.status]?.label}
                          </span>
                          {announcement.is_public && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-900/50 text-emerald-400 flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Web公開中
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{announcement.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {getStoreName(announcement.store_id)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {TARGET_GROUP_LABELS[announcement.target_group]?.label}
                          </span>
                          <span className="flex items-center gap-1">
                            {announcement.delivery_method === 'none' ? (
                              <Globe className="w-3 h-3" />
                            ) : announcement.delivery_method === 'email' ? (
                              <Mail className="w-3 h-3" />
                            ) : announcement.delivery_method === 'line' ? (
                              <MessageSquare className="w-3 h-3" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            {DELIVERY_METHOD_LABELS[announcement.delivery_method]?.label || 'Webサイトのみ'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {announcement.sent_at
                              ? `配信: ${format(new Date(announcement.sent_at), 'yyyy/MM/dd HH:mm', { locale: ja })}`
                              : `作成: ${format(new Date(announcement.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {announcement.status === 'draft' && (
                        <>
                          {announcement.delivery_method !== 'none' && (
                            <button
                              onClick={() => handleSend(announcement)}
                              disabled={sending}
                              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                              配信
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(announcement)}
                            className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setPreviewAnnouncement(announcement)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="プレビュー"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditing ? 'お知らせ編集' : '新規お知らせ作成'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  タイトル <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例: 年末年始休業のお知らせ"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  本文 <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  placeholder="お知らせの内容を入力してください..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* 対象店舗 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  対象店舗
                </label>
                <select
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">全店舗</option>
                  {(allStores || []).map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  店舗を選択すると、その店舗の会員のみに配信されます
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    配信対象
                  </label>
                  <select
                    value={formData.target_group}
                    onChange={(e) => setFormData({ ...formData, target_group: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="all">全会員</option>
                    <option value="monthly">月会費会員</option>
                    <option value="trial">体験会員</option>
                    <option value="visitor">ビジター</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    配信方法
                  </label>
                  <select
                    value={formData.delivery_method}
                    onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="none">配信しない（Webサイトのみ）</option>
                    <option value="line">LINE</option>
                    <option value="email">メール</option>
                    <option value="both">メール + LINE</option>
                  </select>
                </div>
              </div>

              {/* Webサイト公開設定 */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-gray-500 text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-800 bg-gray-600"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      Webサイトに公開する
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      チェックを入れると、トップページのお知らせ欄に表示されます
                    </p>
                  </div>
                </label>
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
                  {isEditing ? '更新' : '下書き保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setPreviewAnnouncement(null)}
          />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
            <button
              onClick={() => setPreviewAnnouncement(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full z-10 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Email Preview */}
            <div className="overflow-y-auto max-h-[90vh]">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5 text-center">
                <h1 className="text-white text-2xl font-serif">FLOLIA</h1>
                <p className="text-white/80 text-sm">Kickboxing Studio</p>
              </div>
              <div className="p-8 bg-white">
                <h2 className="text-xl font-medium text-gray-900 mb-4">
                  {previewAnnouncement.title}
                </h2>
                <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {previewAnnouncement.content}
                </div>
              </div>
              <div className="bg-gray-100 px-8 py-4 text-center text-gray-500 text-sm">
                <p>このメールはFLOLIAからの自動配信です。</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
