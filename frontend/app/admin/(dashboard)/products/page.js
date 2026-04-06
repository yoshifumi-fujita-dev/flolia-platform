'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Store,
  Tag,
  DollarSign,
  Image as ImageIcon,
  AlertCircle,
  CreditCard,
  User,
  Loader2,
  CheckCircle,
  Receipt,
  FolderOpen,
  GripVertical,
  ShoppingBag,
  Sparkles,
  Upload,
  Warehouse,
  PackagePlus,
  TrendingDown,
  Calendar,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

// デフォルトカテゴリ（APIから取得できない場合のフォールバック）
const DEFAULT_CATEGORIES = [
  { slug: 'drink', name: 'ドリンク' },
  { slug: 'protein', name: 'プロテイン' },
  { slug: 'supplement', name: 'サプリメント' },
  { slug: 'rental', name: 'レンタル' },
  { slug: 'goods', name: 'グッズ' },
  { slug: 'other', name: 'その他' },
]

// カテゴリ色設定
const CATEGORY_COLORS = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  purple: 'bg-purple-600',
  yellow: 'bg-yellow-600',
  pink: 'bg-pink-600',
  gray: 'bg-gray-600',
  red: 'bg-red-600',
  indigo: 'bg-indigo-600',
  orange: 'bg-orange-600',
  teal: 'bg-teal-600',
}

export default function ProductsManagementPage() {
  const { selectedStoreId, allStores } = useStore()
  const [activeTab, setActiveTab] = useState('products')

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [formData, setFormData] = useState({
    store_id: '',
    instructor_id: '',
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    is_active: true,
    sort_order: 0,
  })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Image upload
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: 'gray',
    is_active: true,
    sort_order: 0,
  })
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null)

  // Fetch categories
  const fetchCategories = async () => {
    setCategoriesLoading(true)
    try {
      const res = await fetch('/api/product-categories?include_inactive=true')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      } else {
        setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c, id: c.slug })))
      }
    } catch {
      setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c, id: c.slug })))
    } finally {
      setCategoriesLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Fetch instructors
  const fetchInstructors = async () => {
    try {
      const res = await fetch('/api/instructors')
      const data = await res.json()
      if (res.ok) {
        setInstructors(data.instructors || [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchInstructors()
  }, [])

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        include_inactive: showInactive.toString(),
      })

      if (selectedStoreId) params.set('store_id', selectedStoreId)
      if (categoryFilter) params.set('category', categoryFilter)

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      let filtered = data.products || []

      // 検索フィルター
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        )
      }

      setProducts(filtered)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [selectedStoreId, categoryFilter, showInactive])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      store_id: selectedStoreId || '',
      instructor_id: '',
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      is_active: true,
      sort_order: 0,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (product) => {
    setIsEditing(true)
    setSelectedProduct(product)
    setFormData({
      store_id: product.store_id || '',
      instructor_id: product.instructor_id || '',
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      category: product.category || '',
      image_url: product.image_url || '',
      is_active: product.is_active !== false,
      sort_order: product.sort_order || 0,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = isEditing ? `/api/products/${selectedProduct.id}` : '/api/products'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setIsModalOpen(false)
      fetchProducts()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setDeleteTarget(null)
      fetchProducts()
    } catch (err) {
      alert(err.message)
    }
  }

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()
      if (res.ok) {
        setFormData({ ...formData, image_url: data.url })
      } else {
        setError(data.error || '画像のアップロードに失敗しました')
      }
    } catch (err) {
      setError('画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  // 未決済関連の状態
  const [unsettledData, setUnsettledData] = useState({ memberSummary: [], totalCount: 0, totalAmount: 0 })
  const [unsettledLoading, setUnsettledLoading] = useState(false)
  const [settlementMonth, setSettlementMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [settlingMemberId, setSettlingMemberId] = useState(null)
  const [unsettledStoreId, setUnsettledStoreId] = useState('') // 未決済タブ用店舗選択

  // 在庫管理関連の状態
  const [inventorySummary, setInventorySummary] = useState({ inventory: [], summary: {} })
  const [inventoryReceipts, setInventoryReceipts] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryStoreId, setInventoryStoreId] = useState('') // 在庫管理タブ用店舗選択
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isEditingReceipt, setIsEditingReceipt] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptFormData, setReceiptFormData] = useState({
    product_id: '',
    received_date: format(new Date(), 'yyyy-MM-dd'),
    quantity: '',
    purchase_price: '',
    supplier_name: '',
    invoice_number: '',
    notes: '',
  })
  const [deleteReceiptTarget, setDeleteReceiptTarget] = useState(null)

  // 未決済一覧を取得
  const fetchUnsettled = async () => {
    setUnsettledLoading(true)
    try {
      const params = new URLSearchParams()
      if (unsettledStoreId) params.set('store_id', unsettledStoreId)
      if (settlementMonth) params.set('settlement_month', settlementMonth)

      const res = await fetch(`/api/products/settlement?${params}`)
      const data = await res.json()

      if (res.ok) {
        setUnsettledData(data)
      }
    } catch (err) {
      console.error('Failed to fetch unsettled:', err)
    } finally {
      setUnsettledLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'unsettled') {
      fetchUnsettled()
    }
  }, [activeTab, unsettledStoreId, settlementMonth])

  // 在庫サマリーを取得
  const fetchInventorySummary = async () => {
    if (!inventoryStoreId) return
    setInventoryLoading(true)
    try {
      const res = await fetch(`/api/inventory/summary?store_id=${inventoryStoreId}`)
      const data = await res.json()
      if (res.ok) {
        setInventorySummary(data)
      }
    } catch (err) {
      console.error('Failed to fetch inventory summary:', err)
    } finally {
      setInventoryLoading(false)
    }
  }

  // 入荷履歴を取得
  const fetchInventoryReceipts = async () => {
    if (!inventoryStoreId) return
    try {
      const res = await fetch(`/api/inventory?store_id=${inventoryStoreId}&limit=50`)
      const data = await res.json()
      if (res.ok) {
        setInventoryReceipts(data.receipts || [])
      }
    } catch (err) {
      console.error('Failed to fetch inventory receipts:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'inventory' && inventoryStoreId) {
      fetchInventorySummary()
      fetchInventoryReceipts()
    }
  }, [activeTab, inventoryStoreId])

  // 入荷登録モーダルを開く
  const openReceiptModal = (product = null) => {
    setIsEditingReceipt(false)
    setSelectedReceipt(null)
    setReceiptFormData({
      product_id: product?.product_id || '',
      received_date: format(new Date(), 'yyyy-MM-dd'),
      quantity: '',
      purchase_price: '',
      supplier_name: '',
      invoice_number: '',
      notes: '',
    })
    setIsReceiptModalOpen(true)
  }

  // 入荷編集モーダルを開く
  const openEditReceiptModal = (receipt) => {
    setIsEditingReceipt(true)
    setSelectedReceipt(receipt)
    setReceiptFormData({
      product_id: receipt.product_id || '',
      received_date: receipt.received_date || '',
      quantity: receipt.quantity?.toString() || '',
      purchase_price: receipt.purchase_price?.toString() || '',
      supplier_name: receipt.supplier_name || '',
      invoice_number: receipt.invoice_number || '',
      notes: receipt.notes || '',
    })
    setIsReceiptModalOpen(true)
  }

  // 入荷登録・更新
  const handleReceiptSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = isEditingReceipt ? `/api/inventory/${selectedReceipt.id}` : '/api/inventory'
      const method = isEditingReceipt ? 'PUT' : 'POST'

      const payload = {
        ...receiptFormData,
        store_id: inventoryStoreId,
        quantity: parseInt(receiptFormData.quantity),
        purchase_price: receiptFormData.purchase_price ? parseInt(receiptFormData.purchase_price) : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setIsReceiptModalOpen(false)
      fetchInventorySummary()
      fetchInventoryReceipts()
    } catch (err) {
      alert(err.message)
    }
  }

  // 入荷削除
  const handleDeleteReceipt = async () => {
    if (!deleteReceiptTarget) return

    try {
      const res = await fetch(`/api/inventory/${deleteReceiptTarget.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setDeleteReceiptTarget(null)
      fetchInventorySummary()
      fetchInventoryReceipts()
    } catch (err) {
      alert(err.message)
    }
  }

  // 手動決済
  const handleSettle = async (memberId, memberName) => {
    if (!confirm(`${memberName}様の未決済分をまとめて決済しますか？`)) return

    setSettlingMemberId(memberId)
    try {
      const res = await fetch('/api/products/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          settlement_month: settlementMonth,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      alert(`決済完了: ¥${data.settlement.total_amount.toLocaleString()}`)
      fetchUnsettled()
    } catch (err) {
      alert('決済エラー: ' + err.message)
    } finally {
      setSettlingMemberId(null)
    }
  }

  const getCategoryLabel = (categorySlug) => {
    const cat = categories.find(c => c.slug === categorySlug)
    return cat?.name || categorySlug || '-'
  }

  // Category modal functions
  const openCreateCategoryModal = () => {
    setIsEditingCategory(false)
    setCategoryFormData({
      name: '',
      slug: '',
      description: '',
      color: 'gray',
      is_active: true,
      sort_order: 0,
    })
    setIsCategoryModalOpen(true)
  }

  const openEditCategoryModal = (category) => {
    setIsEditingCategory(true)
    setSelectedCategory(category)
    setCategoryFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      color: category.color || 'gray',
      is_active: category.is_active !== false,
      sort_order: category.sort_order || 0,
    })
    setIsCategoryModalOpen(true)
  }

  const handleCategorySubmit = async (e) => {
    e.preventDefault()

    try {
      const url = isEditingCategory ? `/api/product-categories/${selectedCategory.id}` : '/api/product-categories'
      const method = isEditingCategory ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setIsCategoryModalOpen(false)
      fetchCategories()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return

    try {
      const res = await fetch(`/api/product-categories/${deleteCategoryTarget.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setDeleteCategoryTarget(null)
      fetchCategories()
    } catch (err) {
      alert(err.message)
    }
  }

  const getStoreName = (storeId) => {
    if (!storeId) return '全店舗共通'
    return allStores?.find(s => s.id === storeId)?.name || storeId
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7" />
            商品管理
          </h1>
          <p className="text-gray-400 mt-1">物販商品の登録・管理</p>
        </div>
        {activeTab === 'products' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            商品登録
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Package className="w-4 h-4" />
              商品一覧
            </button>
            <button
              onClick={() => setActiveTab('unsettled')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'unsettled'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Receipt className="w-4 h-4" />
              未決済一覧
              {unsettledData.totalCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-orange-600 text-white rounded-full">
                  {unsettledData.totalCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'categories'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              カテゴリ管理
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'inventory'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Warehouse className="w-4 h-4" />
              在庫管理
            </button>
          </nav>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="商品名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">全カテゴリ</option>
            {categories.filter(c => c.is_active !== false).map(cat => (
              <option key={cat.slug} value={cat.slug}>{cat.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-500 text-violet-600 focus:ring-violet-500"
            />
            販売停止商品も表示
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            読み込み中...
          </div>
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            商品がありません
          </div>
        ) : (
          products.map(product => (
            <div
              key={product.id}
              className={`bg-gray-800 rounded-xl overflow-hidden ${
                !product.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Image */}
              <div className="relative w-full h-40 bg-gray-700">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-500" />
                  </div>
                )}
                {!product.is_active && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                    販売停止
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-white text-lg mb-1">{product.name}</h3>

                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Store className="w-4 h-4" />
                  {getStoreName(product.store_id)}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Tag className="w-4 h-4" />
                  {getCategoryLabel(product.category)}
                </div>

                {product.instructor && (
                  <div className="flex items-center gap-2 text-sm text-violet-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                    {product.instructor.name}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-bold text-violet-400">
                    ¥{product.price.toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    編集
                  </button>
                  <button
                    onClick={() => setDeleteTarget(product)}
                    className="px-3 py-2 bg-gray-700 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}

      {/* Unsettled Tab */}
      {activeTab === 'unsettled' && (
        <>
          {/* Filters */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-400" />
                  <select
                    value={unsettledStoreId}
                    onChange={(e) => setUnsettledStoreId(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">全店舗</option>
                    {allStores?.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400">対象月:</label>
                  <input
                    type="month"
                    value={settlementMonth}
                    onChange={(e) => setSettlementMonth(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  未決済: <span className="text-white font-bold">{unsettledData.totalCount}件</span>
                </div>
                <div className="text-sm text-gray-400">
                  合計: <span className="text-orange-400 font-bold">¥{unsettledData.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unsettled List */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            {unsettledLoading ? (
              <div className="p-8 text-center text-gray-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                読み込み中...
              </div>
            ) : unsettledData.memberSummary.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                未決済の購入はありません
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {unsettledData.memberSummary.map((item) => (
                  <div key={item.member?.id} className="p-4">
                    {/* Member Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-900/50 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{item.member?.name || '不明'}</p>
                          <p className="text-sm text-gray-400">{item.member?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">{item.purchases.length}件</p>
                          <p className="text-lg font-bold text-orange-400">¥{item.totalAmount.toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleSettle(item.member?.id, item.member?.name)}
                          disabled={settlingMemberId === item.member?.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {settlingMemberId === item.member?.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          決済
                        </button>
                      </div>
                    </div>

                    {/* Purchase Details */}
                    <div className="ml-13 bg-gray-700/30 rounded-lg p-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 text-left">
                            <th className="pb-2">日時</th>
                            <th className="pb-2">商品</th>
                            <th className="pb-2 text-center">数量</th>
                            <th className="pb-2 text-right">金額</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          {item.purchases.map((purchase) => (
                            <tr key={purchase.id}>
                              <td className="py-1">
                                {format(new Date(purchase.purchased_at), 'M/d HH:mm', { locale: ja })}
                              </td>
                              <td className="py-1">{purchase.product_name}</td>
                              <td className="py-1 text-center">{purchase.quantity}</td>
                              <td className="py-1 text-right">¥{purchase.total_amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <>
          {/* Header */}
          <div className="flex justify-end">
            <button
              onClick={openCreateCategoryModal}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              カテゴリ追加
            </button>
          </div>

          {/* Categories List */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            {categoriesLoading ? (
              <div className="p-8 text-center text-gray-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                読み込み中...
              </div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                カテゴリがありません
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-4 ${
                      !category.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <GripVertical className="w-5 h-5" />
                        <span className="text-sm w-8">{category.sort_order}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full ${CATEGORY_COLORS[category.color] || 'bg-gray-600'}`}
                      />
                      <div>
                        <p className="font-medium text-white">{category.name}</p>
                        <p className="text-sm text-gray-400">{category.slug}</p>
                      </div>
                      {!category.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
                          無効
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditCategoryModal(category)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteCategoryTarget(category)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
          {/* Store Selection */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-gray-400" />
                <select
                  value={inventoryStoreId}
                  onChange={(e) => setInventoryStoreId(e.target.value)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">店舗を選択してください</option>
                  {allStores?.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              {inventoryStoreId && (
                <button
                  onClick={() => openReceiptModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <PackagePlus className="w-5 h-5" />
                  入荷登録
                </button>
              )}
            </div>
          </div>

          {/* Store Selection Warning */}
          {!inventoryStoreId ? (
            <div className="bg-yellow-900/30 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              在庫管理を表示するには、上のドロップダウンから店舗を選択してください
            </div>
          ) : (
            <>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400">商品数</p>
                  <p className="text-2xl font-bold text-white">{inventorySummary.summary?.total_products || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400">総在庫数</p>
                  <p className="text-2xl font-bold text-white">{inventorySummary.summary?.total_stock || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    在庫切れ
                  </p>
                  <p className="text-2xl font-bold text-red-400">{inventorySummary.summary?.out_of_stock_count || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400">在庫少（5以下）</p>
                  <p className="text-2xl font-bold text-orange-400">{inventorySummary.summary?.low_stock_count || 0}</p>
                </div>
              </div>

              {/* Inventory Summary Table */}
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    在庫状況
                  </h3>
                </div>
                {inventoryLoading ? (
                  <div className="p-8 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    読み込み中...
                  </div>
                ) : inventorySummary.inventory?.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                    在庫データがありません
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr className="text-left text-sm text-gray-400">
                          <th className="px-4 py-3">商品名</th>
                          <th className="px-4 py-3">カテゴリ</th>
                          <th className="px-4 py-3 text-right">現在庫</th>
                          <th className="px-4 py-3 text-right">入荷合計</th>
                          <th className="px-4 py-3 text-right">販売合計</th>
                          <th className="px-4 py-3 text-right">平均仕入価格</th>
                          <th className="px-4 py-3">最終入荷日</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {inventorySummary.inventory?.map((item) => (
                          <tr key={item.product_id} className="hover:bg-gray-700/30">
                            <td className="px-4 py-3 text-white font-medium">{item.product_name}</td>
                            <td className="px-4 py-3 text-gray-400">{getCategoryLabel(item.category)}</td>
                            <td className={`px-4 py-3 text-right font-bold ${
                              item.current_stock <= 0 ? 'text-red-400' :
                              item.current_stock <= 5 ? 'text-orange-400' : 'text-green-400'
                            }`}>
                              {item.current_stock}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300">{item.total_received}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{item.total_sold}</td>
                            <td className="px-4 py-3 text-right text-gray-300">
                              {item.avg_purchase_price ? `¥${Number(item.avg_purchase_price).toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              {item.last_received_date ? format(new Date(item.last_received_date), 'yyyy/MM/dd') : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => openReceiptModal(item)}
                                className="p-2 text-violet-400 hover:text-violet-300 hover:bg-violet-900/30 rounded-lg transition-colors"
                                title="入荷登録"
                              >
                                <PackagePlus className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Receipt History Table */}
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    入荷履歴
                  </h3>
                </div>
                {inventoryReceipts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                    入荷履歴がありません
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr className="text-left text-sm text-gray-400">
                          <th className="px-4 py-3">入荷日</th>
                          <th className="px-4 py-3">商品名</th>
                          <th className="px-4 py-3 text-right">数量</th>
                          <th className="px-4 py-3 text-right">仕入単価</th>
                          <th className="px-4 py-3 text-right">仕入合計</th>
                          <th className="px-4 py-3">仕入先</th>
                          <th className="px-4 py-3">担当者</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {inventoryReceipts.map((receipt) => (
                          <tr key={receipt.id} className="hover:bg-gray-700/30">
                            <td className="px-4 py-3 text-white">
                              {format(new Date(receipt.received_date), 'yyyy/MM/dd')}
                            </td>
                            <td className="px-4 py-3 text-gray-300">{receipt.product?.name || '-'}</td>
                            <td className="px-4 py-3 text-right text-white font-medium">{receipt.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-300">
                              {receipt.purchase_price ? `¥${receipt.purchase_price.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300">
                              {receipt.total_cost ? `¥${receipt.total_cost.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-400">{receipt.supplier_name || '-'}</td>
                            <td className="px-4 py-3 text-gray-400">{receipt.received_by?.name || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditReceiptModal(receipt)}
                                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteReceiptTarget(receipt)}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
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
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Receipt Create/Edit Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {isEditingReceipt ? '入荷記録編集' : '入荷登録'}
              </h2>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiptSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  商品 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={receiptFormData.product_id}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, product_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">選択してください</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    入荷日 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={receiptFormData.received_date}
                    onChange={(e) => setReceiptFormData({ ...receiptFormData, received_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    数量 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={receiptFormData.quantity}
                    onChange={(e) => setReceiptFormData({ ...receiptFormData, quantity: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  仕入れ単価（円）
                </label>
                <input
                  type="number"
                  min="0"
                  value={receiptFormData.purchase_price}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, purchase_price: e.target.value })}
                  placeholder="空欄可"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  仕入れ先
                </label>
                <input
                  type="text"
                  value={receiptFormData.supplier_name}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, supplier_name: e.target.value })}
                  placeholder="例: 株式会社○○"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  納品書番号
                </label>
                <input
                  type="text"
                  value={receiptFormData.invoice_number}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, invoice_number: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  メモ
                </label>
                <textarea
                  value={receiptFormData.notes}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  {isEditingReceipt ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Receipt Confirmation Modal */}
      {deleteReceiptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              入荷記録を削除しますか？
            </h3>
            <p className="text-gray-400 mb-6">
              {deleteReceiptTarget.product?.name}の入荷記録（{deleteReceiptTarget.quantity}個）を削除します。在庫数が変更されます。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteReceiptTarget(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteReceipt}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {isEditingCategory ? 'カテゴリ編集' : 'カテゴリ追加'}
              </h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  カテゴリ名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="例: ドリンク"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  スラッグ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.slug}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="例: drink"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 mt-1">英小文字、数字、ハイフンのみ</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    カラー
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(CATEGORY_COLORS).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryFormData({ ...categoryFormData, color })}
                        className={`w-8 h-8 rounded-full ${CATEGORY_COLORS[color]} ${
                          categoryFormData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    表示順
                  </label>
                  <input
                    type="number"
                    value={categoryFormData.sort_order}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryFormData.is_active}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-500 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-300">有効</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  {isEditingCategory ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteCategoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              カテゴリを削除しますか？
            </h3>
            <p className="text-gray-400 mb-6">
              「{deleteCategoryTarget.name}」を削除します。このカテゴリを使用している商品がある場合は削除できません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteCategoryTarget(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteCategory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? '商品編集' : '商品登録'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  商品名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    価格 <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">選択してください</option>
                    {categories.filter(c => c.is_active !== false).map(cat => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    店舗
                  </label>
                  <select
                    value={formData.store_id}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">全店舗共通</option>
                    {(allStores || []).map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      インストラクター商品
                    </span>
                  </label>
                  <select
                    value={formData.instructor_id}
                    onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">なし（ジム商品）</option>
                    {instructors.filter(i => i.is_active !== false).map(instructor => (
                      <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">売上がインストラクターの給与に加算されます</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  表示順
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  商品画像
                </label>
                <div className="flex items-start gap-4">
                  {formData.image_url ? (
                    <div className="relative">
                      <img
                        src={formData.image_url}
                        alt="商品画像"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          画像をアップロード
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">JPG、PNG、WebP（最大5MB）</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-500 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-300">販売中</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  {isEditing ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              商品を削除しますか？
            </h3>
            <p className="text-gray-400 mb-6">
              「{deleteTarget.name}」を削除します。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
