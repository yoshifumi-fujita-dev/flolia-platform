import { createAdminClient } from '@/lib/supabase/server'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: FAQ詳細取得
export async function GET(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { data: faq, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return internalErrorResponse('FAQ fetch', error)
    }

    if (!faq) {
      return notFoundResponse('FAQが見つかりません')
    }

    return okResponse({ faq })
  } catch (error) {
    return internalErrorResponse('FAQ GET', error)
  }
}

// PUT: FAQ更新
export async function PUT(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const {
      question,
      answer,
      is_active,
      display_order,
    } = body

    const updateData = {}
    if (question !== undefined) updateData.question = question
    if (answer !== undefined) updateData.answer = answer
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order

    const { data: faq, error } = await supabase
      .from('faqs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('FAQ update', error)
    }

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.FAQS])

    return okResponse({ faq })
  } catch (error) {
    return internalErrorResponse('FAQ PUT', error)
  }
}

// DELETE: FAQ削除
export async function DELETE(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('FAQ delete', error)
    }

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.FAQS])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('FAQ DELETE', error)
  }
}
