import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 法務ページ取得（公開用）
export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('legal_pages')
      .select('title, content, updated_at')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('ページが見つかりません')
      }
      return internalErrorResponse('Legal page fetch', error)
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('Legal page', error)
  }
}
