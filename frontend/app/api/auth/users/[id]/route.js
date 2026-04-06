import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// DELETE: ログインアカウントを削除（スタッフは残す）
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff: actorStaff } = await requireStaffSession()

    const { id } = await params
    const supabase = adminSupabase

    // スタッフ情報を取得
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフが見つかりません')
    }

    if (!staff.auth_user_id) {
      return badRequestResponse('このスタッフにはログインアカウントがありません')
    }

    // Supabase Authからユーザーを削除
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      staff.auth_user_id
    )

    if (authDeleteError) {
      return internalErrorResponse('Auth delete', authDeleteError)
    }

    // staffテーブルのauth_user_idをnullに更新
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        auth_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'auth_users',
      recordId: staff.auth_user_id,
      oldData: { staff_id: id, email: staff.email },
      adminUser: {
        id: actorStaff.id,
        role_id: actorStaff.role_id,
      },
      request,
    })

    return okResponse({
      success: true,
      message: 'ログインアカウントを削除しました',
    })
  } catch (error) {
    return internalErrorResponse('Delete auth user', error)
  }
}

// PUT: ログインアカウント情報を更新（有効/無効切り替えなど）
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff: actorStaff } = await requireStaffSession()

    const { id } = await params
    const supabase = adminSupabase
    const body = await request.json()

    const { is_active } = body

    // スタッフ情報を取得
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフが見つかりません')
    }

    if (!staff.auth_user_id) {
      return badRequestResponse('このスタッフにはログインアカウントがありません')
    }

    // Supabase Authユーザーを更新（ban_durationで無効化）
    if (typeof is_active === 'boolean') {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        staff.auth_user_id,
        {
          ban_duration: is_active ? 'none' : '876000h', // 100年 = 無期限BAN
        }
      )

      if (authUpdateError) {
        return internalErrorResponse('Auth update', authUpdateError)
      }

      // staffテーブルも更新
      await supabase
        .from('staff')
        .update({
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'auth_users',
      recordId: staff.auth_user_id,
      oldData: { is_active: staff.is_active },
      newData: { is_active },
      adminUser: {
        id: actorStaff.id,
        role_id: actorStaff.role_id,
      },
      request,
    })

    return okResponse({
      success: true,
      message: 'アカウントを更新しました',
    })
  } catch (error) {
    return internalErrorResponse('Update auth user', error)
  }
}
