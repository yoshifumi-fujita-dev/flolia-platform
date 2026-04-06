'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Edit,
  Trash2,
  Clock,
  Wand2,
  Check,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

const SHIFT_TYPE_LABELS = {
  class: { label: 'クラス', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  free: { label: 'フリー', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  admin: { label: '事務', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  training: { label: '研修', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  other: { label: 'その他', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

export default function InstructorShiftsPage() {
  const { stores, selectedStoreId, setSelectedStoreId } = useStore()
  const [shifts, setShifts] = useState([])
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ビューモード
  const [viewMode, setViewMode] = useState('week') // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date())

  // モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  // フォームデータ
  const [formData, setFormData] = useState({
    instructor_id: '',
    store_id: '',
    shift_date: '',
    start_time: '',
    end_time: '',
    shift_type: 'class',
    notes: '',
    is_confirmed: false,
  })

  // 自動生成フォーム
  const [generateFormData, setGenerateFormData] = useState({
    store_id: '',
    date_from: '',
    date_to: '',
    overwrite: false,
  })

  // 期間の計算
  const getDateRange = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      return {
        start,
        end: addDays(start, 6),
        days: eachDayOfInterval({ start, end: addDays(start, 6) })
      }
    } else {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      return {
        start,
        end,
        days: eachDayOfInterval({ start, end })
      }
    }
  }

  const dateRange = getDateRange()

  // シフト取得
  const fetchShifts = async () => {
    if (!selectedStoreId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        store_id: selectedStoreId,
        date_from: format(dateRange.start, 'yyyy-MM-dd'),
        date_to: format(dateRange.end, 'yyyy-MM-dd'),
        limit: '500',
      })

      const res = await fetch(`/api/instructor-shifts?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setShifts(data.shifts || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // インストラクター取得
  const fetchInstructors = async () => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (selectedStoreId) {
        params.set('store_id', selectedStoreId)
      }

      const res = await fetch(`/api/instructors?${params}`)
      const data = await res.json()

      if (res.ok) {
        setInstructors(data.instructors || [])
      }
    } catch (err) {
      console.error('Failed to fetch instructors:', err)
    }
  }

  useEffect(() => {
    fetchInstructors()
  }, [selectedStoreId])

  useEffect(() => {
    fetchShifts()
  }, [selectedStoreId, currentDate, viewMode])

  // 日付変更
  const changeDate = (direction) => {
    const days = viewMode === 'week' ? 7 : 30
    setCurrentDate(prev => addDays(prev, direction * days))
  }

  // 日付のシフトを取得
  const getShiftsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return shifts.filter(s => s.shift_date === dateStr)
  }

  // モーダルを開く
  const openCreateModal = (date = null) => {
    setEditingShift(null)
    setFormData({
      instructor_id: '',
      store_id: selectedStoreId || '',
      shift_date: date ? format(date, 'yyyy-MM-dd') : '',
      start_time: '',
      end_time: '',
      shift_type: 'class',
      notes: '',
      is_confirmed: false,
    })
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const openEditModal = (shift) => {
    setEditingShift(shift)
    setFormData({
      instructor_id: shift.instructor_id,
      store_id: shift.store_id,
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      shift_type: shift.shift_type,
      notes: shift.notes || '',
      is_confirmed: shift.is_confirmed,
    })
    setIsModalOpen(true)
  }

  // シフト保存
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingShift
        ? `/api/instructor-shifts/${editingShift.id}`
        : '/api/instructor-shifts'
      const method = editingShift ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setIsModalOpen(false)
      fetchShifts()
    } catch (err) {
      alert(err.message)
    }
  }

  // シフト削除
  const handleDelete = async (shift) => {
    if (!confirm(`${shift.instructor?.name}のシフトを削除しますか？`)) return

    try {
      const res = await fetch(`/api/instructor-shifts/${shift.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      fetchShifts()
    } catch (err) {
      alert(err.message)
    }
  }

  // シフト自動生成
  const handleGenerate = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/instructor-shifts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateFormData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      alert(data.message)
      setIsGenerateModalOpen(false)
      fetchShifts()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white flex items-center gap-2">
            <Calendar className="w-7 h-7" />
            シフト管理
          </h1>
          <p className="text-sm text-gray-400 mt-1">インストラクターのシフトを管理します</p>
        </div>

        <div className="flex items-center gap-3">
          {/* 自動生成ボタン */}
          <button
            onClick={() => {
              setGenerateFormData({
                store_id: selectedStoreId || '',
                date_from: format(dateRange.start, 'yyyy-MM-dd'),
                date_to: format(dateRange.end, 'yyyy-MM-dd'),
                overwrite: false,
              })
              setIsGenerateModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            自動生成
          </button>

          {/* 新規追加ボタン */}
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            シフト追加
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 flex-wrap">
        {/* 店舗選択 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">店舗:</span>
          <select
            value={selectedStoreId || ''}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white"
          >
            <option value="">全店舗</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>

        {/* ビュー切替 */}
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'week' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            週間
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'month' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            月間
          </button>
        </div>

        {/* 日付ナビゲーション */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>

          <span className="text-white font-medium min-w-[150px] text-center">
            {viewMode === 'week'
              ? `${format(dateRange.start, 'M/d', { locale: ja })} 〜 ${format(dateRange.end, 'M/d', { locale: ja })}`
              : format(currentDate, 'yyyy年M月', { locale: ja })
            }
          </span>

          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            今日
          </button>

          <button
            onClick={fetchShifts}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* カレンダー */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-700">
          {DAYS_OF_WEEK.map((day, index) => (
            <div
              key={day}
              className={`py-2 text-center text-sm font-medium ${
                index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">読み込み中...</div>
        ) : (
          <div className={`grid grid-cols-7 ${viewMode === 'month' ? 'divide-y divide-gray-700' : ''}`}>
            {dateRange.days.map((date, index) => {
              const dayShifts = getShiftsForDate(date)
              const dayOfWeek = date.getDay()
              const isCurrentMonth = viewMode === 'month' ? isSameMonth(date, currentDate) : true

              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-r border-gray-700 last:border-r-0 ${
                    !isCurrentMonth ? 'bg-gray-900/50' : ''
                  } ${isToday(date) ? 'bg-violet-900/20' : ''}`}
                >
                  {/* 日付 */}
                  <div className="flex items-center justify-between p-2 border-b border-gray-700/50">
                    <span className={`text-sm font-medium ${
                      !isCurrentMonth ? 'text-gray-600' :
                      dayOfWeek === 0 ? 'text-red-400' :
                      dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-300'
                    } ${isToday(date) ? 'bg-violet-600 text-white px-2 py-0.5 rounded' : ''}`}>
                      {format(date, 'd')}
                    </span>

                    {isCurrentMonth && (
                      <button
                        onClick={() => openCreateModal(date)}
                        className="p-1 hover:bg-gray-700 rounded opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* シフト一覧 */}
                  <div className="p-1 space-y-1 max-h-[200px] overflow-y-auto">
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        className={`px-2 py-1 rounded text-xs border cursor-pointer hover:opacity-80 ${
                          SHIFT_TYPE_LABELS[shift.shift_type]?.color || 'bg-gray-700 text-gray-300'
                        }`}
                        onClick={() => openEditModal(shift)}
                      >
                        <div className="flex items-center gap-1">
                          {shift.is_confirmed && <Check className="w-3 h-3" />}
                          <span className="font-medium truncate">{shift.instructor?.name}</span>
                        </div>
                        <div className="text-[10px] opacity-80">
                          {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {Object.entries(SHIFT_TYPE_LABELS).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded border ${color}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* シフト追加・編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {editingShift ? 'シフト編集' : 'シフト追加'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* インストラクター */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  インストラクター <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">選択してください</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>

              {/* 店舗 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  店舗 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">選択してください</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              {/* 日付 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  日付 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.shift_date}
                  onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              {/* 時間 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    開始時刻 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    終了時刻 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* シフト種別 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  シフト種別
                </label>
                <select
                  value={formData.shift_type}
                  onChange={(e) => setFormData({ ...formData, shift_type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {Object.entries(SHIFT_TYPE_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 備考 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  備考
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
                />
              </div>

              {/* 確定フラグ */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_confirmed"
                  checked={formData.is_confirmed}
                  onChange={(e) => setFormData({ ...formData, is_confirmed: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-600"
                />
                <label htmlFor="is_confirmed" className="text-sm text-gray-300">
                  確定済み
                </label>
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                {editingShift && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editingShift)
                      setIsModalOpen(false)
                    }}
                    className="px-4 py-2 border border-red-600 text-red-400 rounded-lg hover:bg-red-600/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  {editingShift ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 自動生成モーダル */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsGenerateModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-2 flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              シフト自動生成
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              クラススケジュールから自動的にシフトを生成します
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* 店舗 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  店舗 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={generateFormData.store_id}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, store_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">選択してください</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              {/* 期間 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    開始日 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={generateFormData.date_from}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, date_from: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    終了日 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={generateFormData.date_to}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, date_to: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* 上書きフラグ */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overwrite"
                  checked={generateFormData.overwrite}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, overwrite: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-600"
                />
                <label htmlFor="overwrite" className="text-sm text-gray-300">
                  既存のクラスシフトを上書きする
                </label>
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center justify-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  生成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
