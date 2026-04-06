import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: 退勤打刻
export async function POST(request) {
  try {
    const { adminSupabase, staff: currentStaff } = await requireStaffSession()
    const body = await request.json()

    const {
      staff_id,
      method = 'manual', // 'qr' or 'manual'
      break_minutes,
    } = body

    // スタッフIDが指定されていない場合は、ログイン中のスタッフを使用
    const targetStaffId = staff_id || currentStaff.id

    // スタッフ確認
    const { data: staff, error: staffError } = await adminSupabase
      .from('staff')
      .select('id, name, is_active')
      .eq('id', targetStaffId)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフが見つかりません')
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // 本日の勤務中の勤怠記録を取得
    const { data: existing, error: existingError } = await adminSupabase
      .from('staff_attendances')
      .select('*')
      .eq('staff_id', targetStaffId)
      .eq('attendance_date', today)
      .eq('status', 'working')
      .single()

    if (existingError || !existing) {
      return badRequestResponse('本日の出勤記録が見つかりません。先に出勤打刻をしてください。')
    }

    if (existing.clock_out_at) {
      return badRequestResponse('本日は既に退勤打刻されています')
    }

    // 退勤時刻を更新（トリガーで勤務時間が自動計算される）
    const updateData = {
      clock_out_at: now.toISOString(),
      clock_out_method: method,
    }

    // 休憩時間が指定されていれば更新
    if (break_minutes !== undefined) {
      updateData.break_minutes = break_minutes
    }

    const { data, error } = await adminSupabase
      .from('staff_attendances')
      .update(updateData)
      .eq('id', existing.id)
      .select(`
        *,
        staff:staff_id(id, name, email, employee_number),
        store:store_id(id, name)
      `)
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'update',
      tableName: 'staff_attendances',
      recordId: data.id,
      oldData: existing,
      newData: data,
      request,
    })

    // 勤務時間をフォーマット
    const workHours = Math.floor(data.actual_work_minutes / 60)
    const workMinutes = data.actual_work_minutes % 60

    return okResponse({
      attendance: data,
      message: `${staff.name}さんの退勤を記録しました（勤務時間: ${workHours}時間${workMinutes}分）`,
    })
  } catch (error) {
    return internalErrorResponse('Staff clock-out', error)
  }
}
