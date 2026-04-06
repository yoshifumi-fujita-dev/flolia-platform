import { revalidateTag } from 'next/cache'

// キャッシュタグ定義
export const CACHE_TAGS = {
  SCHEDULES: 'schedules',
  STORE: 'store',
  ANNOUNCEMENTS: 'announcements',
  PLANS: 'plans',
  INSTRUCTORS: 'instructors',
  FAQS: 'faqs',
  TESTIMONIALS: 'testimonials',
  FACILITIES: 'facilities',
  CLASSES: 'classes',
}

// キャッシュを無効化
export function invalidateCache(tag) {
  try {
    revalidateTag(tag)
    console.log(`Cache invalidated: ${tag}`)
  } catch (error) {
    console.error(`Failed to invalidate cache for ${tag}:`, error)
  }
}

// 複数のキャッシュを一括無効化
export function invalidateCaches(tags) {
  tags.forEach(tag => invalidateCache(tag))
}

// テーブル名からキャッシュタグを取得
export function getTagsForTable(tableName) {
  const tableTagMap = {
    class_schedules: [CACHE_TAGS.SCHEDULES],
    classes: [CACHE_TAGS.SCHEDULES, CACHE_TAGS.CLASSES],
    stores: [CACHE_TAGS.STORE, CACHE_TAGS.SCHEDULES, CACHE_TAGS.ANNOUNCEMENTS, CACHE_TAGS.PLANS],
    announcements: [CACHE_TAGS.ANNOUNCEMENTS],
    membership_plans: [CACHE_TAGS.PLANS],
    instructors: [CACHE_TAGS.INSTRUCTORS],
    faqs: [CACHE_TAGS.FAQS],
    testimonials: [CACHE_TAGS.TESTIMONIALS],
    facilities: [CACHE_TAGS.FACILITIES],
  }
  return tableTagMap[tableName] || []
}
