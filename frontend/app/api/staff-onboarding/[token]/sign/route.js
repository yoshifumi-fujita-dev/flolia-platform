import { createClient } from '@supabase/supabase-js'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// Service Role クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST: 契約書への署名
export async function POST(request, { params }) {
  try {
    const { token } = await params
    const body = await request.json()
    const { signature_image, signature_typed_name, contract_template_id } = body

    // IPアドレスとUser-Agentを取得
    const forwarded = request.headers.get('x-forwarded-for')
    const ip_address = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
    const user_agent = request.headers.get('user-agent') || 'unknown'

    // 招待トークンを検証
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .select('*, staff:staff_id(*)')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return notFoundResponse('無効な招待リンクです')
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return badRequestResponse('招待リンクの有効期限が切れています')
    }

    // 契約書テンプレートの存在確認
    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', contract_template_id)
      .single()

    if (templateError || !template) {
      return notFoundResponse('契約書テンプレートが見つかりません')
    }

    // 署名画像をStorageにアップロード（Base64の場合）
    let signature_image_url = null
    if (signature_image && signature_image.startsWith('data:image')) {
      const base64Data = signature_image.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const fileName = `${invitation.staff_id}/${Date.now()}_signature.png`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('staff-signatures')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadError) {
        console.error('Signature upload error:', uploadError)
        // アップロード失敗してもBase64として保存続行
        signature_image_url = signature_image
      } else {
        const { data: publicUrl } = supabase.storage
          .from('staff-signatures')
          .getPublicUrl(fileName)
        signature_image_url = publicUrl.publicUrl
      }
    }

    // 契約同意記録を作成
    const { data: contract, error: contractError } = await supabase
      .from('staff_contracts')
      .insert({
        staff_id: invitation.staff_id,
        contract_template_id,
        signature_image_url,
        signature_typed_name,
        signed_at: new Date().toISOString(),
        ip_address,
        user_agent,
        status: 'signed',
      })
      .select()
      .single()

    if (contractError) {
      return internalErrorResponse('Contract create', contractError)
    }

    // 全ての必要文書が署名済みか確認
    const employmentType = invitation.staff?.employment_type || 'full_time'

    // 必要な文書テンプレートを取得
    const { data: requiredTemplates } = await supabase
      .from('contract_templates')
      .select('id')
      .or(`employment_type.eq.${employmentType},employment_type.eq.common`)
      .eq('is_active', true)

    const requiredIds = (requiredTemplates || []).map(t => t.id)

    // 署名済み文書を取得
    const { data: signedContracts } = await supabase
      .from('staff_contracts')
      .select('contract_template_id')
      .eq('staff_id', invitation.staff_id)
      .eq('status', 'signed')

    const signedIds = (signedContracts || []).map(c => c.contract_template_id)

    // 全ての必要文書が署名済みかチェック
    const allSigned = requiredIds.every(id => signedIds.includes(id))

    // スタッフのステータスを更新
    await supabase
      .from('staff')
      .update({ onboarding_status: allSigned ? 'contract_signed' : 'invited' })
      .eq('id', invitation.staff_id)

    return okResponse({
      success: true,
      contract,
      allDocumentsSigned: allSigned,
      message: '契約書への署名が完了しました',
    })
  } catch (error) {
    return internalErrorResponse('Contract sign', error)
  }
}
