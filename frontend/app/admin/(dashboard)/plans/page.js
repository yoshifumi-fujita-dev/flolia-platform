'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  RefreshCw,
  X,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Tag,
  Ticket,
  Calendar,
  Store,
} from 'lucide-react'

const BILLING_TYPE_LABELS = {
  monthly: { label: '月額', color: 'bg-violet-900/50 text-violet-400', icon: Calendar },
  one_time: { label: '単発', color: 'bg-blue-900/50 text-blue-400', icon: DollarSign },
  ticket: { label: '回数券', color: 'bg-green-900/50 text-green-400', icon: Ticket },
}

// LP表示用カテゴリ
const LP_CATEGORY_OPTIONS = [
  { value: '', label: '（LPに表示しない）' },
  { value: 'trial', label: '体験' },
  { value: 'monthly', label: '月会費' },
  { value: 'visitor', label: 'ビジター' },
  { value: 'option', label: 'オプション' },
]

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_type: 'monthly',
    ticket_count: '',
    stripe_price_id: '',
    is_active: true,
    sort_order: 0,
    store_id: '',
    // LP表示用フィールド
    lp_category: '',
    lp_note: '',
    name_en: '',
    lp_note_en: '',
    show_on_lp: true,
    lp_sort_order: 0,
  })

  const fetchPlans = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/plans?include_inactive=true')
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setPlans(data.plans || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores?include_inactive=true')
      const data = await res.json()
      if (res.ok) {
        setStores(data.stores || [])
      }
    } catch (err) {
      console.error('Failed to fetch stores:', err)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchStores()
  }, [])

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      name: '',
      description: '',
      price: '',
      billing_type: 'monthly',
      ticket_count: '',
      stripe_price_id: '',
      is_active: true,
      sort_order: plans.length,
      store_id: '',
      // LP表示用フィールド
      lp_category: '',
      lp_note: '',
      name_en: '',
      lp_note_en: '',
      show_on_lp: true,
      lp_sort_order: 0,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (plan) => {
    setIsEditing(true)
    setSelectedPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      billing_type: plan.billing_type,
      ticket_count: plan.ticket_count?.toString() || '',
      stripe_price_id: plan.stripe_price_id || '',
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      store_id: plan.store_id || '',
      // LP表示用フィールド
      lp_category: plan.lp_category || '',
      lp_note: plan.lp_note || '',
      name_en: plan.name_en || '',
      lp_note_en: plan.lp_note_en || '',
      show_on_lp: plan.show_on_lp ?? true,
      lp_sort_order: plan.lp_sort_order || 0,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditing ? `/api/plans/${selectedPlan.id}` : '/api/plans'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price),
          ticket_count: formData.ticket_count ? parseInt(formData.ticket_count) : null,
          store_id: formData.store_id || null,
          lp_category: formData.lp_category || null,
          lp_sort_order: formData.lp_sort_order || 0,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setIsModalOpen(false)
      fetchPlans()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('この料金プランを削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchPlans()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleToggleActive = async (plan) => {
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      })

      if (!res.ok) throw new Error('更新に失敗しました')
      fetchPlans()
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
            <Tag className="w-7 h-7" />
            料金プラン管理
          </h1>
          <p className="text-gray-400 mt-1">料金プランの設定と管理</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPlans}
            className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Plans List */}
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            読み込み中...
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            料金プランがありません
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {plans.map((plan) => {
              const BillingIcon = BILLING_TYPE_LABELS[plan.billing_type]?.icon || Tag
              return (
                <div key={plan.id} className={`p-4 hover:bg-gray-700/50 ${!plan.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${BILLING_TYPE_LABELS[plan.billing_type]?.color?.split(' ')[0] || 'bg-gray-700'}`}>
                        <BillingIcon className={`w-6 h-6 ${BILLING_TYPE_LABELS[plan.billing_type]?.color?.split(' ')[1] || 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{plan.name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${BILLING_TYPE_LABELS[plan.billing_type]?.color}`}>
                            {BILLING_TYPE_LABELS[plan.billing_type]?.label}
                          </span>
                          {!plan.is_active && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-400">
                              非公開
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-white mt-1">
                          {formatCurrency(plan.price)}
                          {plan.billing_type === 'monthly' && <span className="text-sm font-normal text-gray-400">/月</span>}
                          {plan.billing_type === 'ticket' && <span className="text-sm font-normal text-gray-400">/{plan.ticket_count}回</span>}
                        </p>
                        {plan.description && (
                          <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                        )}
                        {plan.stores && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {plan.stores.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          plan.is_active
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                        }`}
                      >
                        {plan.is_active ? '非公開にする' : '公開する'}
                      </button>
                      <button
                        onClick={() => openEditModal(plan)}
                        className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditing ? '料金プラン編集' : '新規料金プラン'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  プラン名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 月額会員"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="例: 月々のお支払いで通い放題"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    料金 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="11000"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    課金タイプ <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.billing_type}
                    onChange={(e) => setFormData({ ...formData, billing_type: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="monthly">月額</option>
                    <option value="one_time">単発</option>
                    <option value="ticket">回数券</option>
                  </select>
                </div>
              </div>

              {formData.billing_type === 'ticket' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    回数 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.ticket_count}
                    onChange={(e) => setFormData({ ...formData, ticket_count: e.target.value })}
                    placeholder="10"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  対象店舗
                </label>
                <select
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">全店舗共通</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Stripe Price ID
                </label>
                <input
                  type="text"
                  value={formData.stripe_price_id}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                  placeholder="price_xxxxx"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 mt-1">Stripeで作成したPrice IDを入力（任意）</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    表示順序
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="flex items-center pt-7">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-300">公開する</span>
                  </label>
                </div>
              </div>

              {/* LP表示用設定 */}
              <div className="border-t border-gray-600 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">LP表示設定</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      LPカテゴリ
                    </label>
                    <select
                      value={formData.lp_category}
                      onChange={(e) => setFormData({ ...formData, lp_category: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {LP_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      LP表示順
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.lp_sort_order}
                      onChange={(e) => setFormData({ ...formData, lp_sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    LP注釈（日本語）
                  </label>
                  <input
                    type="text"
                    value={formData.lp_note}
                    onChange={(e) => setFormData({ ...formData, lp_note: e.target.value })}
                    placeholder="例: 月4回まで、初回限定・要予約"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      英語名
                    </label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="例: Regular Member"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      LP注釈（英語）
                    </label>
                    <input
                      type="text"
                      value={formData.lp_note_en}
                      onChange={(e) => setFormData({ ...formData, lp_note_en: e.target.value })}
                      placeholder="例: Up to 4 times/month"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_on_lp}
                      onChange={(e) => setFormData({ ...formData, show_on_lp: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-300">LPに表示する</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">カテゴリを選択している場合のみLPに表示されます</p>
                </div>
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
                  {isEditing ? '更新' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
