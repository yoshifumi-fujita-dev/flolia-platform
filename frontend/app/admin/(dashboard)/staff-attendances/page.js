'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Download,
  X,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const STATUS_LABELS = {
  pending: { label: '未出勤', color: 'bg-gray-600' },
  working: { label: '勤務中', color: 'bg-blue-600' },
  completed: { label: '完了', color: 'bg-green-600' },
  absent: { label: '欠勤', color: 'bg-red-600' },
  leave: { label: '休暇', color: 'bg-violet-600' },
}

export default function StaffAttendancePage() {
  const { isAdmin } = useAuth()
  const [attendances, setAttendances] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // データ取得
  const fetchData = async () => {
    setLoading(true)
    try {
      // スタッフ一覧
      const staffRes = await fetch('/api/staff?exclude_instructors=true')
      const staffData = await staffRes.json()
      if (staffRes.ok) {
        setStaff(staffData.staff || [])
      }

      // 勤怠一覧
      let url = `/api/staff-attendances?year=${selectedYear}&month=${selectedMonth}`
      if (selectedStaffId) {
        url += `&staff_id=${selectedStaffId}`
      }
      const attendanceRes = await fetch(url)
      const attendanceData = await attendanceRes.json()
      if (attendanceRes.ok) {
        setAttendances(attendanceData.attendances || [])
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth, selectedStaffId])

  // 月移動
  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  // 日付一覧を生成
  const getDaysInMonth = () => {
    const days = []
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedYear, selectedMonth - 1, i)
      days.push({
        date: i,
        dayOfWeek: date.getDay(),
        dateString: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      })
    }
    return days
  }

  // 曜日名
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']

  // 時刻フォーマット
  const formatTime = (datetime) => {
    if (!datetime) return '-'
    return new Date(datetime).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 時間フォーマット（分→時間）
  const formatMinutes = (minutes) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}:${String(mins).padStart(2, '0')}` : `${hours}:00`
  }

  // 編集モーダルを開く
  const openEditModal = (attendance) => {
    setEditingAttendance({
      ...attendance,
      clock_in_time: attendance.clock_in_at
        ? new Date(attendance.clock_in_at).toTimeString().slice(0, 5)
        : '',
      clock_out_time: attendance.clock_out_at
        ? new Date(attendance.clock_out_at).toTimeString().slice(0, 5)
        : '',
    })
    setShowEditModal(true)
  }

  // 新規勤怠作成用モーダル
  const openNewModal = (staffId, dateString) => {
    setEditingAttendance({
      id: null,
      staff_id: staffId,
      attendance_date: dateString,
      clock_in_time: '',
      clock_out_time: '',
      break_minutes: 60,
      status: 'completed',
      notes: '',
    })
    setShowEditModal(true)
  }

  // 保存
  const handleSave = async () => {
    if (!editingAttendance) return

    setProcessing(true)
    try {
      const url = editingAttendance.id
        ? `/api/staff-attendances/${editingAttendance.id}`
        : '/api/staff-attendances'
      const method = editingAttendance.id ? 'PUT' : 'POST'

      // 時刻をISO形式に変換
      const clockInAt = editingAttendance.clock_in_time
        ? `${editingAttendance.attendance_date}T${editingAttendance.clock_in_time}:00`
        : null
      const clockOutAt = editingAttendance.clock_out_time
        ? `${editingAttendance.attendance_date}T${editingAttendance.clock_out_time}:00`
        : null

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: editingAttendance.staff_id,
          attendance_date: editingAttendance.attendance_date,
          clock_in_at: clockInAt,
          clock_out_at: clockOutAt,
          break_minutes: editingAttendance.break_minutes || 0,
          status: editingAttendance.status,
          notes: editingAttendance.notes || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setShowEditModal(false)
      fetchData()
    } catch (err) {
      alert('保存に失敗しました: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // CSVエクスポート
  const handleExportCSV = async () => {
    try {
      let url = `/api/staff-attendances/summary?year=${selectedYear}&month=${selectedMonth}&format=csv`
      if (selectedStaffId) {
        url += `&staff_id=${selectedStaffId}`
      }
      const res = await fetch(url)
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `勤怠一覧_${selectedYear}年${selectedMonth}月.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      alert('エクスポートに失敗しました')
    }
  }

  // スタッフをフィルタリング
  const filteredStaff = staff.filter(s => {
    // 勤怠管理対象外はスキップ
    if (s.attendance_tracking === false) {
      return false
    }
    // 会社役員（executive）はシステム管理者のみ表示
    if (s.employment_type === 'executive' && !isAdmin) {
      return false
    }
    if (!searchTerm) return true
    return s.name.includes(searchTerm) || (s.employee_number || '').includes(searchTerm)
  })

  // 特定スタッフ・日付の勤怠を取得
  const getAttendance = (staffId, dateString) => {
    return attendances.find(
      a => a.staff_id === staffId && a.attendance_date === dateString
    )
  }

  const days = getDaysInMonth()

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white flex items-center gap-2">
            <Clock className="w-7 h-7" />
            スタッフ勤怠管理
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            スタッフの出退勤記録（Money Forwardクラウド連携用）
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            連携ガイド
            {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSVエクスポート
          </button>
        </div>
      </div>

      {/* Money Forward連携ガイド */}
      {showHelp && (
        <div className="bg-gradient-to-r from-blue-900/30 to-violet-900/30 border border-blue-700/50 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-2">Money Forwardクラウド連携</h3>
              <p className="text-gray-300 text-sm mb-4">
                FLOLIAの勤怠データをMoney Forwardクラウド給与にインポートして、給与計算を行えます。
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">1</span>
                    <span className="text-white font-medium text-sm">勤怠を入力</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    スタッフの出退勤時刻を入力。QRコード打刻または手動入力が可能です。
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">2</span>
                    <span className="text-white font-medium text-sm">CSVエクスポート</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    月末に「CSVエクスポート」ボタンでデータをダウンロードします。
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">3</span>
                    <span className="text-white font-medium text-sm">Money Forwardへ取込</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Money Forwardクラウド給与の「勤怠データ取込」からCSVをインポート。
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                <h4 className="text-white font-medium text-sm mb-2">CSVに含まれるデータ</h4>
                <div className="flex flex-wrap gap-2">
                  {['従業員番号', '氏名', '日付', '出勤時刻', '退勤時刻', '実勤務時間', '残業時間', '深夜時間', '休日出勤'].map(item => (
                    <span key={item} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{item}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://biz.moneyforward.com/payroll/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                >
                  Money Forwardクラウド給与
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400 text-xs">
                  ※従業員番号をMoney Forwardと一致させてください
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* 月選択 */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="px-4 py-2 text-white font-medium min-w-[120px] text-center">
            {selectedYear}年{selectedMonth}月
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* スタッフ選択 */}
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">全スタッフ</option>
          {staff
            .filter(s => s.attendance_tracking !== false)
            .filter(s => isAdmin || s.employment_type !== 'executive')
            .map(s => (
              <option key={s.id} value={s.id}>
                {s.name} (No.{s.employee_number})
              </option>
            ))}
        </select>

        {/* 検索 */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="スタッフ名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 勤怠表 */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="sticky left-0 bg-gray-800 px-4 py-3 text-left text-gray-400 font-medium z-10">
                  スタッフ
                </th>
                {days.map(day => (
                  <th
                    key={day.date}
                    className={`px-2 py-3 text-center font-medium min-w-[80px] ${
                      day.dayOfWeek === 0 ? 'text-red-400' :
                      day.dayOfWeek === 6 ? 'text-blue-400' :
                      'text-gray-400'
                    }`}
                  >
                    <div>{day.date}</div>
                    <div className="text-xs">{dayNames[day.dayOfWeek]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredStaff.map(s => (
                <tr key={s.id} className="hover:bg-gray-750">
                  <td className="sticky left-0 bg-gray-800 px-4 py-2 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium text-xs">{s.name}</div>
                        <div className="text-gray-500 text-xs">No.{s.employee_number}</div>
                      </div>
                    </div>
                  </td>
                  {days.map(day => {
                    const attendance = getAttendance(s.id, day.dateString)
                    return (
                      <td
                        key={day.date}
                        className={`px-1 py-1 text-center ${
                          day.dayOfWeek === 0 ? 'bg-red-900/10' :
                          day.dayOfWeek === 6 ? 'bg-blue-900/10' : ''
                        }`}
                      >
                        {attendance ? (
                          <button
                            onClick={() => openEditModal(attendance)}
                            className="w-full p-1 rounded hover:bg-gray-700 transition-colors"
                          >
                            <div className={`text-xs px-1 py-0.5 rounded ${STATUS_LABELS[attendance.status]?.color || 'bg-gray-600'}`}>
                              {attendance.status === 'completed' ? (
                                <div className="text-white">
                                  <div>{formatTime(attendance.clock_in_at)}</div>
                                  <div>{formatTime(attendance.clock_out_at)}</div>
                                </div>
                              ) : attendance.status === 'working' ? (
                                <div className="text-white">
                                  <div>{formatTime(attendance.clock_in_at)}</div>
                                  <div className="text-blue-300">勤務中</div>
                                </div>
                              ) : (
                                <div className="text-white text-xs">
                                  {STATUS_LABELS[attendance.status]?.label}
                                </div>
                              )}
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => openNewModal(s.id, day.dateString)}
                            className="w-full h-full min-h-[40px] hover:bg-gray-700/50 rounded transition-colors text-gray-600 text-xs"
                          >
                            -
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* サマリー */}
      {selectedStaffId && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">月間サマリー</h3>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-gray-400">出勤日数</div>
              <div className="text-white font-medium">
                {attendances.filter(a => a.status === 'completed').length}日
              </div>
            </div>
            <div>
              <div className="text-gray-400">総勤務時間</div>
              <div className="text-white font-medium">
                {formatMinutes(attendances.reduce((sum, a) => sum + (a.actual_work_minutes || 0), 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-400">残業時間</div>
              <div className="text-yellow-400 font-medium">
                {formatMinutes(attendances.reduce((sum, a) => sum + (a.overtime_minutes || 0), 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-400">深夜時間</div>
              <div className="text-blue-400 font-medium">
                {formatMinutes(attendances.reduce((sum, a) => sum + (a.night_minutes || 0), 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-400">遅刻回数</div>
              <div className="text-red-400 font-medium">
                {attendances.filter(a => (a.late_minutes || 0) > 0).length}回
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && editingAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">
                勤怠を{editingAttendance.id ? '編集' : '登録'}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-400">
                日付: {editingAttendance.attendance_date}
              </div>

              {/* ステータス */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ステータス</label>
                <select
                  value={editingAttendance.status}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="completed">完了</option>
                  <option value="working">勤務中</option>
                  <option value="absent">欠勤</option>
                  <option value="leave">休暇</option>
                </select>
              </div>

              {/* 出退勤時刻 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">出勤時刻</label>
                  <input
                    type="time"
                    value={editingAttendance.clock_in_time}
                    onChange={(e) => setEditingAttendance({ ...editingAttendance, clock_in_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">退勤時刻</label>
                  <input
                    type="time"
                    value={editingAttendance.clock_out_time}
                    onChange={(e) => setEditingAttendance({ ...editingAttendance, clock_out_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 休憩時間 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">休憩時間（分）</label>
                <input
                  type="number"
                  min="0"
                  value={editingAttendance.break_minutes || 0}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, break_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 備考 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">備考</label>
                <textarea
                  value={editingAttendance.notes || ''}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processing ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
