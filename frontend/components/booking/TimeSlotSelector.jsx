'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Clock, Loader2 } from 'lucide-react'

export default function TimeSlotSelector({ date, bookingType, selectedSlot, onSlotSelect }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!date) return

    const fetchSlots = async () => {
      setLoading(true)
      setError(null)

      try {
        const dateStr = format(date, 'yyyy-MM-dd')
        const res = await fetch(`/api/slots?date=${dateStr}&type=${bookingType}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || '空き枠の取得に失敗しました')
        }

        setSlots(data.slots || [])
      } catch (err) {
        setError(err.message)
        setSlots([])
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [date, bookingType])

  if (!date) {
    return (
      <div className="text-center py-8 text-gray-500">
        日付を選択してください
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        <span className="ml-2 text-gray-600">空き枠を確認中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {format(date, 'M月d日(E)', { locale: ja })}は予約可能な枠がありません
        </p>
        <p className="text-sm text-gray-400 mt-2">
          別の日付をお選びください
        </p>
      </div>
    )
  }

  // 午前・午後でグループ分け
  const morningSlots = slots.filter(s => {
    const hour = parseInt(s.start_time.split(':')[0])
    return hour < 12
  })
  const afternoonSlots = slots.filter(s => {
    const hour = parseInt(s.start_time.split(':')[0])
    return hour >= 12
  })

  const renderSlotGroup = (groupSlots, title) => {
    if (groupSlots.length === 0) return null

    return (
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-500 mb-3">{title}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot?.id === slot.id
            const startTime = slot.start_time.slice(0, 5)
            const endTime = slot.end_time.slice(0, 5)

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => onSlotSelect(slot)}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all
                  ${isSelected
                    ? 'border-violet-600 bg-violet-50 text-violet-700'
                    : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                  }
                `}
              >
                <Clock className="w-4 h-4" />
                <span>{startTime} - {endTime}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-6">
        <p className="text-lg font-medium text-gray-900">
          {format(date, 'M月d日(E)', { locale: ja })}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          ご希望の時間帯をお選びください
        </p>
      </div>

      {renderSlotGroup(morningSlots, '午前')}
      {renderSlotGroup(afternoonSlots, '午後')}
    </div>
  )
}
