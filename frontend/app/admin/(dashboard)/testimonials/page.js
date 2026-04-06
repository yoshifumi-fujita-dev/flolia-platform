'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  X,
  Upload,
  User,
  Loader2,
  Store,
  Eye,
  EyeOff,
  Award,
  MessageSquareQuote,
} from 'lucide-react'

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 店舗関連
  const [stores, setStores] = useState([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [filterStoreId, setFilterStoreId] = useState('')

  // モーダル
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTestimonial, setSelectedTestimonial] = useState(null)
  const [formData, setFormData] = useState({
    store_id: '',
    customer_name: '',
    customer_age: '',
    customer_gender: '',
    customer_occupation: '',
    customer_image_url: '',
    trigger_reason: '',
    impression: '',
    message_to_prospects: '',
    membership_duration: '',
    is_featured: false,
    is_active: true,
    display_order: 0,
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 店舗一覧を取得
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores')
        const data = await res.json()
        if (res.ok) {
          const storesList = data.stores || []
          setStores(storesList)
          if (storesList.length > 0 && !filterStoreId) {
            setFilterStoreId(storesList[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setStoresLoading(false)
      }
    }
    fetchStores()
  }, [])

  // お客様の声一覧を取得
  const fetchTestimonials = useCallback(async () => {
    if (!filterStoreId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/testimonials?store_id=${filterStoreId}&include_inactive=true`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestimonials(data.testimonials || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filterStoreId])

  useEffect(() => {
    if (!storesLoading && filterStoreId) {
      fetchTestimonials()
    }
  }, [filterStoreId, storesLoading, fetchTestimonials])

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      store_id: filterStoreId,
      customer_name: '',
      customer_age: '',
      customer_gender: '',
      customer_occupation: '',
      customer_image_url: '',
      trigger_reason: '',
      impression: '',
      message_to_prospects: '',
      membership_duration: '',
      is_featured: false,
      is_active: true,
      display_order: testimonials.length,
    })
    setImagePreview(null)
    setIsModalOpen(true)
  }

  const openEditModal = (testimonial) => {
    setIsEditing(true)
    setSelectedTestimonial(testimonial)
    setFormData({
      store_id: testimonial.store_id,
      customer_name: testimonial.customer_name,
      customer_age: testimonial.customer_age || '',
      customer_gender: testimonial.customer_gender || '',
      customer_occupation: testimonial.customer_occupation || '',
      customer_image_url: testimonial.customer_image_url || '',
      trigger_reason: testimonial.trigger_reason || '',
      impression: testimonial.impression || '',
      message_to_prospects: testimonial.message_to_prospects || '',
      membership_duration: testimonial.membership_duration || '',
      is_featured: testimonial.is_featured,
      is_active: testimonial.is_active,
      display_order: testimonial.display_order,
    })
    setImagePreview(testimonial.customer_image_url || null)
    setIsModalOpen(true)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    setImageUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      // 店舗slugを取得して渡す
      const currentStore = stores.find(s => s.id === formData.store_id)
      if (currentStore?.site_slug) {
        uploadFormData.append('store_slug', currentStore.site_slug)
      }

      const res = await fetch('/api/upload/testimonial-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setFormData((prev) => ({ ...prev, customer_image_url: data.url }))
    } catch (err) {
      alert('画像のアップロードに失敗しました: ' + err.message)
      setImagePreview(formData.customer_image_url || null)
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return // 重複送信を防止

    setSubmitting(true)
    try {
      const url = isEditing ? `/api/testimonials/${selectedTestimonial.id}` : '/api/testimonials'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setIsModalOpen(false)
      fetchTestimonials()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('このお客様の声を削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/testimonials/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchTestimonials()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleActive = async (testimonial) => {
    try {
      const res = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !testimonial.is_active }),
      })
      if (!res.ok) throw new Error('更新に失敗しました')
      fetchTestimonials()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleFeatured = async (testimonial) => {
    try {
      const res = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !testimonial.is_featured }),
      })
      if (!res.ok) throw new Error('更新に失敗しました')
      fetchTestimonials()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquareQuote className="w-7 h-7" />
            お客様の声
          </h1>
          <p className="text-gray-400 mt-1">お客様からいただいた感想・口コミを管理</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTestimonials}
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
            追加
          </button>
        </div>
      </div>

      {/* 店舗フィルター */}
      <div className="mb-4 flex items-center gap-3">
        {storesLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>店舗読み込み中...</span>
          </div>
        ) : stores.length === 1 ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-300">
            <Store className="w-4 h-4" />
            {stores[0].name}
          </div>
        ) : stores.length > 1 && (
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-gray-400" />
            <select
              value={filterStoreId}
              onChange={(e) => setFilterStoreId(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
          読み込み中...
        </div>
      ) : testimonials.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
          お客様の声が登録されていません
        </div>
      ) : (
        <div className="grid gap-4">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className={`bg-gray-800 rounded-lg p-4 border ${
                testimonial.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* 画像 */}
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-700 overflow-hidden relative">
                  {testimonial.customer_image_url ? (
                    <Image
                      src={testimonial.customer_image_url}
                      alt={testimonial.customer_name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{testimonial.customer_name}</span>
                    {testimonial.customer_age && (
                      <span className="text-sm text-gray-400">({testimonial.customer_age})</span>
                    )}
                    {testimonial.is_featured && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        注目
                      </span>
                    )}
                    {!testimonial.is_active && (
                      <span className="px-2 py-0.5 bg-gray-600 text-gray-400 text-xs rounded-full">
                        非公開
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {testimonial.membership_duration && (
                      <span className="text-xs text-gray-500">
                        会員歴: {testimonial.membership_duration}
                      </span>
                    )}
                    {testimonial.customer_occupation && (
                      <span className="text-xs text-gray-500">
                        / {testimonial.customer_occupation}
                      </span>
                    )}
                  </div>

                  {testimonial.trigger_reason && (
                    <div className="mb-2">
                      <span className="text-xs text-violet-400">ご入会のきっかけ:</span>
                      <p className="text-gray-300 text-sm line-clamp-2">{testimonial.trigger_reason}</p>
                    </div>
                  )}

                  {testimonial.impression && (
                    <div className="mb-2">
                      <span className="text-xs text-violet-400">ご入会された感想:</span>
                      <p className="text-gray-300 text-sm line-clamp-2">{testimonial.impression}</p>
                    </div>
                  )}
                </div>

                {/* アクション */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleFeatured(testimonial)}
                    className={`p-2 rounded-lg transition-colors ${
                      testimonial.is_featured
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'hover:bg-gray-700 text-gray-400'
                    }`}
                    title={testimonial.is_featured ? '注目を解除' : '注目に設定'}
                  >
                    <Award className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(testimonial)}
                    className={`p-2 rounded-lg transition-colors ${
                      testimonial.is_active
                        ? 'hover:bg-gray-700 text-green-400'
                        : 'hover:bg-gray-700 text-gray-500'
                    }`}
                    title={testimonial.is_active ? '非公開にする' : '公開する'}
                  >
                    {testimonial.is_active ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(testimonial)}
                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-violet-400 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(testimonial.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditing ? 'お客様の声を編集' : 'お客様の声を追加'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 店舗選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  店舗 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">選択してください</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              {/* お客様画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  お客様の画像
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 border border-dashed border-gray-500 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                      {imageUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                          <span className="text-sm text-gray-300">アップロード中...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-violet-400" />
                          <span className="text-sm text-gray-300">画像を選択</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* お客様情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    お名前 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="例: Y.K様"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">年代</label>
                  <select
                    value={formData.customer_age}
                    onChange={(e) => setFormData({ ...formData, customer_age: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">選択してください</option>
                    <option value="10代">10代</option>
                    <option value="20代">20代</option>
                    <option value="30代">30代</option>
                    <option value="40代">40代</option>
                    <option value="50代">50代</option>
                    <option value="60代以上">60代以上</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">性別</label>
                  <select
                    value={formData.customer_gender}
                    onChange={(e) => setFormData({ ...formData, customer_gender: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">選択してください</option>
                    <option value="女性">女性</option>
                    <option value="男性">男性</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">職業</label>
                  <input
                    type="text"
                    value={formData.customer_occupation}
                    onChange={(e) => setFormData({ ...formData, customer_occupation: e.target.value })}
                    placeholder="例: 会社員"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">会員歴</label>
                <input
                  type="text"
                  value={formData.membership_duration}
                  onChange={(e) => setFormData({ ...formData, membership_duration: e.target.value })}
                  placeholder="例: 6ヶ月"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* ご入会のきっかけ */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ご入会のきっかけ
                </label>
                <textarea
                  rows={3}
                  value={formData.trigger_reason}
                  onChange={(e) => setFormData({ ...formData, trigger_reason: e.target.value })}
                  placeholder="ご入会のきっかけを入力"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* ご入会された感想 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ご入会された感想
                </label>
                <textarea
                  rows={3}
                  value={formData.impression}
                  onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
                  placeholder="ご入会された感想を入力"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* ご入会をご検討中の方へ */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ご入会をご検討中の方へ
                </label>
                <textarea
                  rows={3}
                  value={formData.message_to_prospects}
                  onChange={(e) => setFormData({ ...formData, message_to_prospects: e.target.value })}
                  placeholder="ご入会をご検討中の方へのメッセージを入力"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* オプション */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-500 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-300">公開する</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-500 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-300">注目として表示</span>
                </label>
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isEditing ? '更新中...' : '追加中...'}
                    </>
                  ) : (
                    isEditing ? '更新' : '追加'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
