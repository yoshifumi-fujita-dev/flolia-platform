'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  RefreshCw,
  X,
  Plus,
  Edit,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Building2,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

export default function AdminFacilitiesPage() {
  const { allStores } = useStore()

  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStoreId, setFilterStoreId] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    store_id: '',
    display_order: 0,
  })
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  // 店舗一覧から最初の店舗を自動選択
  useEffect(() => {
    if (allStores && allStores.length > 0 && !filterStoreId) {
      setFilterStoreId(allStores[0].id)
    }
  }, [allStores])

  const fetchFacilities = async () => {
    setLoading(true)
    setError(null)

    try {
      let url = '/api/facilities?include_inactive=true'
      if (filterStoreId) {
        url += `&store_id=${filterStoreId}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setFacilities(data.facilities || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // filterStoreIdが設定されている場合のみ取得
    if (filterStoreId) {
      fetchFacilities()
    }
  }, [filterStoreId])

  const openCreateModal = () => {
    setIsEditing(false)
    // filterStoreIdが空の場合は最初の店舗を使用
    const defaultStoreId = filterStoreId || allStores?.[0]?.id || ''
    setFormData({
      name: '',
      description: '',
      image_url: '',
      store_id: defaultStoreId,
      display_order: facilities.length,
    })
    setImagePreview(null)
    setIsModalOpen(true)
  }

  const openEditModal = (facility) => {
    setIsEditing(true)
    setSelectedFacility(facility)
    setFormData({
      name: facility.name,
      description: facility.description || '',
      image_url: facility.image_url || '',
      store_id: facility.store_id,
      display_order: facility.display_order || 0,
    })
    setImagePreview(facility.image_url || null)
    setIsModalOpen(true)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    setImageUploading(true)
    try {
      const store = (allStores || []).find(s => s.id === formData.store_id)
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('store_slug', store?.site_slug || '')
      uploadFormData.append('facility_id', isEditing ? selectedFacility.id : 'new')

      const res = await fetch('/api/upload/facility-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setFormData(prev => ({ ...prev, image_url: data.url }))
    } catch (err) {
      alert('画像のアップロードに失敗しました: ' + err.message)
      setImagePreview(formData.image_url || null)
    } finally {
      setImageUploading(false)
    }
  }

  const handleImageRemove = () => {
    setFormData(prev => ({ ...prev, image_url: '' }))
    setImagePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditing ? `/api/facilities/${selectedFacility.id}` : '/api/facilities'
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

      // 新規登録時、登録した店舗と現在のフィルター店舗が異なる場合は
      // フィルターを登録した店舗に切り替える（これにより自動的にfetchFacilitiesが呼ばれる）
      if (!isEditing && formData.store_id && formData.store_id !== filterStoreId) {
        setFilterStoreId(formData.store_id)
      } else {
        fetchFacilities()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('この設備を削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/facilities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchFacilities()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleToggleActive = async (facility) => {
    try {
      const res = await fetch(`/api/facilities/${facility.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...facility,
          is_active: !facility.is_active,
        }),
      })

      if (!res.ok) throw new Error('更新に失敗しました')
      fetchFacilities()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-7 h-7" />
          設備管理
        </h1>
        <p className="text-gray-400 mt-1">スタジオの設備情報を管理します</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-medium text-white">設備一覧</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* 店舗フィルター */}
            <select
              value={filterStoreId}
              onChange={(e) => setFilterStoreId(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">店舗を選択</option>
              {(allStores || []).map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <button
              onClick={fetchFacilities}
              className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              更新
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              設備追加
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">
            読み込み中...
          </div>
        ) : facilities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            設備が登録されていません
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                className={`bg-gray-700/50 rounded-lg overflow-hidden border ${
                  facility.is_active ? 'border-gray-600' : 'border-gray-700 opacity-60'
                }`}
              >
                {/* Image */}
                <div className="aspect-video bg-gray-800 relative">
                  {facility.image_url ? (
                    <Image
                      src={facility.image_url}
                      alt={facility.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  {!facility.is_active && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-gray-900/80 text-gray-400 text-xs rounded">
                      非公開
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white">{facility.name}</h3>
                      {facility.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {facility.description}
                        </p>
                      )}
                      {facility.stores && (
                        <p className="text-xs text-violet-400 mt-2">
                          {facility.stores.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(facility)}
                        className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(facility.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Toggle Active */}
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-400">公開設定</span>
                      <div
                        onClick={() => handleToggleActive(facility)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          facility.is_active ? 'bg-violet-600' : 'bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            facility.is_active ? 'left-6' : 'left-1'
                          }`}
                        />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditing ? '設備編集' : '新規設備登録'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Store Selection */}
              {(allStores || []).length > 0 && (
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
                    {(allStores || []).map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  設備名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: シャワールーム"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="例: 清潔なシャワールームを完備。アメニティも充実しています。"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  設備画像
                </label>
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="aspect-video bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-gray-500 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">画像をアップロード</p>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 border border-dashed border-gray-500 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
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
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, WebP（最大10MB）
                  </p>
                </div>
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  表示順序
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  数字が小さいほど先に表示されます
                </p>
              </div>

              {/* Submit */}
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
