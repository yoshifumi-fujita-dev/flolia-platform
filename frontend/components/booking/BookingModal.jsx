'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { X, ChevronLeft, Check, Calendar, Clock, User } from 'lucide-react'
import CalendarPicker from './CalendarPicker'
import TimeSlotSelector from './TimeSlotSelector'
import BookingForm from './BookingForm'

const STEPS = [
  { id: 'calendar', label: '日付選択', icon: Calendar },
  { id: 'time', label: '時間選択', icon: Clock },
  { id: 'form', label: 'お客様情報', icon: User },
  { id: 'confirmation', label: '完了', icon: Check },
]

export default function BookingModal({ isOpen, onClose, initialType = 'trial' }) {
  const [step, setStep] = useState('calendar')
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingType, setBookingType] = useState(initialType)
  const [isLoading, setIsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep('time')
  }

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot)
    setStep('form')
  }

  const handleFormSubmit = async (formData) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          booking_type: formData.bookingType,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          time_slot_id: selectedSlot.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '予約に失敗しました')
      }

      setBookingResult({
        ...formData,
        date: selectedDate,
        slot: selectedSlot,
      })
      setStep('confirmation')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'time') setStep('calendar')
    if (step === 'form') setStep('time')
  }

  const handleClose = () => {
    setStep('calendar')
    setSelectedDate(null)
    setSelectedSlot(null)
    setBookingResult(null)
    setError(null)
    onClose()
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === step)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {step !== 'calendar' && step !== 'confirmation' && (
              <button
                onClick={handleBack}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-medium">
              {step === 'confirmation' ? '予約完了' : '体験予約'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        {step !== 'confirmation' && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between">
              {STEPS.slice(0, 3).map((s, index) => {
                const Icon = s.icon
                const isActive = index === currentStepIndex
                const isCompleted = index < currentStepIndex

                return (
                  <div key={s.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center transition-all
                          ${isActive ? 'bg-violet-600 text-white' : ''}
                          ${isCompleted ? 'bg-violet-100 text-violet-600' : ''}
                          ${!isActive && !isCompleted ? 'bg-gray-100 text-gray-400' : ''}
                        `}
                      >
                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span className={`text-xs mt-1 ${isActive ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {index < 2 && (
                      <div
                        className={`w-16 h-0.5 mx-2 ${index < currentStepIndex ? 'bg-violet-300' : 'bg-gray-200'}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {step === 'calendar' && (
            <CalendarPicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          )}

          {step === 'time' && (
            <TimeSlotSelector
              date={selectedDate}
              bookingType={bookingType}
              selectedSlot={selectedSlot}
              onSlotSelect={handleSlotSelect}
            />
          )}

          {step === 'form' && (
            <div>
              {/* 選択内容サマリー */}
              <div className="mb-6 p-4 bg-violet-50 rounded-lg">
                <p className="text-sm text-violet-600 font-medium">選択中の日時</p>
                <p className="text-lg font-medium text-gray-900 mt-1">
                  {format(selectedDate, 'M月d日(E)', { locale: ja })} {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
                </p>
              </div>

              <BookingForm
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                initialType={bookingType}
              />
            </div>
          )}

          {step === 'confirmation' && bookingResult && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                ご予約ありがとうございます
              </h3>
              <p className="text-gray-600 mb-6">
                確認メールをお送りしました。<br />
                当日お会いできることを楽しみにしております。
              </p>

              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-900 mb-3">予約内容</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">日時</dt>
                    <dd className="text-gray-900">
                      {format(bookingResult.date, 'M月d日(E)', { locale: ja })} {bookingResult.slot.start_time.slice(0, 5)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">種別</dt>
                    <dd className="text-gray-900">
                      {bookingResult.bookingType === 'trial' ? '体験' : '見学'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">お名前</dt>
                    <dd className="text-gray-900">{bookingResult.name}</dd>
                  </div>
                </dl>
              </div>

              <button
                onClick={handleClose}
                className="mt-6 px-8 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
