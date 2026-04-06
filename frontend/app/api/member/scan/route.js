import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { signMemberToken } from '@/lib/auth/member-token'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/member/scan
 * QRコードスキャン時の会員情報取得（会員メニュー用）
 */
export async function POST(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'member-scan',
      limit: 20,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'member-scan',
      limit,
      windowMs,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
        {
          status: 429,
          headers: { 'Retry-After': rate.retryAfter.toString() },
        }
      )
    }

    const { qr_token } = await request.json()

    if (!qr_token) {
      return badRequestResponse('QRトークンが指定されていません')
    }

    // UUID形式のバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(qr_token)) {
      return badRequestResponse('無効なQRコードです')
    }

    const supabase = createAdminClient()

    // QRトークンから会員を検索
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        first_name_kana,
        last_name_kana,
        status,
        membership_type,
        stripe_subscription_id,
        paused_from,
        paused_until,
        paused_reason
      `)
      .eq('qr_code_token', qr_token)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員情報が見つかりません。QRコードを確認してください。')
    }

    // 契約中のプラン情報を取得
    const { data: currentPlan } = await supabase
      .from('member_plans')
      .select(`
        id,
        status,
        started_at,
        membership_plans (
          id,
          name,
          price,
          billing_type
        )
      `)
      .eq('member_id', member.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let memberToken
    try {
      memberToken = signMemberToken(member.id)
    } catch (tokenError) {
      return internalErrorResponse('Member token sign', tokenError)
    }

    return okResponse({
      member: {
        id: member.id,
        member_number: member.member_number,
        first_name: member.first_name,
        last_name: member.last_name,
        first_name_kana: member.first_name_kana,
        last_name_kana: member.last_name_kana,
        status: member.status,
        membership_type: member.membership_type,
        paused_from: member.paused_from,
        paused_until: member.paused_until,
        paused_reason: member.paused_reason,
        name: `${member.last_name} ${member.first_name}`,
        name_kana: `${member.last_name_kana} ${member.first_name_kana}`,
        has_subscription: !!member.stripe_subscription_id,
      },
      currentPlan: currentPlan || null,
      memberToken,
    })
  } catch (error) {
    return internalErrorResponse('Member scan', error)
  }
}
