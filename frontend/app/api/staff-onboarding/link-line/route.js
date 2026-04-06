import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: スタッフのLINE連携（オンボーディング中）
export async function POST(request) {
  try {
    const body = await request.json()
    const { line_user_id, token } = body

    if (!line_user_id) {
      return badRequestResponse('LINE User IDが必要です')
    }

    if (!token) {
      return badRequestResponse('連携トークンが必要です')
    }

    const supabase = createAdminClient()

    // トークンから招待情報を検索
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .select('id, staff_id, status, expires_at')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return badRequestResponse('無効な連携トークンです')
    }

    // 招待の有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return badRequestResponse('招待リンクの有効期限が切れています')
    }

    // 招待が使用済みでないことを確認
    if (invitation.status === 'used') {
      return badRequestResponse('この招待リンクは既に使用されています')
    }

    // スタッフの存在確認
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, line_user_id, onboarding_status')
      .eq('id', invitation.staff_id)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフ情報が見つかりません')
    }

    // オンボーディングステータスの確認（契約署名済みであること）
    // invited, contract_signed のどちらでもLINE連携を許可
    if (!['invited', 'contract_signed'].includes(staff.onboarding_status)) {
      return badRequestResponse('先に契約書に署名してください')
    }

    // 既に別のスタッフに紐付いているLINE User IDかチェック
    const { data: existingLink } = await supabase
      .from('staff')
      .select('id, name')
      .eq('line_user_id', line_user_id)
      .neq('id', staff.id)
      .single()

    if (existingLink) {
      return badRequestResponse('このLINEアカウントは既に他のスタッフに紐付けられています')
    }

    // LINE User IDを更新（まずline_user_idだけ更新してみる）
    console.log('Updating staff:', staff.id, 'with line_user_id:', line_user_id)

    // Step 1: line_user_idのみ更新
    const { data: lineUpdateData, error: lineUpdateError } = await supabase
      .from('staff')
      .update({
        line_user_id: line_user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.id)
      .select()
      .single()

    console.log('Line user_id update result:', { lineUpdateData, lineUpdateError })

    if (lineUpdateError) {
      return internalErrorResponse('Line user_id update', lineUpdateError)
    }

    // Step 2: onboarding_statusを更新
    const { data: updateData, error: updateError } = await supabase
      .from('staff')
      .update({
        onboarding_status: 'line_linked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.id)
      .select()
      .single()

    console.log('Update result:', { updateData, updateError })

    if (updateError) {
      return internalErrorResponse('Staff LINE link', updateError)
    }

    // 更新が反映されたか確認
    if (!updateData || updateData.onboarding_status !== 'line_linked') {
      return internalErrorResponse('LINE連携の更新が反映されませんでした', new Error('Update did not reflect'))
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'staff',
      recordId: staff.id,
      oldData: { line_user_id: staff.line_user_id, onboarding_status: staff.onboarding_status },
      newData: { line_user_id: line_user_id, onboarding_status: 'line_linked' },
      request,
    })

    return okResponse({
      success: true,
      message: 'LINE連携が完了しました',
    })
  } catch (error) {
    return internalErrorResponse('Staff link-line', error)
  }
}
