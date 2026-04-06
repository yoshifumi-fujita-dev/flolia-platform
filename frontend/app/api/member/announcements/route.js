import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 会員向けお知らせ一覧を取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = createAdminClient()

    // 公開中のお知らせを取得
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .or('target_audience.eq.all,target_audience.eq.members')
      .lte('published_at', new Date().toISOString())
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return okResponse({
      announcements: announcements || []
    })
  } catch (error) {
    return internalErrorResponse('Announcements fetch', error)
  }
}
