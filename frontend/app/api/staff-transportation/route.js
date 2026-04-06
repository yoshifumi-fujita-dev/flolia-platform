import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: スタッフ交通費一覧取得
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const staffId = searchParams.get('staff_id')
    const storeId = searchParams.get('store_id')

    let query = supabase
      .from('staff_transportation')
      .select(`
        *,
        staff:staff_id(id, name, email),
        store:store_id(id, name)
      `)

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    return okResponse({ transportation: data })
  } catch (error) {
    return internalErrorResponse('Staff transportation fetch', error)
  }
}

// POST: スタッフ交通費設定（作成または更新）
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const { staff_id, store_id, fee, notes } = body

    if (!staff_id || !store_id) {
      return badRequestResponse('スタッフIDと店舗IDは必須です')
    }

    if (fee === undefined || fee < 0) {
      return badRequestResponse('交通費は0以上の数値を指定してください')
    }

    // upsert: 既存レコードがあれば更新、なければ作成
    const { data, error } = await supabase
      .from('staff_transportation')
      .upsert(
        {
          staff_id,
          store_id,
          fee: parseInt(fee),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'staff_id,store_id',
        }
      )
      .select(`
        *,
        staff:staff_id(id, name, email),
        store:store_id(id, name)
      `)
      .single()

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'upsert',
      tableName: 'staff_transportation',
      recordId: data.id,
      newData: data,
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    return okResponse({ transportation: data }, 201)
  } catch (error) {
    return internalErrorResponse('Staff transportation upsert', error)
  }
}

// DELETE: スタッフ交通費設定削除
export async function DELETE(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const id = searchParams.get('id')

    if (!id) {
      return badRequestResponse('IDは必須です')
    }

    // 既存データを取得（監査ログ用）
    const { data: existing } = await supabase
      .from('staff_transportation')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('staff_transportation')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 監査ログ記録
    if (existing) {
      await createAuditLog({
        action: 'delete',
        tableName: 'staff_transportation',
        recordId: id,
        oldData: existing,
        adminUser: {
          id: staff.id,
          role_id: staff.role_id,
        },
        request,
      })
    }

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Staff transportation delete', error)
  }
}
