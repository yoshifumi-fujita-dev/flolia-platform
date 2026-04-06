import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// LINE通知テンプレート一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const triggerId = searchParams.get('trigger_id')
    const activeOnly = searchParams.get('active_only') === 'true'

    const supabase = adminSupabase

    let query = supabase
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
      .order('sort_order', { ascending: true })

    if (triggerId) {
      query = query.eq('trigger_id', triggerId)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return internalErrorResponse('Failed to fetch templates', error)
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('LINE notifications GET', error)
  }
}

// LINE通知テンプレート作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
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

    if (!trigger_id || !name || !message_template) {
      return badRequestResponse('トリガー、名前、メッセージは必須です')
    }

    const supabase = adminSupabase

    const { data, error } = await supabase
      .from('line_notification_templates')
      .insert({
        trigger_id,
        name,
        conditions: conditions || {},
        message_template,
        reward_name: reward_name || null,
        reward_description: reward_description || null,
        reward_valid_days: reward_valid_days || null,
        is_active: is_active ?? true,
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Failed to create template', error)
    }

    return okResponse(data, 201)
  } catch (error) {
    return internalErrorResponse('LINE notifications POST', error)
  }
}
