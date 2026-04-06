import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: 出勤打刻
export async function POST(request) {
  try {
    const { adminSupabase, staff: currentStaff } = await requireStaffSession()
    const body = await request.json()

    const {
      staff_id,
      store_id,
      method = 'manual', // 'qr' or 'manual'
      scheduled_start,
      scheduled_end,
    } = body

    // スタッフIDが指定されていない場合は、ログイン中のスタッフを使用
    const targetStaffId = staff_id || currentStaff.id

    // バリデーション
    if (!store_id) {
      return badRequestResponse('店舗IDは必須です')
    }

    // スタッフ確認
    const { data: staff, error: staffError } = await adminSupabase
      .from('staff')
      .select('id, name, is_active')
      .eq('id', targetStaffId)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフが見つかりません')
    }

    if (!staff.is_active) {
      return badRequestResponse('このスタッフは無効化されています')
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // 本日の勤怠記録が既にあるかチェック
    const { data: existing } = await adminSupabase
      .from('staff_attendances')
      .select('id, status, clock_in_at')
      .eq('staff_id', targetStaffId)
      .eq('attendance_date', today)
      .single()

    if (existing) {
      if (existing.clock_in_at) {
        return badRequestResponse('本日は既に出勤打刻されています')
      }

      // 既存レコードを更新（事前に作成されていた場合）
      const { data, error } = await adminSupabase
        .from('staff_attendances')
        .update({
          clock_in_at: now.toISOString(),
          clock_in_method: method,
          status: 'working',
        })
        .eq('id', existing.id)
        .select(`
          *,
          staff:staff_id(id, name, email, employee_number),
          store:store_id(id, name)
        `)
        .single()

      if (error) throw error

      await createAuditLog({
        action: 'update',
        tableName: 'staff_attendances',
        recordId: data.id,
        oldData: existing,
        newData: data,
        request,
      })

      return okResponse({
        attendance: data,
        message: `${staff.name}さんの出勤を記録しました`,
      })
    }

    // 新規作成
    const { data, error } = await adminSupabase
      .from('staff_attendances')
      .insert({
        staff_id: targetStaffId,
        store_id,
        attendance_date: today,
        clock_in_at: now.toISOString(),
        clock_in_method: method,
        scheduled_start: scheduled_start || null,
        scheduled_end: scheduled_end || null,
        status: 'working',
      })
      .select(`
        *,
        staff:staff_id(id, name, email, employee_number),
        store:store_id(id, name)
      `)
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'create',
      tableName: 'staff_attendances',
      recordId: data.id,
      newData: data,
      request,
    })

    return okResponse({
      attendance: data,
      message: `${staff.name}さんの出勤を記録しました`,
    }, 201)
  } catch (error) {
    return internalErrorResponse('Staff clock-in', error)
  }
}
