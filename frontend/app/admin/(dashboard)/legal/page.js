'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  FileText,
  Edit,
  CheckCircle,
  Loader2,
  Save,
  X,
  ExternalLink,
  Shield,
  ScrollText,
  BookOpen,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'

// SSR無効でリッチテキストエディタを読み込む
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
})

// ページ定義（タブ順）
const LEGAL_PAGES = [
  { slug: 'terms', title: '利用規約', icon: ScrollText, url: '/terms' },
  { slug: 'privacy', title: 'プライバシーポリシー', icon: Shield, url: '/privacy' },
  { slug: 'tokushoho', title: '特定商取引法に基づく表記', icon: BookOpen, url: '/tokushoho' },
  { slug: 'disclaimer', title: '免責事項', icon: AlertTriangle, url: '/disclaimer' },
]

export default function LegalPagesPage() {
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState('terms')
  const [pages, setPages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)

  const canManage = hasPermission('staff', 'write')

  // 全ページ一括取得
  const fetchPages = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/legal-pages')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '取得に失敗しました')
      }

      // slugをキーにしたオブジェクトに変換
      const pagesMap = {}
      for (const page of data || []) {
        pagesMap[page.slug] = page
      }
      setPages(pagesMap)

      // 初期タブのデータを取得
      if (pagesMap[activeTab]) {
        await fetchPageDetail(activeTab)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 個別ページ詳細取得
  const fetchPageDetail = async (slug) => {
    try {
      const res = await fetch(`/api/legal-pages/${slug}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '取得に失敗しました')
      }
      setPages((prev) => ({ ...prev, [slug]: data }))
      setFormData({ title: data.title, content: data.content })
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchPages()
  }, [])

  // タブ切り替え時
  const handleTabChange = async (slug) => {
    setActiveTab(slug)
    setIsEditing(false)
    setError(null)
    setSuccess(null)

    // 詳細がなければ取得
    if (!pages[slug]?.content) {
      await fetchPageDetail(slug)
    } else {
      setFormData({ title: pages[slug].title, content: pages[slug].content })
    }
  }

  // 編集開始
  const handleEdit = () => {
    setIsEditing(true)
  }

  // 保存
  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      setError('タイトルと内容は必須です')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const res = await fetch(`/api/legal-pages/${activeTab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存に失敗しました')
      }

      const updated = await res.json()
      setPages((prev) => ({ ...prev, [activeTab]: updated }))
      setIsEditing(false)
      setSuccess('保存しました')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // キャンセル
  const handleCancel = () => {
    const currentPage = pages[activeTab]
    setFormData({ title: currentPage?.title || '', content: currentPage?.content || '' })
    setIsEditing(false)
  }

  const currentPageConfig = LEGAL_PAGES.find((p) => p.slug === activeTab)
  const currentPage = pages[activeTab]
  const Icon = currentPageConfig?.icon || FileText

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-7 h-7" />
          法務ページ管理
        </h1>
        <p className="text-gray-400 mt-1">
          利用規約、プライバシーポリシー、特商法表記、免責事項を編集
        </p>
      </div>

      {/* タブ */}
      <div className="bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-700">
          <nav className="flex overflow-x-auto">
            {LEGAL_PAGES.map((page) => {
              const TabIcon = page.icon
              return (
                <button
                  key={page.slug}
                  onClick={() => handleTabChange(page.slug)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === page.slug
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {page.title}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-600/30 rounded-lg text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto underline text-sm">
            閉じる
          </button>
        </div>
      )}

      {/* 成功表示 */}
      {success && (
        <div className="p-4 bg-green-900/30 border border-green-600/30 rounded-lg text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* コンテンツ */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {/* ツールバー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-white">{currentPageConfig?.title}</span>
            {currentPage?.updated_at && (
              <span className="text-sm text-gray-500 ml-2">
                （最終更新: {new Date(currentPage.updated_at).toLocaleDateString('ja-JP')}）
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={currentPageConfig?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
              title="公開ページを開く"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">公開ページ</span>
            </a>
            {canManage && !isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition"
              >
                <Edit className="w-4 h-4" />
                編集
              </button>
            )}
          </div>
        </div>

        {/* エディタ / プレビュー */}
        <div className="p-4">
          {isEditing ? (
            <div className="space-y-4">
              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  タイトル
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  内容
                </label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
              </div>

              {/* アクションボタン */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  保存
                </button>
              </div>
            </div>
          ) : (
            /* 表示モード */
            <div className="bg-white text-gray-900 p-6 rounded-lg prose prose-sm max-w-none min-h-[300px]">
              {currentPage?.content ? (
                <div dangerouslySetInnerHTML={{ __html: currentPage.content }} />
              ) : (
                <div className="text-gray-400 text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>内容がありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
