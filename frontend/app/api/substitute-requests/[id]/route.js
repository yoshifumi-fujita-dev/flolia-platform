import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 代行募集詳細取得
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    const { data: substituteRequest, error } = await supabase
      .from('substitute_requests')
      .select(`
        *,
        class_schedules (
          id,
          start_time,
          end_time,
          day_of_week,
          classes (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('代行募集が見つかりません')
      }
      throw error
    }

    return okResponse({ substituteRequest })
  } catch (error) {
    return internalErrorResponse('Substitute request fetch', error)
  }
}

// PUT: 代行募集更新（代行確定など）
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params
    const body = await request.json()

    const {
      status,
      filled_by_instructor_id,
      reason,
    } = body

    // 更新前のデータを取得（監査ログ用）
    const { data: oldData } = await supabase
      .from('substitute_requests')
      .select('*')
      .eq('id', id)
      .single()

    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined) {
      updateData.status = status
    }

    if (filled_by_instructor_id !== undefined) {
      updateData.filled_by_instructor_id = filled_by_instructor_id || null
      if (filled_by_instructor_id) {
        updateData.filled_at = new Date().toISOString()
        updateData.status = 'filled'
      }
    }

    if (reason !== undefined) {
      updateData.reason = reason
    }

    const { data: substituteRequest, error } = await supabase
      .from('substitute_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Substitute request update', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'substitute_requests',
      recordId: id,
      oldData,
      newData: substituteRequest,
      adminUser: staff ? { id: staff.id, role_id: staff.role_id } : null,
      request,
    })

    return okResponse({ substituteRequest })
  } catch (error) {
    return internalErrorResponse('Substitute request PUT', error)
  }
}

// DELETE: 代行募集削除（キャンセル）
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldData } = await supabase
      .from('substitute_requests')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('substitute_requests')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Substitute request delete', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'substitute_requests',
      recordId: id,
      oldData,
      adminUser: staff ? { id: staff.id, role_id: staff.role_id } : null,
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Substitute request DELETE', error)
  }
}
