import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, conflictResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      // 基本情報
      last_name,
      first_name,
      last_name_kana,
      first_name_kana,
      birth_date,
      gender,
      phone,
      email,
      // 住所
      postal_code,
      address,
      // 緊急連絡先
      emergency_name,
      emergency_phone,
      emergency_relationship,
      // その他
      medical_history,
      referral_source,
      goals,
      exercise_experience,
      // プラン
      plan,
      // 認証情報
      email_verified_at,
      phone_verified_at,
      // 同意情報
      agree_terms,
      agree_privacy,
      agree_disclaimer,
      agreed_at,
      // 店舗ID（店舗別登録の場合）
      store_id,
      // LINE連携情報
      line_user_id,
      line_display_name,
    } = body

    // デバッグログ
    console.log('Registration data received:', { last_name, first_name, email, plan, store_id, line_user_id })

    // 必須フィールドの検証
    if (!last_name || !first_name || !last_name_kana || !first_name_kana || !phone || !email) {
      return badRequestResponse('基本情報の必須項目を入力してください')
    }

    // 住所・緊急連絡先の必須検証
    if (!postal_code || !address) {
      return badRequestResponse('郵便番号と住所を入力してください')
    }

    if (!emergency_name || !emergency_phone || !emergency_relationship) {
      return badRequestResponse('緊急連絡先を入力してください')
    }

    // メール形式の検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return badRequestResponse('メールアドレスの形式が正しくありません')
    }

    const supabase = createAdminClient()

    // メール重複チェック
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .single()

    if (existingMember) {
      return conflictResponse('このメールアドレスは既に登録されています')
    }

    // 会員登録（pending状態で作成）
    const fullName = `${last_name} ${first_name}`
    console.log('Inserting member with name:', fullName)

    const { data: member, error } = await supabase
      .from('members')
      .insert({
        // 既存スキーマとの互換性のため name も設定
        name: fullName,
        last_name,
        first_name,
        last_name_kana,
        first_name_kana,
        birth_date: birth_date || null,
        gender: gender || null,
        phone,
        email,
        postal_code: postal_code || null,
        address: address || null,
        emergency_name: emergency_name || null,
        emergency_phone: emergency_phone || null,
        emergency_relationship: emergency_relationship || null,
        medical_history: medical_history || null,
        referral_source: referral_source || null,
        goals: goals || null,
        exercise_experience: exercise_experience || null,
        plan: plan || null,
        status: 'pending', // 決済完了後にactiveに変更
        joined_at: new Date().toISOString().split('T')[0],
        // 認証記録
        email_verified_at: email_verified_at || null,
        phone_verified_at: phone_verified_at || null,
        // 同意記録
        agreed_at: agreed_at || new Date().toISOString(),
        agreement_flags: {
          terms: agree_terms || false,
          privacy: agree_privacy || false,
          disclaimer: agree_disclaimer || false,
        },
        // 店舗ID（店舗別登録の場合）
        store_id: store_id || null,
        // LINE連携情報
        line_user_id: line_user_id || null,
      })
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Member registration', error)
    }

    // アナリティクス: 会員登録完了イベントを記録
    try {
      // store_idからstore_slugを取得
      let storeSlug = null
      if (store_id) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('site_slug')
          .eq('id', store_id)
          .single()
        storeSlug = storeData?.site_slug
      }

      await supabase.from('analytics_events').insert({
        store_slug: storeSlug,
        name: 'member_registered',
        meta: { plan, member_id: member.id },
        member_id: member.id,
      })
    } catch (analyticsError) {
      console.error('Analytics event error:', analyticsError)
    }

    return okResponse({
      success: true,
      member: {
        id: member.id,
        member_number: member.member_number,
        email: member.email,
        name: `${member.last_name} ${member.first_name}`,
        qr_code_token: member.qr_code_token, // 会員証QRコード用トークン
      },
    }, 201)
  } catch (error) {
    return internalErrorResponse('Registration', error)
  }
}
