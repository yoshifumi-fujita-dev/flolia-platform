import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 法務ページ一覧取得
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('legal_pages')
      .select('id, slug, title, updated_at')
      .order('slug')

    if (error) {
      return internalErrorResponse('Legal pages fetch', error)
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('Legal pages', error)
  }
}
