'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  DollarSign,
} from 'lucide-react'

const APPROVER_ROLES = new Set([
  'admin',
  'store_manager',
  'area_manager',
  'super_admin',
  'Super Admin',
  'Area Manager',
  'system_admin',
  'System Admin',
])

const isApprover = (roleName) => {
  if (!roleName) return false
  const normalized = roleName.replace(/\s+/g, '_').toLowerCase()
  return APPROVER_ROLES.has(roleName) || APPROVER_ROLES.has(normalized)
}

export default function RefundsPage() {
  const { staff, hasPermission } = useAuth()
  const canView = hasPermission('refunds', 'view')
  const canCreate = hasPermission('refunds', 'create')
  const canApprove = isApprover(staff?.roles?.name)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refunds, setRefunds] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [form, setForm] = useState({
    paymentId: '',
    requestedAmount: '',
    reasonType: 'customer',
    feeBearer: 'customer',
    reasonText: '',
  })

  const resetForm = () => {
    setForm({
      paymentId: '',
      requestedAmount: '',
      reasonType: 'customer',
      feeBearer: 'customer',
      reasonText: '',
    })
  }

  const loadRefunds = async () => {
    if (!canView) return
    setLoading(true)
    try {
      const res = await fetch('/api/refunds?limit=50')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '返金申請の取得に失敗しました')
      setRefunds(data.refunds || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRefunds()
  }, [canView])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canCreate) {
      setError('返金申請の作成権限がありません')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: form.paymentId.trim(),
          requested_amount: Number(form.requestedAmount),
          reason_type: form.reasonType,
          reason_text: form.reasonText.trim() || null,
          fee_bearer: form.feeBearer,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '返金申請に失敗しました')

      setSuccess('返金申請を作成しました')
      resetForm()
      await loadRefunds()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (refundId) => {
    if (!canApprove) {
      setError('返金の承認権限がありません')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/refunds/${refundId}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '返金処理に失敗しました')
      setSuccess('返金を実行しました')
      await loadRefunds()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const statusLabel = (status) => {
    switch (status) {
      case 'requested':
        return '申請中'
      case 'processed':
        return '完了'
      case 'failed':
        return '失敗'
      case 'approved':
        return '承認済み'
      case 'rejected':
        return '却下'
      default:
        return status
    }
  }

  const tableRows = useMemo(() => refunds || [], [refunds])

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">アクセス権限がありません</h1>
          <p className="text-gray-400">返金管理を閲覧する権限がありません。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7" />
            返金管理
          </h1>
          <p className="text-gray-400 mt-1">返金申請の作成と承認</p>
        </div>
        <button
          onClick={loadRefunds}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          更新
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-900/50 border border-green-500/50 rounded-lg flex items-center gap-3 text-green-400">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">返金申請</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">決済ID</label>
              <input
                type="text"
                value={form.paymentId}
                onChange={(e) => setForm({ ...form, paymentId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="payment UUID"
                required
                disabled={!canCreate || saving}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">返金希望額（円）</label>
              <input
                type="number"
                min="1"
                value={form.requestedAmount}
                onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
                disabled={!canCreate || saving}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">返金理由区分</label>
              <select
                value={form.reasonType}
                onChange={(e) => setForm({ ...form, reasonType: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                disabled={!canCreate || saving}
              >
                <option value="customer">顧客都合</option>
                <option value="company">当社都合</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">手数料負担</label>
              <select
                value={form.feeBearer}
                onChange={(e) => setForm({ ...form, feeBearer: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                disabled={!canCreate || saving}
              >
                <option value="customer">顧客負担</option>
                <option value="company">当社負担</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">理由（任意）</label>
            <textarea
              value={form.reasonText}
              onChange={(e) => setForm({ ...form, reasonText: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={3}
              disabled={!canCreate || saving}
            />
          </div>
          <button
            type="submit"
            disabled={!canCreate || saving}
            className="px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {saving ? '申請中...' : '返金申請を作成'}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">返金申請一覧</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="py-3 pr-4">ステータス</th>
                  <th className="py-3 pr-4">決済ID</th>
                  <th className="py-3 pr-4">会員</th>
                  <th className="py-3 pr-4">申請額</th>
                  <th className="py-3 pr-4">返金額</th>
                  <th className="py-3 pr-4">手数料</th>
                  <th className="py-3 pr-4">申請者</th>
                  <th className="py-3 pr-4">作成日時</th>
                  <th className="py-3 pr-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      返金申請がありません
                    </td>
                  </tr>
                ) : (
                  tableRows.map((refund) => (
                    <tr key={refund.id} className="border-b border-gray-700/50 text-gray-200">
                      <td className="py-3 pr-4">{statusLabel(refund.status)}</td>
                      <td className="py-3 pr-4 text-xs">{refund.payment_id}</td>
                      <td className="py-3 pr-4">{refund.members?.name || '-'}</td>
                      <td className="py-3 pr-4">{refund.requested_amount?.toLocaleString()}円</td>
                      <td className="py-3 pr-4">{refund.refund_amount?.toLocaleString()}円</td>
                      <td className="py-3 pr-4">{refund.fee_amount?.toLocaleString()}円</td>
                      <td className="py-3 pr-4">{refund.requested_staff?.name || '-'}</td>
                      <td className="py-3 pr-4">
                        {refund.created_at ? new Date(refund.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 pr-4">
                        {refund.status === 'requested' && canApprove ? (
                          <button
                            onClick={() => handleApprove(refund.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            disabled={saving}
                          >
                            承認して実行
                          </button>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
