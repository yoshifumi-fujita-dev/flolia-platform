'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  Users,
  MousePointerClick,
  Calendar,
  UserPlus,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  RefreshCw,
  Globe,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

export default function AnalyticsPage() {
  const { selectedStoreId, stores } = useStore()
  const [period, setPeriod] = useState('7d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const analyticsEmbedUrl = process.env.NEXT_PUBLIC_ANALYTICS_EMBED_URL

  // 店舗のsite_slugを取得
  const selectedStore = stores.find(s => s.id === selectedStoreId)
  const storeSlug = selectedStore?.site_slug || null

  const embedUrl = (() => {
    if (!analyticsEmbedUrl) return null
    if (!storeSlug) return analyticsEmbedUrl
    const separator = analyticsEmbedUrl.includes('?') ? '&' : '?'
    return `${analyticsEmbedUrl}${separator}store_slug=${encodeURIComponent(storeSlug)}`
  })()

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/analytics/summary?period=${period}`
      if (storeSlug) {
        url += `&store_slug=${storeSlug}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('データの取得に失敗しました')
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period, storeSlug])

  const handleExportCSV = () => {
    if (!data?.daily || data.daily.length === 0) return

    const headers = ['日付', 'PV', 'UU', 'ユニークIP', 'CTAクリック', '予約数', '入会数', '予約CVR', '入会CVR']
    const rows = data.daily.map(d => [
      d.date,
      d.page_views || 0,
      d.unique_visitors || 0,
      d.unique_ips || 0,
      d.cta_clicks || 0,
      d.booking_created || 0,
      d.member_registered || 0,
      `${d.booking_cvr || 0}%`,
      `${d.register_cvr || 0}%`,
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            アクセス解析
          </h1>
          <p className="text-gray-400 mt-1">サイトのアクセス状況とコンバージョンを確認</p>
        </div>

        <div className="flex items-center gap-3">
          {/* 期間フィルター */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: '7d', label: '7日' },
              { value: '30d', label: '30日' },
              { value: '90d', label: '90日' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === value
                    ? 'bg-white text-violet-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 更新ボタン */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* CSVエクスポート */}
          <button
            onClick={handleExportCSV}
            disabled={!data?.daily?.length}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV出力</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      ) : data ? (
        <>
          {embedUrl && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Looker Studio ダッシュボード</h3>
                  <p className="text-sm text-gray-500">店舗フィルターは埋め込みURLのクエリで反映されます</p>
                </div>
              </div>
              <div className="aspect-[16/9] w-full">
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* サマリーカード */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard
              title="ページビュー"
              value={data.totals.page_views.toLocaleString()}
              icon={BarChart3}
              color="violet"
              subValue={`今日: ${data.today.page_views}`}
            />
            <SummaryCard
              title="ユニークユーザー"
              value={data.totals.unique_visitors.toLocaleString()}
              icon={Users}
              color="blue"
            />
            <SummaryCard
              title="ユニークIP"
              value={data.totals.unique_ips.toLocaleString()}
              icon={Globe}
              color="cyan"
              subValue={`今日: ${data.today.unique_ips || 0}`}
            />
            <SummaryCard
              title="体験予約数"
              value={data.totals.booking_created.toLocaleString()}
              icon={Calendar}
              color="green"
              subValue={`CVR: ${data.totals.booking_cvr}%`}
            />
            <SummaryCard
              title="入会数"
              value={data.totals.member_registered.toLocaleString()}
              icon={UserPlus}
              color="orange"
              subValue={`CVR: ${data.totals.register_cvr}%`}
            />
          </div>

          {/* デバイス別 & CTAクリック */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* デバイス別内訳 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">デバイス別アクセス</h3>
              <div className="space-y-4">
                <DeviceBar
                  label="モバイル"
                  value={data.device_breakdown.mobile}
                  total={data.totals.page_views}
                  icon={Smartphone}
                  color="violet"
                />
                <DeviceBar
                  label="タブレット"
                  value={data.device_breakdown.tablet}
                  total={data.totals.page_views}
                  icon={Tablet}
                  color="blue"
                />
                <DeviceBar
                  label="デスクトップ"
                  value={data.device_breakdown.desktop}
                  total={data.totals.page_views}
                  icon={Monitor}
                  color="green"
                />
              </div>
            </div>

            {/* CTAクリック */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CTAクリック数</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                  <MousePointerClick className="w-8 h-8 text-violet-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {data.totals.cta_clicks.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">期間中のクリック数</p>
                </div>
              </div>
              {data.totals.page_views > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    クリック率:
                    <span className="font-semibold text-gray-900 ml-2">
                      {((data.totals.cta_clicks / data.totals.page_views) * 100).toFixed(2)}%
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 日別推移テーブル */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">日別推移</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日付
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PV
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CTA
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      予約
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      入会
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.daily.length > 0 ? (
                    data.daily.slice().reverse().map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{day.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {(day.page_views || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {(day.unique_visitors || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {(day.cta_clicks || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {(day.booking_created || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {(day.member_registered || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 今日のイベント */}
          {Object.keys(data.today.events).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">今日のイベント</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(data.today.events).map(([name, count]) => (
                  <div key={name} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-violet-600">{count}</p>
                    <p className="text-xs text-gray-500 mt-1">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* 注意書き */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>注意:</strong> 日次集計データは毎日深夜に更新されます。
          リアルタイムのデータは「今日」の値として表示されます。
        </p>
      </div>
    </div>
  )
}

// サマリーカードコンポーネント
function SummaryCard({ title, value, icon: Icon, color, subValue }) {
  const colorClasses = {
    violet: 'bg-violet-100 text-violet-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  )
}

// デバイスバーコンポーネント
function DeviceBar({ label, value, total, icon: Icon, color }) {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0

  const colorClasses = {
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  }

  return (
    <div className="flex items-center gap-4">
      <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-900">
            {value.toLocaleString()} ({percentage}%)
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}
