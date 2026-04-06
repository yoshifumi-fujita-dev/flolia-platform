import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { sendProductPurchaseStatement } from '@/lib/resend/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * GET: 未決済購入一覧を取得
 */
export async function GET(request) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const storeId = searchParams.get('store_id')
    const settlementMonth = searchParams.get('settlement_month')
    const memberId = searchParams.get('member_id')

    let query = supabase
      .from('product_purchases')
      .select(`
        id,
        member_id,
        store_id,
        product_name,
        product_price,
        quantity,
        total_amount,
        settlement_month,
        purchased_at,
        members (
          id,
          name,
          email,
          stripe_customer_id
        ),
        stores (
          id,
          name
        )
      `)
      .eq('status', 'unsettled')
      .order('member_id')
      .order('purchased_at')

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (settlementMonth) {
      query = query.eq('settlement_month', settlementMonth)
    }

    if (memberId) {
      query = query.eq('member_id', memberId)
    }

    const { data, error } = await query

    if (error) throw error

    // 会員ごとにグループ化
    const memberSummary = {}
    for (const purchase of data || []) {
      const mId = purchase.member_id
      if (!memberSummary[mId]) {
        memberSummary[mId] = {
          member: purchase.members,
          purchases: [],
          totalAmount: 0,
        }
      }
      memberSummary[mId].purchases.push(purchase)
      memberSummary[mId].totalAmount += purchase.total_amount
    }

    return okResponse({
      purchases: data,
      memberSummary: Object.values(memberSummary),
      totalCount: data?.length || 0,
      totalAmount: data?.reduce((sum, p) => sum + p.total_amount, 0) || 0,
    })
  } catch (error) {
    return internalErrorResponse('Settlement fetch', error)
  }
}

/**
 * POST: 会員ごとの手動決済
 */
export async function POST(request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    const { member_id, settlement_month } = body

    if (!member_id) {
      return badRequestResponse('会員IDは必須です')
    }

    // 対象の未決済購入を取得
    let query = supabase
      .from('product_purchases')
      .select(`
        id,
        product_name,
        product_price,
        quantity,
        total_amount,
        store_id,
        purchased_at
      `)
      .eq('member_id', member_id)
      .eq('status', 'unsettled')

    if (settlement_month) {
      query = query.eq('settlement_month', settlement_month)
    }

    const { data: purchases, error: fetchError } = await query.order('purchased_at')

    if (fetchError) throw fetchError

    if (!purchases || purchases.length === 0) {
      return badRequestResponse('未決済の購入がありません')
    }

    // 会員情報を取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, email, stripe_customer_id')
      .eq('id', member_id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    if (!member.stripe_customer_id) {
      return badRequestResponse('この会員はStripe顧客IDがありません')
    }

    // 合計金額
    const totalAmount = purchases.reduce((sum, p) => sum + p.total_amount, 0)
    const purchaseIds = purchases.map(p => p.id)

    // Stripeで会員のデフォルト支払い方法を取得
    const paymentMethods = await stripe.paymentMethods.list({
      customer: member.stripe_customer_id,
      type: 'card',
    })

    if (paymentMethods.data.length === 0) {
      return badRequestResponse('登録されたカードがありません')
    }

    const paymentMethodId = paymentMethods.data[0].id
    const targetMonth = settlement_month || format(new Date(), 'yyyy-MM')

    // PaymentIntentを作成して決済
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'jpy',
      customer: member.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        type: 'product_purchase_settlement',
        settlement_month: targetMonth,
        member_id: member_id,
        purchase_count: purchases.length.toString(),
      },
      description: `物販まとめ決済 ${targetMonth} (${purchases.length}件)`,
    })

    if (paymentIntent.status !== 'succeeded') {
      return badRequestResponse(`決済ステータス: ${paymentIntent.status}`)
    }

    const now = new Date().toISOString()
    const storeId = purchases.every(p => p.store_id === purchases[0].store_id)
      ? purchases[0].store_id
      : null

    await supabase.from('payments').insert({
      member_id: member_id,
      payment_type: 'merchandise',
      amount: totalAmount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'card',
      status: 'completed',
      description: `物販まとめ決済 ${targetMonth} (${purchases.length}件)`,
      store_id: storeId,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge,
    })

    // 購入レコードを更新
    await supabase
      .from('product_purchases')
      .update({
        status: 'completed',
        settled_at: now,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge,
      })
      .in('id', purchaseIds)

    // 明細メールを送信
    try {
      await sendProductPurchaseStatement({
        to: member.email,
        name: member.name,
        targetMonth,
        purchases: purchases.map(p => ({
          date: format(new Date(p.purchased_at), 'M/d', { locale: ja }),
          productName: p.product_name,
          quantity: p.quantity,
          price: p.product_price,
          amount: p.total_amount,
        })),
        totalAmount,
        cardLast4: paymentMethods.data[0].card?.last4 || '****',
        settledAt: format(new Date(), 'yyyy年M月d日', { locale: ja }),
      })
    } catch (emailError) {
      console.error('Failed to send statement email:', emailError)
      // メール送信失敗は致命的エラーにしない
    }

    return okResponse({
      success: true,
      message: '決済が完了しました',
      settlement: {
        member_id,
        member_name: member.name,
        purchase_count: purchases.length,
        total_amount: totalAmount,
        stripe_payment_intent_id: paymentIntent.id,
      },
    })
  } catch (error) {
    return internalErrorResponse('Settlement', error)
  }
}
