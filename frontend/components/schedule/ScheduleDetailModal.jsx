'use client'

import { X, Clock, User } from 'lucide-react'

const LEVEL_LABELS = {
  beginner: { label: '初級', color: 'bg-green-100 text-green-700' },
  intermediate: { label: '中級', color: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: '上級', color: 'bg-red-100 text-red-700' },
  all: { label: '全レベル', color: 'bg-blue-100 text-blue-700' },
}

export default function ScheduleDetailModal({ schedule, isOpen, onClose }) {
  if (!isOpen || !schedule) return null

  const classInfo = schedule.classes
  const level = LEVEL_LABELS[classInfo?.level] || LEVEL_LABELS.all

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full my-8 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header with gradient - shorter */}
        <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 pt-4 pb-14 px-6">
          {/* Empty space for instructor image overlay */}
        </div>

        {/* Instructor section - overlapping header */}
        <div className="relative -mt-12 mb-3 flex flex-col items-center">
          {/* Instructor Image - large */}
          <div className="w-24 h-24 rounded-full bg-white border-4 border-white flex items-center justify-center overflow-hidden shadow-lg">
            {schedule.instructor_image_url ? (
              <img
                src={schedule.instructor_image_url}
                alt={schedule.instructor_name || 'Instructor'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                <User className="w-10 h-10 text-white/80" />
              </div>
            )}
          </div>

          {/* Instructor Name */}
          {schedule.instructor_name && (
            <p className="text-center text-gray-700 mt-2 text-sm font-medium">
              {schedule.instructor_name}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Class Info Card */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            {/* Class Name */}
            <h3 className="text-xl font-bold text-violet-900 text-center mb-3">
              {classInfo?.name}
            </h3>

            {/* Level & Duration */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className={`px-3 py-1 text-sm rounded-full font-medium ${level.color}`}>
                {level.label}
              </span>
              <span className="flex items-center gap-1 text-gray-600 text-sm">
                <Clock className="w-4 h-4" />
                {classInfo?.duration_minutes}分
              </span>
            </div>

            {/* Class Description */}
            {classInfo?.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">クラス内容</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {classInfo.description}
                </p>
              </div>
            )}

            {/* Instructor Comment */}
            {schedule.instructor_comment && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                <h4 className="text-sm font-medium text-violet-600 mb-2 flex items-center gap-1">
                  <span>💬</span> インストラクターより
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {schedule.instructor_comment}
                </p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
