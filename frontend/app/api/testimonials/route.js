import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: お客様の声一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('testimonials')
      .select('*, stores(id, name)')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: testimonials, error } = await query

    if (error) {
      return internalErrorResponse('Testimonials fetch', error)
    }

    return okResponse({ testimonials })
  } catch (error) {
    return internalErrorResponse('Testimonials API', error)
  }
}

// POST: お客様の声登録
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
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

    if (!store_id) {
      return badRequestResponse('店舗を選択してください')
    }

    if (!customer_name) {
      return badRequestResponse('お客様の名前は必須です')
    }

    const { data: testimonial, error } = await supabase
      .from('testimonials')
      .insert({
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
        is_featured: is_featured || false,
        is_active: is_active !== false,
        display_order: display_order || 0,
      })
      .select('*, stores(id, name)')
      .single()

    if (error) {
      return internalErrorResponse('Testimonial create', error)
    }

    return okResponse({ testimonial }, 201)
  } catch (error) {
    return internalErrorResponse('Testimonials POST', error)
  }
}
