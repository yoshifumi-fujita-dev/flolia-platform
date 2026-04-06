import { revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

// POST: キャッシュを無効化（内部API）
export async function POST(request) {
  try {
    const { error: sessionError } = await requireStaffSession()
    if (sessionError === 'unauthenticated') {
      return unauthorizedResponse('認証が必要です')
    }

    const { tags } = await request.json()

    if (!tags || !Array.isArray(tags)) {
      return badRequestResponse('tags配列が必要です')
    }

    // 有効なタグのみ処理
    const validTags = Object.values(CACHE_TAGS)
    const invalidatedTags = []

    for (const tag of tags) {
      if (validTags.includes(tag)) {
        revalidateTag(tag)
        invalidatedTags.push(tag)
        console.log(`Cache revalidated: ${tag}`)
      }
    }

    return okResponse({
      success: true,
      invalidatedTags,
    })
  } catch (error) {
    return internalErrorResponse('Revalidate API', error)
  }
}
