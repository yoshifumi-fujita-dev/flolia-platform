import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import {
  okResponse,
  successResponse,
  notFoundResponse,
  conflictResponse,
  internalErrorResponse,
  supabaseErrorResponse,
} from '@/lib/api-response'

// GET: 会員詳細取得
export async function GET(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return supabaseErrorResponse('Member fetch', error, '会員情報の取得に失敗しました')
    if (!member) return notFoundResponse('会員が見つかりません')

    return okResponse({ member })
  } catch (error) {
    return internalErrorResponse('Member GET', error)
  }
}

// PUT: 会員更新
export async function PUT(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const { name, email, phone, membership_type, status, joined_at, notes, store_id } = body

    // 更新前のデータを取得（監査ログ用）
    const { data: oldMember } = await supabase.from('members').select('*').eq('id', id).single()

    const { data: member, error } = await supabase
      .from('members')
      .update({
        name,
        email,
        phone,
        membership_type,
        status,
        joined_at,
        notes,
        store_id: store_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Member update error:', error)
      if (error.code === '23505') return conflictResponse('このメールアドレスは既に登録されています')
      return supabaseErrorResponse('Member update', error, '会員情報の更新に失敗しました')
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'members',
      recordId: id,
      oldData: maskSensitiveData(oldMember),
      newData: maskSensitiveData(member),
      request,
    })

    return okResponse({ member })
  } catch (error) {
    return internalErrorResponse('Member PUT', error)
  }
}

// DELETE: 会員削除
export async function DELETE(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldMember } = await supabase.from('members').select('*').eq('id', id).single()

    const { error } = await supabase.from('members').delete().eq('id', id)

    if (error) return supabaseErrorResponse('Member delete', error, '会員の削除に失敗しました')

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'members',
      recordId: id,
      oldData: maskSensitiveData(oldMember),
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Member DELETE', error)
  }
}
