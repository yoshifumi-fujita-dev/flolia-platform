'use client'

import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // プロフィールフォーム
  const [formData, setFormData] = useState({
    name: '',
    name_kana: '',
    phone: '',
    instructor_bio: '',
  })

  // パスワード変更
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)

  // スタッフ情報を取得
  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('プロフィールの取得に失敗しました')
      const data = await res.json()
      setStaff(data.staff)
      setFormData({
        name: data.staff.name || '',
        name_kana: data.staff.name_kana || '',
        phone: data.staff.phone || '',
        instructor_bio: data.staff.instructor_bio || '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  // プロフィール更新
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'プロフィールの更新に失敗しました')
      }

      const data = await res.json()
      setStaff(data.staff)
      setSuccess('プロフィールを更新しました')

      // 3秒後にメッセージを消す
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // パスワード変更
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }

    setPasswordChanging(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) throw error

      setSuccess('パスワードを変更しました')
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'パスワードの変更に失敗しました')
    } finally {
      setPasswordChanging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-7 h-7" />
          プロフィール設定
        </h1>
        <p className="text-gray-600 mt-1">ログイン中のアカウント情報を編集できます</p>
      </div>

      {/* メッセージ */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* アカウント情報 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">アカウント情報</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-white text-2xl font-bold">
              {(staff?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg text-gray-900">{staff?.name || 'ユーザー'}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="w-4 h-4" />
                <span>{staff?.email}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-4 h-4 text-violet-500" />
                <span className="text-sm text-violet-600 font-medium">
                  {staff?.roles?.display_name || '管理者'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* プロフィール編集フォーム */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">プロフィール編集</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 名前 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />
          </div>

          {/* 名前（カナ） - staffテーブルのみ */}
          {!staff?.is_legacy && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                氏名（カナ）
              </label>
              <input
                type="text"
                value={formData.name_kana}
                onChange={(e) => setFormData({ ...formData, name_kana: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="ヤマダ タロウ"
              />
            </div>
          )}

          {/* 電話番号 - staffテーブルのみ */}
          {!staff?.is_legacy && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                電話番号
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="090-1234-5678"
                />
              </div>
            </div>
          )}

          {/* インストラクター紹介文 - staffテーブルかつインストラクターの場合 */}
          {!staff?.is_legacy && staff?.is_instructor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                インストラクター紹介文
              </label>
              <textarea
                value={formData.instructor_bio}
                onChange={(e) => setFormData({ ...formData, instructor_bio: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                rows={4}
                placeholder="自己紹介やレッスンへの思いなど"
              />
            </div>
          )}

          {/* 保存ボタン */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  変更を保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            パスワード変更
          </h2>
        </div>
        <div className="p-6">
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="text-violet-600 hover:text-violet-700 font-medium"
            >
              パスワードを変更する
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* 新しいパスワード */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="8文字以上"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* パスワード確認 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード（確認） <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="もう一度入力"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={passwordChanging}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {passwordChanging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      変更中...
                    </>
                  ) : (
                    'パスワードを変更'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
