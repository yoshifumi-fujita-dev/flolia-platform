import { createAdminClient } from '@/lib/supabase/server'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: FAQ一覧取得（全店舗共通）
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('faqs')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: faqs, error } = await query

    if (error) {
      return internalErrorResponse('FAQs fetch', error)
    }

    return okResponse({ faqs })
  } catch (error) {
    return internalErrorResponse('FAQs API', error)
  }
}

// POST: FAQ新規作成
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      question,
      answer,
      is_active = true,
      display_order = 0,
    } = body

    if (!question || !answer) {
      return badRequestResponse('質問と回答は必須です')
    }

    const { data: faq, error } = await supabase
      .from('faqs')
      .insert({
        question,
        answer,
        is_active,
        display_order,
      })
      .select()
      .single()

    if (error) {
      return internalErrorResponse('FAQ create', error)
    }

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.FAQS])

    return okResponse({ faq }, 201)
  } catch (error) {
    return internalErrorResponse('FAQs POST', error)
  }
}
