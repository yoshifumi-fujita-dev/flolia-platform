import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員のプラン契約履歴を取得
 * GET /api/members/[id]/plans
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // 会員の存在確認
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    // プラン契約履歴を取得
    const { data: plans, error: plansError } = await supabase
      .from('member_plans')
      .select(`
        *,
        membership_plan:membership_plans(id, name, price, billing_type, ticket_count)
      `)
      .eq('member_id', id)
      .order('started_at', { ascending: false })

    if (plansError) {
      return internalErrorResponse('Fetch member plans', plansError)
    }

    return okResponse({ plans })
  } catch (error) {
    return internalErrorResponse('Fetch member plans', error)
  }
}

/**
 * 会員にプラン契約を追加
 * POST /api/members/[id]/plans
 *
 * リクエストボディ:
 * {
 *   membership_plan_id: string,  // プランID
 *   started_at?: string,         // 開始日 (YYYY-MM-DD)
 *   notes?: string               // 備考
 * }
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { membership_plan_id, started_at, notes } = body

    // バリデーション
    if (!membership_plan_id) {
      return badRequestResponse('プランを選択してください')
    }

    const supabase = createAdminClient()

    // 会員の存在確認
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    // プランの存在確認
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, name, billing_type, ticket_count')
      .eq('id', membership_plan_id)
      .single()

    if (planError || !plan) {
      return notFoundResponse('プランが見つかりません')
    }

    // 契約データを構築
    const insertData = {
      member_id: id,
      membership_plan_id: membership_plan_id,
      status: 'active',
      started_at: started_at || new Date().toISOString(),
      notes: notes || null,
    }

    // 回数券の場合は回数を設定
    if (plan.billing_type === 'ticket' && plan.ticket_count) {
      insertData.ticket_total = plan.ticket_count
      insertData.ticket_remaining = plan.ticket_count
    }

    // プラン契約を作成
    const { data: newPlan, error: insertError } = await supabase
      .from('member_plans')
      .insert(insertData)
      .select(`
        *,
        membership_plan:membership_plans(id, name, price, billing_type, ticket_count)
      `)
      .single()

    if (insertError) {
      return internalErrorResponse('Create member plan', insertError)
    }

    return okResponse({
      message: 'プラン契約を追加しました',
      plan: newPlan,
    }, 201)
  } catch (error) {
    return internalErrorResponse('Create member plan', error)
  }
}
