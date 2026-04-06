import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { okResponse, badRequestResponse, notFoundResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: インストラクター用マジックリンクトークンを生成
export async function POST(request) {
  try {
    const { instructorId, lineUserId } = await request.json()

    if (!instructorId || !lineUserId) {
      return badRequestResponse('インストラクターIDとLINE User IDが必要です')
    }

    const supabase = createAdminClient()

    // インストラクターを検証
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('id, name, is_active, line_user_id')
      .eq('id', instructorId)
      .eq('line_user_id', lineUserId)
      .single()

    if (instructorError || !instructor) {
      return notFoundResponse('インストラクターが見つかりません')
    }

    if (!instructor.is_active) {
      return forbiddenResponse('このアカウントは無効です')
    }

    // マジックリンクトークンを生成（15分有効）
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15分後

    // トークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('instructor_magic_links')
      .insert({
        token,
        instructor_id: instructorId,
        expires_at: expiresAt.toISOString(),
      })

    if (tokenError) {
      return internalErrorResponse('Token save', tokenError)
    }

    // 管理画面のURLを生成
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flolia.jp'
    const redirectUrl = `${baseUrl}/admin/instructor-login?token=${token}`

    return okResponse({ redirectUrl })
  } catch (error) {
    return internalErrorResponse('Magic link', error)
  }
}
