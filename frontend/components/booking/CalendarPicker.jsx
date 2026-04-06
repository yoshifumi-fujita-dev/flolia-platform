'use client'

import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isBefore, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarPicker({ selectedDate, onDateSelect, blockedDates = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const isDateBlocked = (date) => {
    return blockedDates.some(blocked => isSameDay(new Date(blocked), date))
  }

  const isDateDisabled = (date) => {
    // 当日以前は予約不可（翌日以降のみ予約可能）
    const tomorrow = addDays(today, 1)
    return isBefore(date, tomorrow) || isDateBlocked(date)
  }

  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day
        const isDisabled = isDateDisabled(cloneDay)
        const isSelected = selectedDate && isSameDay(cloneDay, selectedDate)
        const isToday = isSameDay(cloneDay, today)
        const isCurrentMonth = isSameMonth(cloneDay, monthStart)

        days.push(
          <button
            key={day.toString()}
            type="button"
            onClick={() => !isDisabled && onDateSelect(cloneDay)}
            disabled={isDisabled}
            className={`
              relative w-10 h-10 rounded-full text-sm font-medium transition-all
              ${!isCurrentMonth ? 'text-gray-300' : ''}
              ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-violet-100'}
              ${isSelected ? 'bg-violet-600 text-white hover:bg-violet-700' : ''}
              ${isToday && !isSelected ? 'ring-2 ring-violet-300' : ''}
            `}
          >
            {format(day, 'd')}
          </button>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      )
      days = []
    }

    return rows
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          disabled={isSameMonth(currentMonth, today)}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-medium text-gray-900">
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2
              ${index === 0 ? 'text-red-500' : ''}
              ${index === 6 ? 'text-blue-500' : ''}
              ${index > 0 && index < 6 ? 'text-gray-500' : ''}
            `}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="space-y-1">
        {renderDays()}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full ring-2 ring-violet-300"></div>
          <span>今日</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-violet-600"></div>
          <span>選択中</span>
        </div>
      </div>
    </div>
  )
}
