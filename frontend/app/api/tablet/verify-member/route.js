import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員本人確認API（タブレット用）
 * POST /api/tablet/verify-member
 *
 * 会員番号とメールアドレスで本人確認を行う
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { member_number, email } = body

    // バリデーション
    if (!member_number || !email) {
      return badRequestResponse('会員番号とメールアドレスを入力してください')
    }

    const supabase = createAdminClient()

    // 会員検索（会員番号とメールアドレスの一致を確認）
    const { data: member, error } = await supabase
      .from('members')
      .select('id, name, email, member_number, status, membership_type, stripe_subscription_id')
      .eq('member_number', parseInt(member_number, 10))
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !member) {
      return notFoundResponse('会員情報が見つかりません。会員番号とメールアドレスをご確認ください。')
    }

    // 本人確認成功
    return okResponse({
      member: {
        id: member.id,
        name: member.name,
        member_number: member.member_number,
        status: member.status,
        membership_type: member.membership_type,
      },
    })
  } catch (error) {
    return internalErrorResponse('Verify member', error)
  }
}
