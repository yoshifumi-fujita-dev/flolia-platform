"use client"

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, RefreshCw, Store, MapPin, Gift } from 'lucide-react'

export default function AdminPartnerOffersPage() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    url: '',
    report_email: '',
    benefit: '',
    is_active: true,
    sort_order: 0,
    usage_limit_type: 'none',
    usage_limit_count: 1,
  })

  const fetchOffers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('include_inactive', 'true')
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await fetch(`/api/partner-offers?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOffers(data.offers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [])

  const openCreateModal = () => {
    setIsEditing(false)
    setSelectedOffer(null)
    setFormData({
      name: '',
      address: '',
      url: '',
      report_email: '',
      benefit: '',
      is_active: true,
      sort_order: 0,
      usage_limit_type: 'none',
      usage_limit_count: 1,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (offer) => {
    setIsEditing(true)
    setSelectedOffer(offer)
    setFormData({
      name: offer.name || '',
      address: offer.address || '',
      url: offer.url || '',
      report_email: offer.report_email || '',
      benefit: offer.benefit || '',
      is_active: offer.is_active,
      sort_order: offer.sort_order || 0,
      usage_limit_type: offer.usage_limit_type || 'none',
      usage_limit_count: offer.usage_limit_count || 1,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditing ? `/api/partner-offers/${selectedOffer.id}` : '/api/partner-offers'
      const method = isEditing ? 'PUT' : 'POST'

      const submitData = {
        ...formData,
        usage_limit_count: formData.usage_limit_type === 'none' ? null : formData.usage_limit_count,
        url: formData.url || null,
        report_email: formData.report_email || null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存に失敗しました')
      }

      setIsModalOpen(false)
      fetchOffers()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('この提携特典を削除してもよろしいですか？')) return
    try {
      const res = await fetch(`/api/partner-offers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '削除に失敗しました')
      }
      fetchOffers()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-green-400" />
          <h1 className="text-2xl font-bold text-white">ジムコネ（提携特典）</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition"
          >
            提携店向けヘルプ
          </button>
          <button
            onClick={fetchOffers}
            className="px-3 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="bg-white text-gray-900 rounded-xl p-6 mb-6" id="gymconnect-help">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">ジムコネ（提携特典）マニュアル</h2>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              印刷する
            </button>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            ジムコネは、キックボクシングジム FLOLIA と提携して行う会員向け特典サービスです。
            FLOLIA会員の方が「ジムコネ」画面を提示し、スワイプ操作を行うことで利用記録が残ります。
          </p>
          <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-2 mb-4">
            <li>FLOLIA会員が「ジムコネ」画面を提示</li>
            <li>提携店スタッフは内容（特典）を確認</li>
            <li>会員が「スワイプして利用」を実行</li>
            <li>特典を提供</li>
          </ol>
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">操作イメージ</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="border border-gray-300 rounded-lg px-3 py-2 text-xs">ジムコネ画面</div>
              <div className="text-gray-400">→</div>
              <div className="border border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2 text-xs">
                スワイプして利用
              </div>
              <div className="text-gray-400">→</div>
              <div className="border border-gray-300 rounded-lg px-3 py-2 text-xs">利用済み表示</div>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            補足: 会員証QRの提示で特典を受けられます。利用頻度（週/月の上限）が設定されている場合は、画面に表示されます。
          </div>
        </div>
      )}

      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200">
          <span className="text-gray-400">利用集計期間</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200"
          />
          <span className="text-gray-500">〜</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200"
          />
          <button
            onClick={fetchOffers}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            適用
          </button>
          <button
            onClick={() => {
              setDateFrom('')
              setDateTo('')
            }}
            className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
          >
            リセット
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          期間を指定すると、その期間内の利用回数を表示します。
        </div>
      </div>

      {loading && (
        <div className="text-gray-300">読み込み中...</div>
      )}

      {error && (
        <div className="text-red-400 mb-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {offers.length === 0 && (
            <div className="text-gray-400">提携特典がまだ登録されていません。</div>
          )}

          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-gray-800/60 border border-gray-700 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-white">{offer.name}</h2>
                    {!offer.is_active && (
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                        非公開
                      </span>
                    )}
                  </div>
                  {offer.address && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      {offer.address}
                    </div>
                  )}
                  {offer.url && (
                    <div className="text-xs text-emerald-300 mb-2">
                      <a href={offer.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {offer.url}
                      </a>
                    </div>
                  )}
                  {offer.report_email && (
                    <div className="text-xs text-gray-400 mb-2">
                      レポート送付先: {offer.report_email}
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-gray-200">
                    <Gift className="w-4 h-4 mt-0.5 text-green-300" />
                    <p className="text-sm leading-relaxed">{offer.benefit}</p>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    利用頻度: {offer.usage_limit_type === 'none'
                      ? '制限なし'
                      : offer.usage_limit_type === 'weekly'
                        ? `週 ${offer.usage_limit_count || 1} 回`
                        : `月 ${offer.usage_limit_count || 1} 回`}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-300 min-w-[110px]">
                  <div>期間内利用</div>
                  <div className="text-xl font-bold text-white">{offer.redemption_count || 0}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-gray-500">
                  並び順: {offer.sort_order || 0}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(offer)}
                    className="px-3 py-1.5 text-sm text-gray-200 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="px-3 py-1.5 text-sm text-red-300 bg-red-900/40 rounded-lg hover:bg-red-900/60 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #gymconnect-help, #gymconnect-help * {
            visibility: visible;
          }
          #gymconnect-help {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? '提携特典を編集' : '提携特典を作成'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">店舗名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">住所</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">レポート送付先メール</label>
                <input
                  type="email"
                  value={formData.report_email}
                  onChange={(e) => setFormData({ ...formData, report_email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  placeholder="report@example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">特典内容</label>
                <textarea
                  value={formData.benefit}
                  onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">並び順</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    id="offer-active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="offer-active" className="text-sm text-gray-300">公開する</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">利用頻度</label>
                  <select
                    value={formData.usage_limit_type}
                    onChange={(e) => setFormData({ ...formData, usage_limit_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                  >
                    <option value="none">制限なし</option>
                    <option value="weekly">週</option>
                    <option value="monthly">月</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">上限回数</label>
                  <input
                    type="number"
                    min="1"
                    disabled={formData.usage_limit_type === 'none'}
                    value={formData.usage_limit_count}
                    onChange={(e) => setFormData({ ...formData, usage_limit_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
