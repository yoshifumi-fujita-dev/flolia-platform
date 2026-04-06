'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  ChevronDown,
  LogOut,
  Shield,
  Settings,
  Briefcase,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function AdminHeader() {
  const [user, setUser] = useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { staff, menuMode, setMenuMode, isAdmin } = useAuth()

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    fetchUser()
  }, [])

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/backoffice/login'
  }

  const handleToggleMenuMode = () => {
    // 管理者のみメニュー切り替え可能
    if (!isAdmin) return
    setMenuMode(menuMode === 'operation' ? 'admin' : 'operation')
    setIsDropdownOpen(false)
  }

  const displayName = staff?.name || user?.email?.split('@')[0] || 'ユーザー'
  const roleName = staff?.roles?.display_name || '管理者'

  return (
    <header className="hidden lg:flex items-center justify-between h-16 px-6 bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
      {/* Menu Toggle Button - 管理者のみ表示（モード切り替え可能） */}
      <div className="flex items-center">
        {isAdmin ? (
          <button
            onClick={handleToggleMenuMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              menuMode === 'operation'
                ? 'bg-green-600/20 text-green-300 hover:bg-green-600/30'
                : 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30'
            }`}
          >
            {menuMode === 'operation' ? (
              <>
                <Briefcase className="w-4 h-4" />
                <span className="text-sm font-medium">運営メニュー</span>
                <span className="text-xs text-gray-400 ml-1">→ 管理者に切替</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">管理者メニュー</span>
                <span className="text-xs text-gray-400 ml-1">→ 運営に切替</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-sm text-gray-400">
            運営メニュー
          </div>
        )}
      </div>

      {/* User Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-gray-400">{roleName}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-gray-700">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3 text-violet-400" />
                <span className="text-xs text-violet-400">{roleName}</span>
              </div>
            </div>

            <div className="py-1">
              <Link
                href="/backoffice/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <User className="w-4 h-4" />
                プロフィール設定
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
