'use client'

import { useState, useEffect } from 'react'
import {
  Store,
  RefreshCw,
  X,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  Train,
  Map,
  Globe,
  Instagram,
  Eye,
  ExternalLink,
  Users,
} from 'lucide-react'

export default function AdminStoresPage() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStore, setSelectedStore] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    site_slug: '',
    postal_code: '',
    address: '',
    phone: '',
    email: '',
    business_hours: '',
    closed_days: '',
    description: '',
    nearest_station: '',
    access_info: '',
    google_map_url: '',
    google_map_embed: '',
    instagram_url: '',
    crowd_threshold_moderate: '',
    crowd_threshold_busy: '',
    is_active: true,
    test_mode: false,
  })
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)

  // 公開/非公開確認モーダル
  const [toggleActiveModal, setToggleActiveModal] = useState({ open: false, store: null })
  const [toggleTestModeModal, setToggleTestModeModal] = useState({ open: false, store: null })

  // 郵便番号から住所を自動補完
  const searchAddressByPostalCode = async (postalCode) => {
    // ハイフンを除去して数字のみに
    const cleanPostalCode = postalCode.replace(/-/g, '')

    // 7桁でない場合は検索しない
    if (cleanPostalCode.length !== 7) return

    setIsSearchingAddress(true)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`)
      const data = await res.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const address = `${result.address1}${result.address2}${result.address3}`
        setFormData(prev => ({ ...prev, address }))
      }
    } catch (err) {
      console.error('郵便番号検索エラー:', err)
    } finally {
      setIsSearchingAddress(false)
    }
  }

  // 郵便番号入力時のハンドラー
  const handlePostalCodeChange = (e) => {
    const value = e.target.value
    setFormData({ ...formData, postal_code: value })

    // ハイフンなしで7桁、またはハイフンありで8桁の場合に検索
    const cleanValue = value.replace(/-/g, '')
    if (cleanValue.length === 7) {
      searchAddressByPostalCode(value)
    }
  }

  const fetchStores = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stores?include_inactive=true')
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setStores(data.stores || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      name: '',
      code: '', // 空の場合は自動生成される
      site_slug: '',
      postal_code: '',
      address: '',
      phone: '',
      email: '',
      business_hours: '',
      closed_days: '',
      description: '',
      nearest_station: '',
      access_info: '',
      google_map_url: '',
      google_map_embed: '',
      instagram_url: '',
      crowd_threshold_moderate: '',
      crowd_threshold_busy: '',
      is_active: true,
      test_mode: false,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (store) => {
    setIsEditing(true)
    setSelectedStore(store)
    setFormData({
      name: store.name,
      code: store.code,
      site_slug: store.site_slug || '',
      postal_code: store.postal_code || '',
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
      business_hours: store.business_hours || '',
      closed_days: store.closed_days || '',
      description: store.description || '',
      nearest_station: store.nearest_station || '',
      access_info: store.access_info || '',
      google_map_url: store.google_map_url || '',
      google_map_embed: store.google_map_embed || '',
      instagram_url: store.instagram_url || '',
      crowd_threshold_moderate: store.crowd_threshold_moderate ?? '',
      crowd_threshold_busy: store.crowd_threshold_busy ?? '',
      is_active: store.is_active,
      test_mode: store.test_mode || false,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditing ? `/api/stores/${selectedStore.id}` : '/api/stores'
      const method = isEditing ? 'PUT' : 'POST'

      const submitData = {
        ...formData,
        crowd_threshold_moderate: formData.crowd_threshold_moderate === '' ? null : parseInt(formData.crowd_threshold_moderate, 10),
        crowd_threshold_busy: formData.crowd_threshold_busy === '' ? null : parseInt(formData.crowd_threshold_busy, 10),
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
      fetchStores()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('この店舗を削除してもよろしいですか？\n紐づいている会員がいる場合は削除できません。')) return

    try {
      const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '削除に失敗しました')
      }
      fetchStores()
    } catch (err) {
      alert(err.message)
    }
  }

  const openToggleActiveModal = (store) => {
    setToggleActiveModal({ open: true, store })
  }

  const handleToggleActive = async () => {
    const store = toggleActiveModal.store
    if (!store) return

    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !store.is_active }),
      })

      if (!res.ok) throw new Error('更新に失敗しました')
      setToggleActiveModal({ open: false, store: null })
      fetchStores()
    } catch (err) {
      alert(err.message)
    }
  }

  const openToggleTestModeModal = (store) => {
    setToggleTestModeModal({ open: true, store })
  }

  const handleToggleTestMode = async () => {
    const store = toggleTestModeModal.store
    if (!store) return

    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_mode: !store.test_mode }),
      })

      if (!res.ok) throw new Error('更新に失敗しました')
      setToggleTestModeModal({ open: false, store: null })
      fetchStores()
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
            <Store className="w-7 h-7" />
            店舗管理
          </h1>
          <p className="text-gray-400 mt-1">店舗マスタの設定と管理</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStores}
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

      {/* Stores List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            読み込み中...
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            店舗がありません
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className={`bg-gray-800 rounded-lg shadow-sm overflow-hidden ${!store.is_active ? 'opacity-50' : ''}`}>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-violet-900/50 rounded-lg flex items-center justify-center">
                      <Store className="w-7 h-7 text-violet-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-medium text-white">{store.name}</h3>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-400">
                          {store.code}
                        </span>
                        {store.site_slug && (
                          <a
                            href={`/stores/${store.site_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 text-xs rounded-full bg-violet-900/50 text-violet-400 hover:bg-violet-900/70 flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            /stores/{store.site_slug}
                          </a>
                        )}
                        {!store.is_active && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-400">
                            非公開
                          </span>
                        )}
                        {store.test_mode && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-900/50 text-amber-300">
                            テストモード
                          </span>
                        )}
                      </div>
                      {store.description && (
                        <p className="text-sm text-gray-400 mt-1">{store.description}</p>
                      )}
                      <div className="mt-3 space-y-1">
                        {store.address && (
                          <p className="text-sm text-gray-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            {store.postal_code && `〒${store.postal_code} `}{store.address}
                          </p>
                        )}
                        {store.phone && (
                          <p className="text-sm text-gray-300 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            {store.phone}
                          </p>
                        )}
                        {store.email && (
                          <p className="text-sm text-gray-300 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            {store.email}
                          </p>
                        )}
                        {store.business_hours && (
                          <p className="text-sm text-gray-300 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            {store.business_hours}
                          </p>
                        )}
                        {store.closed_days && (
                          <p className="text-sm text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            定休日: {store.closed_days}
                          </p>
                        )}
                        {store.nearest_station && (
                          <p className="text-sm text-gray-300 flex items-center gap-2">
                            <Train className="w-4 h-4 text-gray-500" />
                            {store.nearest_station}
                          </p>
                        )}
                        {store.google_map_url && (
                          <a
                            href={store.google_map_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-violet-400 flex items-center gap-2 hover:text-violet-300"
                          >
                            <Map className="w-4 h-4" />
                            Googleマップで見る
                          </a>
                        )}
                        {store.instagram_url && (
                          <a
                            href={store.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-pink-400 flex items-center gap-2 hover:text-pink-300"
                          >
                            <Instagram className="w-4 h-4" />
                            Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openToggleActiveModal(store)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        store.is_active
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                      }`}
                    >
                      {store.is_active ? '非公開にする' : '公開する'}
                    </button>
                    <button
                      onClick={() => openToggleTestModeModal(store)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        store.test_mode
                          ? 'bg-amber-900/50 text-amber-300 hover:bg-amber-900/70'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {store.test_mode ? 'テストモードOFF' : 'テストモードON'}
                    </button>
                    {store.site_slug && (
                      <a
                        href={`/stores/${store.site_slug}?preview=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        プレビュー
                      </a>
                    )}
                    <button
                      onClick={() => openEditModal(store)}
                      className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
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
              {isEditing ? '店舗編集' : '新規店舗'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    店舗名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: FLOLIA 本店"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    店舗コード
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={isEditing ? '' : '自動生成（例: 001）'}
                    disabled={isEditing}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {!isEditing && (
                    <p className="text-xs text-gray-400 mt-1">
                      空欄の場合は連番（001, 002...）で自動生成されます
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    サイトURL用スラッグ
                  </label>
                  <input
                    type="text"
                    value={formData.site_slug}
                    onChange={(e) => setFormData({ ...formData, site_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="例: shibuya"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  {formData.site_slug && (
                    <p className="text-xs text-gray-400 mt-1">
                      公開URL: <span className="text-violet-400">/stores/{formData.site_slug}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    郵便番号
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={handlePostalCodeChange}
                      placeholder="150-0001"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    {isSearchingAddress && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    住所 {isSearchingAddress && <span className="text-violet-400 text-xs ml-2">検索中...</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="東京都渋谷区〇〇1-2-3"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="03-1234-5678"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@example.com"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    営業時間
                  </label>
                  <input
                    type="text"
                    value={formData.business_hours}
                    onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                    placeholder="10:00-22:00"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    定休日
                  </label>
                  <input
                    type="text"
                    value={formData.closed_days}
                    onChange={(e) => setFormData({ ...formData, closed_days: e.target.value })}
                    placeholder="水曜日"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* アクセス情報セクション */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-medium text-violet-400 mb-4 flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  アクセス情報
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      最寄り駅
                    </label>
                    <input
                      type="text"
                      value={formData.nearest_station}
                      onChange={(e) => setFormData({ ...formData, nearest_station: e.target.value })}
                      placeholder="例: 渋谷駅 徒歩5分"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      アクセス詳細
                    </label>
                    <textarea
                      value={formData.access_info}
                      onChange={(e) => setFormData({ ...formData, access_info: e.target.value })}
                      rows={3}
                      placeholder="例: JR渋谷駅ハチ公口から徒歩5分&#10;東急東横線渋谷駅から徒歩3分"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      GoogleマップURL
                    </label>
                    <input
                      type="url"
                      value={formData.google_map_url}
                      onChange={(e) => setFormData({ ...formData, google_map_url: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <p>「Googleマップで見る」ボタンのリンク先になります</p>
                      <p>取得方法: Googleマップで店舗を検索 → アドレスバーのURLをコピー、または「共有」→「リンクをコピー」</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Googleマップ埋め込みコード（iframe）
                    </label>
                    <textarea
                      value={formData.google_map_embed}
                      onChange={(e) => setFormData({ ...formData, google_map_embed: e.target.value })}
                      rows={3}
                      placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>'
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
                    />
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <p>アクセスセクションに地図が埋め込まれます</p>
                      <p>取得方法: Googleマップで店舗を検索 →「共有」→「地図を埋め込む」→ HTMLをコピー</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SNS連携セクション */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-medium text-violet-400 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  SNS連携
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://www.instagram.com/flolia_tsujido/"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    店舗ページにInstagramの投稿が埋め込まれます
                  </p>
                </div>
              </div>

              {/* 混雑表示設定セクション */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-medium text-violet-400 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  混雑表示設定
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      「やや混雑」の閾値（人数）
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.crowd_threshold_moderate}
                      onChange={(e) => setFormData({ ...formData, crowd_threshold_moderate: e.target.value })}
                      placeholder="例: 8"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      「混雑」の閾値（人数）
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.crowd_threshold_busy}
                      onChange={(e) => setFormData({ ...formData, crowd_threshold_busy: e.target.value })}
                      placeholder="例: 15"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  両方設定すると、会員向け「現在の状況」ページに混雑レベルが表示されます。未設定の場合は在館人数のみ表示されます。
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-300">公開する</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  表示順序は店舗コード順（001, 002...）で自動的に決まります
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.test_mode}
                    onChange={(e) => setFormData({ ...formData, test_mode: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-sm text-gray-300">テストモード</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  ONの場合、LPは非公開のままでも非LP機能（入退館/在館表示など）で利用できます
                </p>
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

      {/* Toggle Active Confirmation Modal */}
      {toggleActiveModal.open && toggleActiveModal.store && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setToggleActiveModal({ open: false, store: null })}
          />
          <div className="relative bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">
              {toggleActiveModal.store.is_active ? '店舗を非公開にしますか？' : '店舗を公開しますか？'}
            </h3>
            <p className="text-gray-400 mb-6">
              <span className="font-medium text-white">{toggleActiveModal.store.name}</span> を
              {toggleActiveModal.store.is_active ? '非公開' : '公開'}にします。
              {toggleActiveModal.store.is_active && (
                <span className="block mt-2 text-sm text-yellow-400">
                  非公開にすると、公開サイトに表示されなくなります。
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setToggleActiveModal({ open: false, store: null })}
                className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleToggleActive}
                className={`flex-1 py-2 px-4 text-white rounded-lg transition-colors ${
                  toggleActiveModal.store.is_active
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {toggleActiveModal.store.is_active ? '非公開にする' : '公開する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Test Mode Confirmation Modal */}
      {toggleTestModeModal.open && toggleTestModeModal.store && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setToggleTestModeModal({ open: false, store: null })}
          />
          <div className="relative bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">
              {toggleTestModeModal.store.test_mode ? 'テストモードをOFFにしますか？' : 'テストモードをONにしますか？'}
            </h3>
            <p className="text-gray-400 mb-6">
              <span className="font-medium text-white">{toggleTestModeModal.store.name}</span> を
              {toggleTestModeModal.store.test_mode ? 'テストモードOFF' : 'テストモードON'}にします。
              {!toggleTestModeModal.store.test_mode && (
                <span className="block mt-2 text-sm text-amber-300">
                  ONの場合、LPは非公開のままでも非LP機能で利用できます。
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setToggleTestModeModal({ open: false, store: null })}
                className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleToggleTestMode}
                className={`flex-1 py-2 px-4 text-white rounded-lg transition-colors ${
                  toggleTestModeModal.store.test_mode
                    ? 'bg-gray-600 hover:bg-gray-500'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {toggleTestModeModal.store.test_mode ? 'OFFにする' : 'ONにする'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
