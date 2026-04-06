import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST(request) {
  try {
    const body = await request.json()
    const { setupIntentId, customerId, memberId, planId } = body

    const supabase = createAdminClient()

    // プランをDBから取得
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan || plan.billing_type !== 'monthly') {
      return badRequestResponse('無効なプランです')
    }

    // SetupIntentから支払い方法を取得
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    const paymentMethodId = setupIntent.payment_method

    // デフォルトの支払い方法として設定
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    // まずProductを作成（または既存のものを取得）
    let product
    const existingProducts = await stripe.products.search({
      query: `name:'${plan.name}'`,
    })

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: '月額会員プラン',
      })
    }

    // Priceを作成
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'jpy',
      recurring: {
        interval: 'month',
      },
    })

    // サブスクリプション作成
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: price.id,
        },
      ],
      default_payment_method: paymentMethodId,
      metadata: {
        member_id: memberId,
      },
    })

    // 会員レコードを更新
    await supabase
      .from('members')
      .update({
        stripe_subscription_id: subscription.id,
        status: 'active',
        membership_type: 'monthly',
      })
      .eq('id', memberId)

    return okResponse({
      success: true,
      subscriptionId: subscription.id,
    })
  } catch (error) {
    return internalErrorResponse('Subscription creation', error)
  }
}
