import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      planId,
      memberData,
      memberId
    } = body

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

    // Stripe Customer作成
    const customer = await stripe.customers.create({
      email: memberData.email,
      name: `${memberData.last_name} ${memberData.first_name}`,
      phone: memberData.phone,
      metadata: {
        member_id: memberId,
        plan_id: planId,
      },
    })

    let clientSecret
    let paymentType

    if (plan.billing_type === 'monthly') {
      // 月額プランの場合: SetupIntent + Subscriptionを後で作成
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        metadata: {
          member_id: memberId,
          plan_id: planId,
        },
      })
      clientSecret = setupIntent.client_secret
      paymentType = 'setup'
    } else {
      // 一括払いの場合: PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: plan.price,
        currency: 'jpy',
        customer: customer.id,
        metadata: {
          member_id: memberId,
          plan_id: planId,
        },
      })
      clientSecret = paymentIntent.client_secret
      paymentType = 'payment'
    }

    // 会員レコードにStripe Customer IDを保存
    await supabase
      .from('members')
      .update({ stripe_customer_id: customer.id })
      .eq('id', memberId)

    return okResponse({
      clientSecret,
      customerId: customer.id,
      paymentType,
      planName: plan.name,
      amount: plan.price,
    })
  } catch (error) {
    return internalErrorResponse('Stripe API', error)
  }
}
