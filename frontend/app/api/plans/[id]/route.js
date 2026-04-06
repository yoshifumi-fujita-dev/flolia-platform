import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 料金プラン詳細取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { id } = await params
    const supabase = adminSupabase

    const { data: plan, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!plan) {
      return notFoundResponse('プランが見つかりません')
    }

    return okResponse({ plan })
  } catch (error) {
    return internalErrorResponse('Get plan', error)
  }
}

// PUT: 料金プラン更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      price,
      billing_type,
      ticket_count,
      stripe_price_id,
      is_active,
      sort_order,
      store_id,
      // LP表示用フィールド
      lp_category,
      lp_note,
      name_en,
      lp_note_en,
      show_on_lp,
      lp_sort_order,
    } = body

    const supabase = adminSupabase

    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (billing_type !== undefined) updateData.billing_type = billing_type
    if (ticket_count !== undefined) updateData.ticket_count = ticket_count
    if (stripe_price_id !== undefined) updateData.stripe_price_id = stripe_price_id
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (store_id !== undefined) updateData.store_id = store_id || null
    // LP表示用フィールド
    if (lp_category !== undefined) updateData.lp_category = lp_category || null
    if (lp_note !== undefined) updateData.lp_note = lp_note || null
    if (name_en !== undefined) updateData.name_en = name_en || null
    if (lp_note_en !== undefined) updateData.lp_note_en = lp_note_en || null
    if (show_on_lp !== undefined) updateData.show_on_lp = show_on_lp
    if (lp_sort_order !== undefined) updateData.lp_sort_order = lp_sort_order

    const { data: plan, error } = await supabase
      .from('membership_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.PLANS])

    return okResponse({ plan })
  } catch (error) {
    return internalErrorResponse('Update plan', error)
  }
}

// DELETE: 料金プラン削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { id } = await params
    const supabase = adminSupabase

    const { error } = await supabase
      .from('membership_plans')
      .delete()
      .eq('id', id)

    if (error) throw error

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.PLANS])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Delete plan', error)
  }
}
