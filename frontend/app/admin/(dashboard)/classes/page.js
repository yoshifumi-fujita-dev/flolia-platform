'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  RefreshCw,
  X,
  Plus,
  Clock,
  Users,
  Edit,
  Trash2,
  Upload,
  User,
  Loader2,
} from 'lucide-react'
import { useStore } from '@/lib/contexts/StoreContext'

const LEVEL_LABELS = {
  beginner: { label: '初級', color: 'bg-green-900/50 text-green-400' },
  intermediate: { label: '中級', color: 'bg-yellow-900/50 text-yellow-400' },
  advanced: { label: '上級', color: 'bg-red-900/50 text-red-400' },
  all: { label: '全レベル', color: 'bg-blue-900/50 text-blue-400' },
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function AdminClassesPage() {
  const { allStores } = useStore()

  const [classes, setClasses] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('schedule')

  // 店舗関連
  const [filterStoreId, setFilterStoreId] = useState('')

  // インストラクター一覧
  const [instructors, setInstructors] = useState([])

  // Class Modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [isEditingClass, setIsEditingClass] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)
  const [classFormData, setClassFormData] = useState({
    name: '',
    description: '',
    level: 'beginner',
    duration_minutes: 60,
    max_capacity: 10,
  })

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [scheduleFormData, setScheduleFormData] = useState({
    class_id: '',
    day_of_week: 1,
    start_time: '10:00',
    end_time: '11:00',
    instructor_id: '',
    instructor_name: '',
    max_capacity: 10,
    instructor_comment: '',
    instructor_image_url: '',
  })
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  // 店舗一覧から最初の店舗を自動選択
  useEffect(() => {
    if (allStores && allStores.length > 0 && !filterStoreId) {
      setFilterStoreId(allStores[0].id)
    }
  }, [allStores])

  const fetchAll = async () => {
    if (!filterStoreId) return

    setLoading(true)
    setError(null)

    try {
      const storeParam = `store_id=${filterStoreId}`
      const [classesRes, schedulesRes, instructorsRes] = await Promise.all([
        fetch(`/api/classes?include_inactive=true&${storeParam}`),
        fetch(`/api/schedules?${storeParam}`),
        fetch(`/api/instructors?${storeParam}`),
      ])

      const classesData = await classesRes.json()
      const schedulesData = await schedulesRes.json()
      const instructorsData = await instructorsRes.json()

      if (!classesRes.ok) throw new Error(classesData.error)
      if (!schedulesRes.ok) throw new Error(schedulesData.error)

      setClasses(classesData.classes || [])
      setSchedules(schedulesData.schedules || [])
      setInstructors(instructorsData.instructors || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (filterStoreId) {
      fetchAll()
    }
  }, [filterStoreId])

  // Class handlers
  const openCreateClassModal = () => {
    setIsEditingClass(false)
    setClassFormData({
      name: '',
      description: '',
      level: 'beginner',
      duration_minutes: 60,
      max_capacity: 10,
      store_id: filterStoreId,
    })
    setIsClassModalOpen(true)
  }

  const openEditClassModal = (cls) => {
    setIsEditingClass(true)
    setSelectedClass(cls)
    setClassFormData({
      name: cls.name,
      description: cls.description || '',
      level: cls.level,
      duration_minutes: cls.duration_minutes,
      max_capacity: cls.max_capacity,
      store_id: cls.store_id || filterStoreId,
    })
    setIsClassModalOpen(true)
  }

  const handleClassSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditingClass ? `/api/classes/${selectedClass.id}` : '/api/classes'
      const method = isEditingClass ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classFormData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setIsClassModalOpen(false)
      fetchAll()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteClass = async (id) => {
    if (!confirm('このクラスを削除してもよろしいですか？関連するスケジュールも削除されます。')) return

    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchAll()
    } catch (err) {
      alert(err.message)
    }
  }

  // Schedule handlers
  const openCreateScheduleModal = () => {
    setIsEditingSchedule(false)
    setScheduleFormData({
      class_id: classes[0]?.id || '',
      day_of_week: 1,
      start_time: '10:00',
      end_time: '11:00',
      instructor_id: '',
      instructor_name: '',
      max_capacity: 10,
      instructor_comment: '',
      instructor_image_url: '',
      store_id: filterStoreId,
    })
    setImagePreview(null)
    setIsScheduleModalOpen(true)
  }

  const openEditScheduleModal = (schedule) => {
    setIsEditingSchedule(true)
    setSelectedSchedule(schedule)
    setScheduleFormData({
      class_id: schedule.class_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
      instructor_id: schedule.instructor_id || '',
      instructor_name: schedule.instructor_name || '',
      max_capacity: schedule.max_capacity || 10,
      instructor_comment: schedule.instructor_comment || '',
      instructor_image_url: schedule.instructor_image_url || '',
      store_id: schedule.store_id || filterStoreId,
    })
    // インストラクターが選択されている場合はその画像を表示
    const selectedInstructor = instructors.find(i => i.id === schedule.instructor_id)
    setImagePreview(selectedInstructor?.image_url || schedule.instructor_image_url || null)
    setIsScheduleModalOpen(true)
  }

  // インストラクター選択時の処理
  const handleInstructorChange = (instructorId) => {
    const instructor = instructors.find(i => i.id === instructorId)
    if (instructor) {
      setScheduleFormData(prev => ({
        ...prev,
        instructor_id: instructor.id,
        instructor_name: instructor.name,
        instructor_image_url: instructor.image_url || '',
      }))
      setImagePreview(instructor.image_url || null)
    } else {
      setScheduleFormData(prev => ({
        ...prev,
        instructor_id: '',
        instructor_name: '',
        instructor_image_url: '',
      }))
      setImagePreview(null)
    }
  }

  // 画像アップロード処理
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('schedule_id', isEditingSchedule ? selectedSchedule.id : 'new')

      const res = await fetch('/api/upload/instructor-image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setScheduleFormData(prev => ({ ...prev, instructor_image_url: data.url }))
    } catch (err) {
      alert('画像のアップロードに失敗しました: ' + err.message)
      setImagePreview(scheduleFormData.instructor_image_url || null)
    } finally {
      setImageUploading(false)
    }
  }

  const handleImageRemove = () => {
    setScheduleFormData(prev => ({ ...prev, instructor_image_url: '' }))
    setImagePreview(null)
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = isEditingSchedule ? `/api/schedules/${selectedSchedule.id}` : '/api/schedules'
      const method = isEditingSchedule ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleFormData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setIsScheduleModalOpen(false)
      fetchAll()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteSchedule = async (id) => {
    if (!confirm('このスケジュールを削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchAll()
    } catch (err) {
      alert(err.message)
    }
  }

  // Group schedules by day of week
  const schedulesByDay = WEEKDAYS.map((_, index) => {
    return schedules.filter(s => s.day_of_week === index)
  })

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7" />
          クラス・スケジュール管理
        </h1>
        <p className="text-gray-400 mt-1">クラス設定と週間スケジュールの管理</p>
      </div>

      {/* Tabs & Store Filter */}
      <div className="bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-700 flex items-center justify-between px-4">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              週間スケジュール
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'classes'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              クラス種別
            </button>
          </nav>
          {/* 店舗フィルター */}
          <select
            value={filterStoreId}
            onChange={(e) => setFilterStoreId(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">店舗を選択</option>
            {(allStores || []).map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-gray-800 rounded-lg shadow-sm p-8 text-center text-gray-400">
          読み込み中...
        </div>
      ) : (
        <>
          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-medium text-white">週間スケジュール</h2>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    更新
                  </button>
                  <button
                    onClick={openCreateScheduleModal}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    スケジュール追加
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-gray-700">
                {WEEKDAYS.map((day, dayIndex) => (
                  <div key={dayIndex} className="min-h-[300px]">
                    <div className={`p-3 border-b border-gray-700 text-center font-medium ${
                      dayIndex === 0 ? 'text-red-400 bg-red-900/30' :
                      dayIndex === 6 ? 'text-blue-400 bg-blue-900/30' :
                      'text-gray-300 bg-gray-700/50'
                    }`}>
                      {day}曜日
                    </div>
                    <div className="p-2 space-y-2">
                      {schedulesByDay[dayIndex].length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">
                          クラスなし
                        </p>
                      ) : (
                        schedulesByDay[dayIndex].map((schedule) => (
                          <div
                            key={schedule.id}
                            className="p-2 bg-violet-900/30 rounded-lg border border-violet-700/50 text-xs"
                          >
                            <div className="font-medium text-violet-300">
                              {schedule.classes?.name}
                            </div>
                            <div className="text-violet-400 mt-1">
                              {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                            </div>
                            {schedule.instructor_name && (
                              <div className="text-gray-400 mt-1">
                                {schedule.instructor_name}
                              </div>
                            )}
                            <div className="flex gap-1 mt-2">
                              <button
                                onClick={() => openEditScheduleModal(schedule)}
                                className="p-1 hover:bg-violet-800/50 rounded"
                              >
                                <Edit className="w-3 h-3 text-violet-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="p-1 hover:bg-red-900/50 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-medium text-white">クラス種別一覧</h2>
                <button
                  onClick={openCreateClassModal}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  クラス追加
                </button>
              </div>

              {classes.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  クラスが登録されていません
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {classes.map((cls) => (
                    <div key={cls.id} className="p-4 hover:bg-gray-700/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-violet-900/50 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{cls.name}</h3>
                            {cls.description && (
                              <p className="text-sm text-gray-400 mt-1">{cls.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${LEVEL_LABELS[cls.level]?.color}`}>
                                {LEVEL_LABELS[cls.level]?.label}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                {cls.duration_minutes}分
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditClassModal(cls)}
                            className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </>
      )}

      {/* Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsClassModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-700">
            <button
              onClick={() => setIsClassModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditingClass ? 'クラス編集' : '新規クラス作成'}
            </h2>

            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  クラス名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={classFormData.description}
                  onChange={(e) => setClassFormData({ ...classFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  レベル
                </label>
                <select
                  value={classFormData.level}
                  onChange={(e) => setClassFormData({ ...classFormData, level: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="beginner">初級</option>
                  <option value="intermediate">中級</option>
                  <option value="advanced">上級</option>
                  <option value="all">全レベル</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    時間（分）
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={classFormData.duration_minutes}
                    onChange={(e) => setClassFormData({ ...classFormData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  {isEditingClass ? '更新' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsScheduleModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-700">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditingSchedule ? 'スケジュール編集' : 'スケジュール追加'}
            </h2>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  クラス <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={scheduleFormData.class_id}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, class_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">選択してください</option>
                  {classes.filter(c => c.is_active).map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  曜日 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={scheduleFormData.day_of_week}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={index} value={index}>{day}曜日</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    開始時間 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleFormData.start_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    終了時間 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleFormData.end_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  インストラクター
                </label>
                <div className="flex items-center gap-4">
                  {/* インストラクター画像プレビュー */}
                  <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  {/* インストラクター選択 */}
                  <select
                    value={scheduleFormData.instructor_id}
                    onChange={(e) => handleInstructorChange(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">選択してください</option>
                    {instructors.filter(i => i.is_active !== false).map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </option>
                    ))}
                  </select>
                </div>
                {instructors.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    インストラクターが登録されていません。先に従業員管理でインストラクターとして登録してください。
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  インストラクターからのコメント
                </label>
                <textarea
                  value={scheduleFormData.instructor_comment}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, instructor_comment: e.target.value })}
                  rows={3}
                  placeholder="例: 初心者の方も大歓迎！一緒に楽しく汗を流しましょう！"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  このクラスに対するインストラクターの意気込みや説明を入力してください
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  {isEditingSchedule ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
