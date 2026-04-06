'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Users,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  Store,
  Printer,
  Camera,
  MessageCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useStore } from '@/lib/contexts/StoreContext'

const MEMBERSHIP_LABELS = {
  trial: { label: '体験', color: 'bg-blue-500/20 text-blue-400' },
  monthly: { label: '月会費', color: 'bg-violet-500/20 text-violet-400' },
  visitor: { label: 'ビジター', color: 'bg-orange-500/20 text-orange-400' },
}

const STATUS_LABELS = {
  active: { label: 'アクティブ', color: 'bg-green-500/20 text-green-400' },
  trial: { label: '体験', color: 'bg-blue-500/20 text-blue-400' },
  visitor: { label: 'ビジター', color: 'bg-orange-500/20 text-orange-400' },
  paused: { label: '休会', color: 'bg-yellow-500/20 text-yellow-400' },
  canceled: { label: '退会', color: 'bg-red-500/20 text-red-400' },
  pending: { label: '手続中', color: 'bg-gray-500/20 text-gray-400' },
}

export default function AdminMembersPage() {
  const { stores, isAdmin } = useStore()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    membership_type: '',
    search: '',
    store_id: '',
  })
  const [selectedMember, setSelectedMember] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    membership_type: 'trial',
    status: 'active',
    joined_at: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    store_id: '',
  })

  // 担当店舗が1つの場合は自動選択
  useEffect(() => {
    if (!isAdmin && stores.length === 1 && !filters.store_id) {
      setFilters(prev => ({ ...prev, store_id: stores[0].id }))
    }
  }, [stores, isAdmin, filters.store_id])

  const fetchMembers = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '10')
      if (filters.status) params.set('status', filters.status)
      if (filters.membership_type) params.set('membership_type', filters.membership_type)
      if (filters.search) params.set('search', filters.search)
      if (filters.store_id) params.set('store_id', filters.store_id)

      const res = await fetch(`/api/members?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '会員情報の取得に失敗しました')
      }

      setMembers(data.members || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [page, filters.status, filters.membership_type, filters.store_id])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchMembers()
  }

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      name: '',
      email: '',
      phone: '',
      membership_type: 'trial',
      status: 'active',
      joined_at: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      store_id: stores[0]?.id || '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (member) => {
    setIsEditing(true)
    setSelectedMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      membership_type: member.membership_type,
      status: member.status,
      joined_at: member.joined_at,
      notes: member.notes || '',
      store_id: member.store_id || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = isEditing ? `/api/members/${selectedMember.id}` : '/api/members'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        throw new Error(errorMsg || '保存に失敗しました')
      }

      setIsModalOpen(false)
      fetchMembers()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('この会員を削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        throw new Error('削除に失敗しました')
      }

      fetchMembers()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7" />
            会員管理
          </h1>
          <p className="text-gray-400 mt-1">会員情報の確認と管理</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規登録
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="名前、メール、電話で検索"
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              検索
            </button>
          </form>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400">フィルター:</span>
          </div>

          <select
            value={filters.membership_type}
            onChange={(e) => setFilters({ ...filters, membership_type: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">すべての会員種別</option>
            <option value="trial">体験</option>
            <option value="monthly">月会費</option>
            <option value="visitor">ビジター</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="trial">体験</option>
            <option value="paused">休会</option>
            <option value="canceled">退会</option>
            <option value="pending">手続中</option>
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
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            )
          )}

          <button
            onClick={fetchMembers}
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

      {/* Members Table */}
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            読み込み中...
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            会員が登録されていません
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      会員番号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      会員情報
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      連絡先
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      連携
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      会員種別
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      入会日
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          href={`/backoffice/members/${member.id}`}
                          className="text-lg font-bold text-violet-400 hover:text-violet-300"
                        >
                          #{member.member_number || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/backoffice/members/${member.id}`} className="flex items-center gap-3 group">
                          {/* 会員写真またはデフォルトアイコン */}
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-violet-500/20 flex items-center justify-center">
                            {member.photo_url ? (
                              <Image
                                src={member.photo_url}
                                alt={member.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-violet-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-violet-300">{member.name}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="truncate max-w-[180px]">{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <Phone className="w-4 h-4 text-gray-500" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {/* 写真 */}
                          <div
                            className={`p-1.5 rounded ${member.photo_url ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-500'}`}
                            title={member.photo_url ? '写真あり' : '写真なし'}
                          >
                            <Camera className="w-4 h-4" />
                          </div>
                          {/* LINE連携 */}
                          <div
                            className={`p-1.5 rounded ${member.line_user_id ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-500'}`}
                            title={member.line_user_id ? 'LINE連携済み' : 'LINE未連携'}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${MEMBERSHIP_LABELS[member.membership_type]?.color}`}>
                          {MEMBERSHIP_LABELS[member.membership_type]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_LABELS[member.status]?.color}`}>
                          {STATUS_LABELS[member.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {format(new Date(member.joined_at), 'yyyy/MM/dd', { locale: ja })}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/api/member/card-pdf?member_id=${member.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title="会員証発行"
                          >
                            <Printer className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title="削除"
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

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditing ? '会員情報編集' : '新規会員登録'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  氏名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  メールアドレス <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  会員種別
                </label>
                <select
                  value={formData.membership_type}
                  onChange={(e) => setFormData({ ...formData, membership_type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="trial">体験</option>
                  <option value="monthly">月会費</option>
                  <option value="visitor">ビジター</option>
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
                  <option value="active">アクティブ</option>
                  <option value="trial">体験</option>
                  <option value="paused">休会</option>
                  <option value="canceled">退会</option>
                  <option value="pending">手続中</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  入会日 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.joined_at}
                  onChange={(e) => setFormData({ ...formData, joined_at: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  所属店舗
                </label>
                {stores.length === 1 && !isAdmin ? (
                  // 担当店舗が1つの場合は表示のみ
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300">
                    <Store className="w-4 h-4" />
                    {stores[0].name}
                  </div>
                ) : (
                  <select
                    value={formData.store_id}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {isAdmin && <option value="">未設定</option>}
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  備考
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
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
