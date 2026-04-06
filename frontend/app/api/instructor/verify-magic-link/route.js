import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { okResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: マジックリンクトークンを検証してセッションを作成
export async function POST(request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return badRequestResponse('トークンが指定されていません')
    }

    const supabase = createAdminClient()

    // トークンを検証
    const { data: magicLink, error: tokenError } = await supabase
      .from('instructor_magic_links')
      .select('*, instructors(id, name, is_active)')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !magicLink) {
      return unauthorizedResponse('トークンが無効または期限切れです')
    }

    if (!magicLink.instructors?.is_active) {
      return forbiddenResponse('このアカウントは無効です')
    }

    // トークンを使用済みにマーク
    await supabase
      .from('instructor_magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', magicLink.id)

    // インストラクターセッションを作成
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後

    const { error: sessionError } = await supabase
      .from('instructor_sessions')
      .insert({
        token: sessionToken,
        instructor_id: magicLink.instructor_id,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      return internalErrorResponse('Session save', sessionError)
    }

    // セッショントークンをCookieに保存
    const cookieStore = await cookies()
    cookieStore.set('instructor_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24時間
      path: '/',
    })

    return okResponse({
      success: true,
      instructor: {
        id: magicLink.instructors.id,
        name: magicLink.instructors.name,
      },
    })
  } catch (error) {
    return internalErrorResponse('Verify magic link', error)
  }
}
