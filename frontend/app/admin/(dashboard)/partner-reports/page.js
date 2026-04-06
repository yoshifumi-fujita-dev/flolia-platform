"use client"

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'

export default function AdminPartnerReportsPage() {
  const today = new Date()
  const initialDateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
  const initialDateTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const toDateInput = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateFrom, setDateFrom] = useState(toDateInput(initialDateFrom))
  const [dateTo, setDateTo] = useState(toDateInput(initialDateTo))

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await fetch(`/api/partner-offers/summary?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  const rangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return '全期間'
    if (dateFrom && dateTo) return `${dateFrom} 〜 ${dateTo}`
    if (dateFrom) return `${dateFrom} 〜`
    return `〜 ${dateTo}`
  }, [dateFrom, dateTo])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">ジムコネ 利用レポート</h1>
        </div>
        <button
          onClick={fetchReport}
          className="px-3 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200">
          <span className="text-gray-400">期間</span>
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
            onClick={fetchReport}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
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
          表示期間: {rangeLabel}
        </div>
      </div>

      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-6 text-gray-200">
        合計利用回数: <span className="text-xl font-bold text-white">{total}</span>
      </div>

      {loading && <div className="text-gray-300">読み込み中...</div>}
      {error && <div className="text-red-400 mb-4">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-700">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="text-left px-4 py-3">提携店</th>
                <th className="text-left px-4 py-3">住所</th>
                <th className="text-left px-4 py-3">URL</th>
                <th className="text-left px-4 py-3">特典内容</th>
                <th className="text-left px-4 py-3">レポート送付先</th>
                <th className="text-right px-4 py-3">利用回数</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    レポート対象がありません。
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-800">
                  <td className="px-4 py-3 font-semibold text-white">{row.name}</td>
                  <td className="px-4 py-3">{row.address || '-'}</td>
                  <td className="px-4 py-3">
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">
                        {row.url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">{row.benefit}</td>
                  <td className="px-4 py-3">{row.report_email || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
