'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  FileDown,
  Users,
  Clock,
  Receipt,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  ExternalLink,
  UserPlus,
  FileText,
  PenTool,
  ArrowRight,
  Link as LinkIcon,
} from 'lucide-react'
import Link from 'next/link'

export default function MFExportPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [staffCount, setStaffCount] = useState(0)
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [expenseStats, setExpenseStats] = useState({ count: 0, total: 0 })
  const [message, setMessage] = useState(null)

  // 勤怠エクスポート用の期間
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const lastMonth = subMonths(new Date(), 1)
    return format(lastMonth, 'yyyy-MM')
  })

  // 経費エクスポート用の期間
  const [expenseStartDate, setExpenseStartDate] = useState(() => {
    const lastMonth = subMonths(new Date(), 1)
    return format(startOfMonth(lastMonth), 'yyyy-MM-dd')
  })
  const [expenseEndDate, setExpenseEndDate] = useState(() => {
    const lastMonth = subMonths(new Date(), 1)
    return format(endOfMonth(lastMonth), 'yyyy-MM-dd')
  })

  // 初期データ取得
  useEffect(() => {
    fetchStats()
  }, [attendanceMonth, expenseStartDate, expenseEndDate])

  const fetchStats = async () => {
    try {
      // 従業員数を取得
      const { count: staffTotal } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('employee_number', 'is', null)

      setStaffCount(staffTotal || 0)

      // 勤怠データ数を取得
      const [year, month] = attendanceMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd')

      const { count: attendanceTotal } = await supabase
        .from('staff_attendances')
        .select('*', { count: 'exact', head: true })
        .gte('work_date', startDate)
        .lte('work_date', endDate)

      setAttendanceCount(attendanceTotal || 0)

      // 承認済み経費を取得
      const { data: expenses } = await supabase
        .from('expense_requests')
        .select('amount')
        .eq('status', 'approved')
        .is('exported_at', null)
        .gte('expense_date', expenseStartDate)
        .lte('expense_date', expenseEndDate)

      if (expenses) {
        setExpenseStats({
          count: expenses.length,
          total: expenses.reduce((sum, e) => sum + e.amount, 0),
        })
      }
    } catch (error) {
      console.error('Stats fetch error:', error)
    }
  }

  // CSVダウンロード共通関数
  const downloadCSV = (base64Content, filename) => {
    // BOMを追加してExcelで文字化けしないように
    const bom = new Uint8Array([0xef, 0xbb, 0xbf])
    const csvContent = atob(base64Content)
    const csvArray = new Uint8Array(csvContent.length)
    for (let i = 0; i < csvContent.length; i++) {
      csvArray[i] = csvContent.charCodeAt(i)
    }
    const blob = new Blob([bom, csvArray], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 従業員マスタエクスポート
  const handleEmployeeExport = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/mf-export/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          include_inactive: false,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      downloadCSV(data.csv_base64, data.filename)
      setMessage({
        type: 'success',
        text: `${data.employee_count}名の従業員データをエクスポートしました`,
      })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 勤怠データエクスポート
  const handleAttendanceExport = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const [year, month] = attendanceMonth.split('-')
      const res = await fetch('/api/mf-export/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(year),
          month: parseInt(month),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      downloadCSV(data.csv_base64, data.filename)
      setMessage({
        type: 'success',
        text: `${data.employee_count}名の勤怠データをエクスポートしました`,
      })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 経費データエクスポート
  const handleExpenseExport = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/expenses/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: expenseStartDate,
          end_date: expenseEndDate,
          include_exported: false,
          mark_as_exported: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      downloadCSV(data.csv_base64, data.filename)
      setMessage({
        type: 'success',
        text: `${data.expense_count}件（合計 ¥${data.total_amount.toLocaleString()}）の経費をエクスポートしました`,
      })
      fetchStats() // 統計を更新
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileDown className="h-7 w-7 text-blue-600" />
          MFクラウド連携
        </h1>
        <p className="mt-2 text-gray-600">
          マネーフォワードクラウドへインポートするためのCSVファイルをエクスポートします
        </p>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* MFクラウドサービス一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MFクラウド人事管理 - 従業員マスタ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">MFクラウド人事管理</h2>
              <p className="text-sm text-gray-500">従業員マスタ</p>
            </div>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">エクスポート対象</span>
              <span className="font-semibold text-gray-900">{staffCount}名</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              従業員番号が設定されている有効なスタッフ
            </p>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p className="font-medium mb-2">出力項目:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>従業員番号、氏名（姓・名）</li>
              <li>カナ、メールアドレス、電話番号</li>
              <li>入社日、雇用形態、在籍状況</li>
            </ul>
          </div>

          <button
            onClick={handleEmployeeExport}
            disabled={loading || staffCount === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-5 w-5" />
            従業員マスタCSVをダウンロード
          </button>
        </div>

        {/* MFクラウド給与 - 勤怠データ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">MFクラウド給与</h2>
              <p className="text-sm text-gray-500">勤怠データ</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象月
            </label>
            <input
              type="month"
              value={attendanceMonth}
              onChange={(e) => setAttendanceMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">勤怠レコード数</span>
              <span className="font-semibold text-gray-900">{attendanceCount}件</span>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p className="font-medium mb-2">出力項目:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>出勤日数、欠勤日数、有給日数</li>
              <li>所定労働時間、実労働時間</li>
              <li>残業時間、深夜時間、休日出勤日数</li>
            </ul>
          </div>

          <button
            onClick={handleAttendanceExport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-5 w-5" />
            勤怠データCSVをダウンロード
          </button>
        </div>

        {/* MFクラウド会計 - 経費精算 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">MFクラウド会計</h2>
              <p className="text-sm text-gray-500">経費精算（仕訳データ）</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                開始日
              </label>
              <input
                type="date"
                value={expenseStartDate}
                onChange={(e) => setExpenseStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                終了日
              </label>
              <input
                type="date"
                value={expenseEndDate}
                onChange={(e) => setExpenseEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">未エクスポート件数</span>
              <span className="font-semibold text-gray-900">{expenseStats.count}件</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">合計金額</span>
              <span className="font-semibold text-gray-900">
                ¥{expenseStats.total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p className="font-medium mb-2">出力形式:</p>
            <p className="text-gray-500">MF会計の仕訳帳インポート形式</p>
          </div>

          <button
            onClick={handleExpenseExport}
            disabled={loading || expenseStats.count === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-5 w-5" />
            経費仕訳CSVをダウンロード
          </button>
        </div>

        {/* MFクラウド社会保険 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Building2 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">MFクラウド社会保険</h2>
              <p className="text-sm text-gray-500">電子申請</p>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              MFクラウド社会保険は、MFクラウド人事管理・給与と自動連携されます。
              従業員マスタと勤怠データをエクスポートすることで、社会保険の電子申請に必要なデータが連携されます。
            </p>
          </div>

          <div className="mt-4">
            <a
              href="https://biz.moneyforward.com/social_insurance/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <ExternalLink className="h-5 w-5" />
              MFクラウド社会保険を開く
            </a>
          </div>
        </div>
      </div>

      {/* 入社手続きフロー */}
      <div className="mt-8 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
        <h3 className="text-lg font-semibold text-violet-900 mb-2 flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          入社手続きフロー
        </h3>
        <p className="text-sm text-violet-700 mb-6">
          Floliaで基本情報収集・社内同意書署名を行い、法的書類はMFクラウド人事管理で作成します
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flolia側 */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Flolia</span>
              <span className="text-sm text-gray-500">社内手続き</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-green-600">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">スタッフ登録</p>
                  <p className="text-sm text-gray-500">基本情報・雇用形態・従業員番号を設定</p>
                  <Link
                    href="/backoffice/staff"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-1"
                  >
                    従業員管理へ <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-green-600">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">オンボーディング招待</p>
                  <p className="text-sm text-gray-500">招待メールを送信し、以下を収集</p>
                  <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <li>・社内規程への同意（就業規則、機密保持等）</li>
                    <li>・電子署名の取得</li>
                    <li>・LINE連携</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-green-600">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">従業員CSVエクスポート</p>
                  <p className="text-sm text-gray-500">MFクラウド人事管理へインポート</p>
                </div>
              </div>
            </div>
          </div>

          {/* MFクラウド側 */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">MFクラウド</span>
              <span className="text-sm text-gray-500">法的手続き</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-purple-600">4</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">従業員マスタ登録</p>
                  <p className="text-sm text-gray-500">CSVインポートで従業員情報を登録</p>
                  <a
                    href="https://biz.moneyforward.com/hr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mt-1"
                  >
                    MFクラウド人事管理 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-purple-600">5</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">労働条件通知書・雇用契約書</p>
                  <p className="text-sm text-gray-500">法定記載事項を含む書類を作成・交付</p>
                  <p className="text-xs text-gray-400 mt-1">※ 電子署名対応、法改正自動追従</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-purple-600">6</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">社会保険届出</p>
                  <p className="text-sm text-gray-500">資格取得届等を電子申請</p>
                  <a
                    href="https://biz.moneyforward.com/social_insurance/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mt-1"
                  >
                    MFクラウド社会保険 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 役割分担の説明 */}
        <div className="mt-6 p-4 bg-white/60 rounded-lg">
          <h4 className="text-sm font-semibold text-violet-800 mb-2">なぜこの分担なのか？</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Flolia（社内同意書）</p>
              <ul className="text-gray-500 text-xs mt-1 space-y-0.5">
                <li>・就業規則への同意確認</li>
                <li>・機密保持に関する誓約</li>
                <li>・社内ルールの周知確認</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700">MFクラウド（法的書類）</p>
              <ul className="text-gray-500 text-xs mt-1 space-y-0.5">
                <li>・労働条件通知書（法定記載事項あり）</li>
                <li>・雇用契約書（法改正への自動対応）</li>
                <li>・社会保険届出（電子申請）</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 月次連携フロー説明 */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">月次連携フロー</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <span className="text-lg font-bold text-blue-600">1</span>
            </div>
            <p className="text-sm text-blue-800 font-medium">従業員マスタ</p>
            <p className="text-xs text-blue-600 mt-1">→ MFクラウド人事管理</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <span className="text-lg font-bold text-blue-600">2</span>
            </div>
            <p className="text-sm text-blue-800 font-medium">勤怠データ（月次）</p>
            <p className="text-xs text-blue-600 mt-1">→ MFクラウド給与</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <span className="text-lg font-bold text-blue-600">3</span>
            </div>
            <p className="text-sm text-blue-800 font-medium">経費精算</p>
            <p className="text-xs text-blue-600 mt-1">→ MFクラウド会計</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
              <span className="text-lg font-bold text-blue-600">4</span>
            </div>
            <p className="text-sm text-blue-800 font-medium">社会保険</p>
            <p className="text-xs text-blue-600 mt-1">MF間で自動連携</p>
          </div>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="mt-6 text-sm text-gray-500">
        <p>
          ※ CSVファイルはUTF-8（BOM付き）で出力されます。Excelで開く場合はそのまま開けます。
        </p>
        <p className="mt-1">
          ※ MFクラウドへのインポート手順は各サービスのヘルプをご確認ください。
        </p>
      </div>
    </div>
  )
}
