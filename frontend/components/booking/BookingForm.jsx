'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, User, Phone, Mail } from 'lucide-react'

const bookingSchema = z.object({
  name: z.string().min(1, 'お名前を入力してください'),
  phone: z.string()
    .min(1, '電話番号を入力してください')
    .regex(/^[0-9-]+$/, '電話番号の形式が正しくありません'),
  email: z.string()
    .min(1, 'メールアドレスを入力してください')
    .email('メールアドレスの形式が正しくありません'),
  bookingType: z.enum(['trial', 'tour'], {
    required_error: '種別を選択してください'
  }),
})

export default function BookingForm({ onSubmit, isLoading, initialType = 'trial' }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      bookingType: initialType,
    }
  })

  const bookingType = watch('bookingType')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 種別選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          種別 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`
              flex items-center justify-center px-4 py-3 rounded-lg border-2 cursor-pointer transition-all
              ${bookingType === 'trial'
                ? 'border-violet-600 bg-violet-50 text-violet-700'
                : 'border-gray-200 hover:border-violet-300'
              }
            `}
          >
            <input
              type="radio"
              value="trial"
              {...register('bookingType')}
              className="sr-only"
            />
            <span className="font-medium">体験</span>
          </label>
          <label
            className={`
              flex items-center justify-center px-4 py-3 rounded-lg border-2 cursor-pointer transition-all
              ${bookingType === 'tour'
                ? 'border-violet-600 bg-violet-50 text-violet-700'
                : 'border-gray-200 hover:border-violet-300'
              }
            `}
          >
            <input
              type="radio"
              value="tour"
              {...register('bookingType')}
              className="sr-only"
            />
            <span className="font-medium">見学</span>
          </label>
        </div>
        {errors.bookingType && (
          <p className="mt-1 text-sm text-red-500">{errors.bookingType.message}</p>
        )}
      </div>

      {/* お名前 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          お名前 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="山田 花子"
            {...register('name')}
            className={`
              w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500
              ${errors.name ? 'border-red-500' : 'border-gray-300'}
            `}
          />
        </div>
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* 電話番号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          電話番号 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            placeholder="090-1234-5678"
            {...register('phone')}
            className={`
              w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500
              ${errors.phone ? 'border-red-500' : 'border-gray-300'}
            `}
          />
        </div>
        {errors.phone && (
          <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>

      {/* メールアドレス */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="example@email.com"
            {...register('email')}
            className={`
              w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500
              ${errors.email ? 'border-red-500' : 'border-gray-300'}
            `}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-violet-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            予約を送信中...
          </>
        ) : (
          '予約を確定する'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        ※ 送信後、確認メールをお送りします
      </p>
    </form>
  )
}
