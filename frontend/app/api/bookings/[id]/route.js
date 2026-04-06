import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, successResponse, badRequestResponse, notFoundResponse, internalErrorResponse, supabaseErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// 単一予約取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { id } = await params

    const { data: booking, error } = await adminSupabase
      .from('bookings')
      .select(`
        *,
        time_slots (
          start_time,
          end_time
        )
      `)
      .eq('id', id)
      .single()

    if (error) return notFoundResponse('予約が見つかりません')

    return okResponse({ booking })
  } catch (error) {
    return internalErrorResponse('Booking GET', error)
  }
}

// 予約更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const { id } = await params
    const body = await request.json()

    const updateData = {}
    if (body.status && ['confirmed', 'cancelled', 'completed'].includes(body.status)) {
      updateData.status = body.status
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('更新するデータがありません')
    }

    updateData.updated_at = new Date().toISOString()

    // 更新前のデータを取得（監査ログ用）
    const { data: oldBooking } = await adminSupabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    const { data: booking, error } = await adminSupabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return supabaseErrorResponse('Booking update', error, '予約の更新に失敗しました')

    await createAuditLog({
      action: 'update',
      tableName: 'bookings',
      recordId: id,
      oldData: oldBooking,
      newData: booking,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    return okResponse({ booking })
  } catch (error) {
    return internalErrorResponse('Booking PUT', error)
  }
}

// 予約削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const { id } = await params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldBooking } = await adminSupabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await adminSupabase.from('bookings').delete().eq('id', id)

    if (error) return supabaseErrorResponse('Booking delete', error, '予約の削除に失敗しました')

    await createAuditLog({
      action: 'delete',
      tableName: 'bookings',
      recordId: id,
      oldData: oldBooking,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Booking DELETE', error)
  }
}
