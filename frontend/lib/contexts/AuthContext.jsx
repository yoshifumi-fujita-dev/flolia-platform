'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const AuthContext = createContext({
  user: null,
  staff: null,
  permissions: null,
  loading: true,
  hasPermission: () => false,
  canAccessStore: () => false,
  isAdmin: false,
  menuMode: 'operation',
  setMenuMode: () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [staff, setStaff] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menuMode, setMenuMode] = useState('operation')

  useEffect(() => {
    const supabase = createClient()

    // 初回ロード
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // スタッフ情報と権限を取得
          const res = await fetch('/api/auth/me')
          if (res.ok) {
            const data = await res.json()
            setStaff(data.staff)
            setPermissions(data.permissions)
          }
        }
      } catch (error) {
        console.error('Auth load error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)

        if (session?.user) {
          const res = await fetch('/api/auth/me')
          if (res.ok) {
            const data = await res.json()
            setStaff(data.staff)
            setPermissions(data.permissions)
          }
        } else {
          setStaff(null)
          setPermissions(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 権限チェック関数
  const hasPermission = (resource, action) => {
    if (!permissions) return false

    // 管理者は全て許可（admin または Super Admin）
    if (staff?.roles?.name === 'admin' || staff?.roles?.name === 'Super Admin') return true

    return permissions[resource]?.[action] === true
  }

  // 店舗アクセス権チェック
  const canAccessStore = (storeId) => {
    if (!staff) return false

    // 管理者または担当店舗が空（全店舗アクセス可）
    if (staff.roles?.name === 'admin' || staff.roles?.name === 'Super Admin') return true
    if (!staff.assigned_store_ids || staff.assigned_store_ids.length === 0) return true

    return staff.assigned_store_ids.includes(storeId)
  }

  // 管理者かどうか
  // roles.nameが'admin'または'Super Admin'、またはroles.display_nameが'管理者'または'システム管理者'
  const isAdmin = staff?.roles?.name === 'admin' ||
                  staff?.roles?.name === 'Super Admin' ||
                  staff?.roles?.display_name === '管理者' ||
                  staff?.roles?.display_name === 'システム管理者'

  return (
    <AuthContext.Provider
      value={{
        user,
        staff,
        permissions,
        loading,
        hasPermission,
        canAccessStore,
        isAdmin,
        menuMode,
        setMenuMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
