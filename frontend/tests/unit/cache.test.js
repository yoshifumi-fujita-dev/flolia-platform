import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/cacheをモック
const mockRevalidateTag = vi.fn()
vi.mock('next/cache', () => ({
  revalidateTag: (...args) => mockRevalidateTag(...args),
}))

import { CACHE_TAGS, invalidateCache, invalidateCaches, getTagsForTable } from '@/lib/cache'

describe('キャッシュ ユーティリティ', () => {
  beforeEach(() => {
    mockRevalidateTag.mockReset()
  })

  describe('CACHE_TAGS', () => {
    it('全てのキャッシュタグが定義されている', () => {
      expect(CACHE_TAGS.SCHEDULES).toBe('schedules')
      expect(CACHE_TAGS.STORE).toBe('store')
      expect(CACHE_TAGS.ANNOUNCEMENTS).toBe('announcements')
      expect(CACHE_TAGS.PLANS).toBe('plans')
      expect(CACHE_TAGS.INSTRUCTORS).toBe('instructors')
      expect(CACHE_TAGS.FAQS).toBe('faqs')
      expect(CACHE_TAGS.TESTIMONIALS).toBe('testimonials')
      expect(CACHE_TAGS.FACILITIES).toBe('facilities')
      expect(CACHE_TAGS.CLASSES).toBe('classes')
    })
  })

  describe('invalidateCache', () => {
    it('revalidateTagを呼び出す', () => {
      invalidateCache('schedules')
      expect(mockRevalidateTag).toHaveBeenCalledWith('schedules')
    })

    it('revalidateTagがエラーでもクラッシュしない', () => {
      mockRevalidateTag.mockImplementation(() => { throw new Error('fail') })
      expect(() => invalidateCache('schedules')).not.toThrow()
    })
  })

  describe('invalidateCaches', () => {
    it('複数タグを一括で無効化する', () => {
      invalidateCaches(['schedules', 'store', 'plans'])
      expect(mockRevalidateTag).toHaveBeenCalledTimes(3)
      expect(mockRevalidateTag).toHaveBeenCalledWith('schedules')
      expect(mockRevalidateTag).toHaveBeenCalledWith('store')
      expect(mockRevalidateTag).toHaveBeenCalledWith('plans')
    })

    it('空配列では呼ばれない', () => {
      invalidateCaches([])
      expect(mockRevalidateTag).not.toHaveBeenCalled()
    })
  })

  describe('getTagsForTable', () => {
    it('class_schedules テーブルのタグを返す', () => {
      expect(getTagsForTable('class_schedules')).toEqual(['schedules'])
    })

    it('classes テーブルはスケジュールとクラスのタグを返す', () => {
      const tags = getTagsForTable('classes')
      expect(tags).toContain('schedules')
      expect(tags).toContain('classes')
    })

    it('stores テーブルは複数のタグを返す', () => {
      const tags = getTagsForTable('stores')
      expect(tags).toContain('store')
      expect(tags).toContain('schedules')
      expect(tags).toContain('announcements')
      expect(tags).toContain('plans')
    })

    it('announcements テーブルのタグを返す', () => {
      expect(getTagsForTable('announcements')).toEqual(['announcements'])
    })

    it('membership_plans テーブルのタグを返す', () => {
      expect(getTagsForTable('membership_plans')).toEqual(['plans'])
    })

    it('instructors テーブルのタグを返す', () => {
      expect(getTagsForTable('instructors')).toEqual(['instructors'])
    })

    it('faqs テーブルのタグを返す', () => {
      expect(getTagsForTable('faqs')).toEqual(['faqs'])
    })

    it('testimonials テーブルのタグを返す', () => {
      expect(getTagsForTable('testimonials')).toEqual(['testimonials'])
    })

    it('facilities テーブルのタグを返す', () => {
      expect(getTagsForTable('facilities')).toEqual(['facilities'])
    })

    it('未定義のテーブルは空配列を返す', () => {
      expect(getTagsForTable('unknown_table')).toEqual([])
      expect(getTagsForTable('members')).toEqual([])
      expect(getTagsForTable('payments')).toEqual([])
    })
  })
})
