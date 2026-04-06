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
  AlertCircle,
  Shield,
  BookOpen,
  Share2,
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

// 共通書類の文書種別タブ定義
const DOCUMENT_TYPES = [
  { type: 'work_rules_consent', title: '就業規則同意書', icon: BookOpen },
  { type: 'confidentiality', title: '機密保持誓約書', icon: Shield },
  { type: 'sns_policy', title: 'SNSポリシー同意書', icon: Share2 },
]

export default function ContractsPage() {
  const { hasPermission } = useAuth()
  const [activeDocumentType, setActiveDocumentType] = useState('work_rules_consent')
  const [templates, setTemplates] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: '', content: '' })
  const [submitting, setSubmitting] = useState(false)

  const canManage = hasPermission('staff', 'write')

  // 全テンプレート取得
  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/contract-templates?active_only=false')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '取得に失敗しました')
      }

      // document_type をキーにしたオブジェクトに変換（共通書類のみ、最新バージョン）
      const templatesMap = {}
      for (const template of data || []) {
        if (template.employment_type !== 'common') continue
        const key = template.document_type
        if (!templatesMap[key] || template.version > templatesMap[key].version) {
          templatesMap[key] = template
        }
      }
      setTemplates(templatesMap)

      // 初期タブのデータをセット
      if (templatesMap[activeDocumentType]) {
        setFormData({
          name: templatesMap[activeDocumentType].name || '',
          content: templatesMap[activeDocumentType].content || '',
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  // 文書種別タブ切り替え時
  const handleDocumentTypeChange = (type) => {
    setActiveDocumentType(type)
    setIsEditing(false)
    setError(null)
    setSuccess(null)

    const template = templates[type]
    setFormData({
      name: template?.name || '',
      content: template?.content || '',
    })
  }

  // 編集開始
  const handleEdit = () => {
    setIsEditing(true)
  }

  // 保存
  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      setError('テンプレート名と内容は必須です')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const currentTemplate = templates[activeDocumentType]
      const url = currentTemplate
        ? `/api/contract-templates/${currentTemplate.id}`
        : '/api/contract-templates'
      const method = currentTemplate ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          employment_type: 'common',
          document_type: activeDocumentType,
          content: formData.content,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存に失敗しました')
      }

      const updated = await res.json()
      setTemplates((prev) => ({ ...prev, [activeDocumentType]: updated }))
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
    const template = templates[activeDocumentType]
    setFormData({
      name: template?.name || '',
      content: template?.content || '',
    })
    setIsEditing(false)
  }

  const currentDocumentConfig = DOCUMENT_TYPES.find((t) => t.type === activeDocumentType)
  const currentTemplate = templates[activeDocumentType]
  const Icon = currentDocumentConfig?.icon || FileText

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
          社内同意書テンプレート
        </h1>
        <p className="text-gray-400 mt-1">
          従業員登録時に同意を求める社内同意書テンプレートを管理します
        </p>
        <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
          <p className="text-sm text-blue-300">
            <span className="font-medium">💡 運用ガイド:</span> ここで管理するのは就業規則同意書・機密保持誓約など<strong>社内向け同意書</strong>です。
            <br />
            労働条件通知書・雇用契約書など<strong>法的書類</strong>は
            <a
              href="https://biz.moneyforward.com/hr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline ml-1"
            >
              MFクラウド人事管理
            </a>
            で作成してください。
          </p>
        </div>
      </div>

      {/* 文書種別タブ */}
      <div className="bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-700">
          <nav className="flex overflow-x-auto">
            {DOCUMENT_TYPES.map((doc) => {
              const TabIcon = doc.icon
              const hasTemplate = !!templates[doc.type]
              return (
                <button
                  key={doc.type}
                  onClick={() => handleDocumentTypeChange(doc.type)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeDocumentType === doc.type
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {doc.title}
                  {!hasTemplate && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full" title="未作成" />
                  )}
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
            <span className="font-medium text-white">
              {currentDocumentConfig?.title}
            </span>
            {currentTemplate ? (
              <span className="text-sm text-gray-500 ml-2">
                （v{currentTemplate.version} · 最終更新: {new Date(currentTemplate.updated_at).toLocaleDateString('ja-JP')}）
              </span>
            ) : (
              <span className="text-sm text-orange-400 ml-2">（未作成）</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canManage && !isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition"
              >
                <Edit className="w-4 h-4" />
                {currentTemplate ? '編集' : '作成'}
              </button>
            )}
          </div>
        </div>

        {/* エディタ / プレビュー */}
        <div className="p-4">
          {isEditing ? (
            <div className="space-y-4">
              {/* テンプレート名 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  テンプレート名
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={currentDocumentConfig?.title}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  同意書内容
                </label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
                <p className="text-xs text-gray-500 mt-2">
                  変数: {'{{staff_name}}'} 従業員名, {'{{company_name}}'} 会社名, {'{{date}}'} 契約日
                </p>
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
              {currentTemplate?.content ? (
                <div dangerouslySetInnerHTML={{ __html: currentTemplate.content }} />
              ) : (
                <div className="text-gray-400 text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>同意書テンプレートがまだ作成されていません</p>
                  {canManage && (
                    <button
                      onClick={handleEdit}
                      className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition"
                    >
                      テンプレートを作成
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
