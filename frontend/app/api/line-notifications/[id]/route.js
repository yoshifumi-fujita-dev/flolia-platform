import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// LINE通知テンプレート詳細取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()

    const { id } = await params

    const supabase = adminSupabase

    const { data, error } = await supabase
      .from('line_notification_templates')
      .select(`
        *,
        line_notification_triggers (
          id,
          name,
          description,
          trigger_type
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return notFoundResponse('テンプレートが見つかりません')
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('LINE notification GET', error)
  }
}

// LINE通知テンプレート更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()

    const { id } = await params
    const body = await request.json()
    const {
      trigger_id,
      name,
      conditions,
      message_template,
      reward_name,
      reward_description,
      reward_valid_days,
      is_active,
      sort_order,
    } = body

    const supabase = adminSupabase

    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (trigger_id !== undefined) updateData.trigger_id = trigger_id
    if (name !== undefined) updateData.name = name
    if (conditions !== undefined) updateData.conditions = conditions
    if (message_template !== undefined) updateData.message_template = message_template
    if (reward_name !== undefined) updateData.reward_name = reward_name
    if (reward_description !== undefined) updateData.reward_description = reward_description
    if (reward_valid_days !== undefined) updateData.reward_valid_days = reward_valid_days
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data, error } = await supabase
      .from('line_notification_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Failed to update template', error)
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('LINE notification PUT', error)
  }
}

// LINE通知テンプレート削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()

    const { id } = await params

    const supabase = adminSupabase

    const { error } = await supabase
      .from('line_notification_templates')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Failed to delete template', error)
    }

    return successResponse()
  } catch (error) {
    return internalErrorResponse('LINE notification DELETE', error)
  }
}
