'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { staff, loading: authLoading } = useAuth()

  const [allStores, setAllStores] = useState([])
  const [stores, setStores] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // 店舗一覧を取得（非公開店舗も含む）
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores?include_inactive=true')
        if (res.ok) {
          const data = await res.json()
          setAllStores(data.stores || [])
        }
      } catch (error) {
        console.error('Failed to fetch stores:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStores()
  }, [])

  // スタッフの権限に応じて表示する店舗をフィルタリング
  useEffect(() => {
    if (authLoading || allStores.length === 0) return

    const adminRole = staff?.roles?.name === 'admin'
    setIsAdmin(adminRole)

    if (adminRole) {
      // 管理者は全店舗アクセス可能
      setStores(allStores)
    } else if (staff?.assigned_store_ids && staff.assigned_store_ids.length > 0) {
      // 担当店舗のみ表示
      const filteredStores = allStores.filter(s =>
        staff.assigned_store_ids.includes(s.id)
      )
      setStores(filteredStores)

      // 担当店舗が1つの場合は自動選択
      if (filteredStores.length === 1 && !selectedStoreId) {
        setSelectedStoreId(filteredStores[0].id)
      }
    } else {
      // 担当店舗が未設定の場合は全店舗（後方互換性）
      setStores(allStores)
    }
  }, [staff, authLoading, allStores, selectedStoreId])

  // URLパラメータから店舗IDを取得
  useEffect(() => {
    const storeIdFromUrl = searchParams.get('store_id')
    if (storeIdFromUrl && storeIdFromUrl !== selectedStoreId) {
      setSelectedStoreId(storeIdFromUrl)
    }
  }, [searchParams, selectedStoreId])

  // 選択された店舗の詳細を設定
  useEffect(() => {
    if (selectedStoreId && stores.length > 0) {
      const store = stores.find(s => s.id === selectedStoreId)
      setSelectedStore(store || null)
    } else {
      setSelectedStore(null)
    }
  }, [selectedStoreId, stores])

  // 店舗を選択（URLパラメータも更新）
  const selectStore = useCallback((storeId) => {
    setSelectedStoreId(storeId)

    // URLパラメータを更新
    const params = new URLSearchParams(searchParams.toString())
    if (storeId) {
      params.set('store_id', storeId)
    } else {
      params.delete('store_id')
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl, { scroll: false })
  }, [pathname, router, searchParams])

  // 店舗IDをクエリパラメータとして追加するヘルパー
  const getStoreFilterParam = useCallback(() => {
    return selectedStoreId ? `store_id=${selectedStoreId}` : ''
  }, [selectedStoreId])

  // APIリクエスト用のstore_idパラメータを取得
  const appendStoreFilter = useCallback((params) => {
    if (selectedStoreId && params instanceof URLSearchParams) {
      params.set('store_id', selectedStoreId)
    }
    return params
  }, [selectedStoreId])

  const value = {
    stores,
    allStores,
    selectedStoreId,
    selectedStore,
    isLoading,
    isAdmin,
    selectStore,
    getStoreFilterParam,
    appendStoreFilter,
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

export default StoreContext
