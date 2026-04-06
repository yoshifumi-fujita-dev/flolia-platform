import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { okResponse, badRequestResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: マジックリンクを生成（LIFF用）
export async function POST(request) {
  try {
    const body = await request.json()
    const { line_user_id } = body

    if (!line_user_id) {
      return badRequestResponse('LINE User IDが必要です')
    }

    const supabase = createAdminClient()

    // スタッフをLINE User IDで検索
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, is_active, auth_user_id')
      .eq('line_user_id', line_user_id)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフが見つかりません。LINE連携が完了していない可能性があります。')
    }

    if (!staff.is_active) {
      return forbiddenResponse('このアカウントは無効化されています')
    }

    // Supabase Authアカウントが必要
    if (!staff.auth_user_id) {
      return badRequestResponse('パスワード設定が完了していません。オンボーディングを完了してください。')
    }

    // 古いマジックリンクを削除
    await supabase
      .from('staff_magic_links')
      .delete()
      .eq('staff_id', staff.id)

    // 新しいマジックリンクトークンを生成
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15分有効

    // マジックリンクを保存
    const { error: insertError } = await supabase
      .from('staff_magic_links')
      .insert({
        staff_id: staff.id,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      return internalErrorResponse('Magic link insert', insertError)
    }

    // リダイレクトURLを生成
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flolia.jp'
    const adminPath = process.env.ADMIN_SECRET_PATH || 'backoffice'
    const redirectUrl = `${appUrl}/${adminPath}/staff-login?token=${token}`

    return okResponse({
      success: true,
      redirect_url: redirectUrl,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    return internalErrorResponse('Staff magic-link API', error)
  }
}
