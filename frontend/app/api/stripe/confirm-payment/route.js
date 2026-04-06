import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { memberId, planId } = body

    // 会員ステータスをactiveに更新
    const supabase = createAdminClient()

    // プランをDBから取得
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return badRequestResponse('無効なプランです')
    }

    // billing_typeに基づいてmembership_typeを決定
    let membershipType = 'monthly'
    if (plan.billing_type === 'ticket') {
      membershipType = 'ticket'
    } else if (plan.billing_type === 'one_time') {
      membershipType = 'visitor'
    }

    const { data, error } = await supabase
      .from('members')
      .update({
        status: 'active',
        membership_type: membershipType,
        plan: plan.name,
      })
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return okResponse({
      success: true,
      member: data,
    })
  } catch (error) {
    return internalErrorResponse('Payment confirmation', error)
  }
}
