'use client'

import { useState, useEffect } from 'react'
import {
  HelpCircle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // モーダル
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedFaq, setSelectedFaq] = useState(null)
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    is_active: true,
    display_order: 0,
  })

  // FAQ一覧を取得
  const fetchFaqs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/faqs?include_inactive=true')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFaqs(data.faqs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaqs()
  }, [])

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      question: '',
      answer: '',
      is_active: true,
      display_order: faqs.length,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (faq) => {
    setIsEditing(true)
    setSelectedFaq(faq)
    setFormData({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active,
      display_order: faq.display_order,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditing ? `/api/faqs/${selectedFaq.id}` : '/api/faqs'
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
      fetchFaqs()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('このFAQを削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/faqs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchFaqs()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleActive = async (faq) => {
    try {
      const res = await fetch(`/api/faqs/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !faq.is_active }),
      })
      if (!res.ok) throw new Error('更新に失敗しました')
      fetchFaqs()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-7 h-7" />
            よくあるご質問
          </h1>
          <p className="text-gray-600 mt-1">FAQの管理（全店舗共通）</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFaqs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          FAQがありません。「追加」ボタンから作成してください。
        </div>
      ) : (
        /* FAQ一覧 */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-violet-600 font-bold">Q.</span>
                      <span className={`font-medium ${!faq.is_active ? 'text-gray-400' : 'text-gray-900'}`}>
                        {faq.question}
                      </span>
                      {!faq.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          非公開
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 ml-6">
                      <span className="text-violet-600 font-bold">A.</span>
                      <p className={`whitespace-pre-wrap ${!faq.is_active ? 'text-gray-400' : 'text-gray-600'}`}>
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(faq)}
                      className={`p-2 rounded-lg transition-colors ${
                        faq.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={faq.is_active ? '非公開にする' : '公開する'}
                    >
                      {faq.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => openEditModal(faq)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'FAQを編集' : 'FAQを追加'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* 質問 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    質問 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="例: 入会に必要なものは何ですか？"
                    required
                  />
                </div>

                {/* 回答 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    回答 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.answer}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    rows={5}
                    placeholder="回答を入力"
                    required
                  />
                </div>

                {/* 表示順 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示順
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    min={0}
                  />
                </div>

                {/* 公開設定 */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-700">公開する</span>
                  </label>
                </div>

                {/* ボタン */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    {isEditing ? '更新' : '追加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
