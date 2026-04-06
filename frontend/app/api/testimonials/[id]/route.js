import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, successResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 個別お客様の声取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = params

    const { data: testimonial, error } = await supabase
      .from('testimonials')
      .select('*, stores(id, name)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('お客様の声が見つかりません')
      }
      return internalErrorResponse('Testimonial fetch', error)
    }

    return okResponse({ testimonial })
  } catch (error) {
    return internalErrorResponse('Testimonial GET', error)
  }
}

// PUT: お客様の声更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = params
    const body = await request.json()

    const {
      store_id,
      customer_name,
      customer_age,
      customer_gender,
      customer_occupation,
      customer_image_url,
      trigger_reason,
      impression,
      message_to_prospects,
      membership_duration,
      is_featured,
      is_active,
      display_order,
    } = body

    const { data: testimonial, error } = await supabase
      .from('testimonials')
      .update({
        store_id,
        customer_name,
        customer_age,
        customer_gender,
        customer_occupation,
        customer_image_url,
        trigger_reason,
        impression,
        message_to_prospects,
        membership_duration,
        is_featured,
        is_active,
        display_order,
      })
      .eq('id', id)
      .select('*, stores(id, name)')
      .single()

    if (error) {
      return internalErrorResponse('Testimonial update', error)
    }

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.TESTIMONIALS])

    return okResponse({ testimonial })
  } catch (error) {
    return internalErrorResponse('Testimonial PUT', error)
  }
}

// DELETE: お客様の声削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = params

    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Testimonial delete', error)
    }

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.TESTIMONIALS])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Testimonial DELETE', error)
  }
}
