import { createClient } from '@supabase/supabase-js'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// Service Role クライアント（認証不要のAPI用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET: トークンの検証と従業員情報の取得
export async function GET(request, { params }) {
  try {
    const { token } = await params

    // 招待トークンを検証
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .select(`
        *,
        staff:staff_id(
          id,
          name,
          name_kana,
          email,
          phone,
          employment_type,
          onboarding_status,
          line_user_id
        )
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return notFoundResponse('無効な招待リンクです')
    }

    // スタッフのonboarding_statusを直接取得して確認
    if (invitation.staff_id) {
      const { data: staffDirect, error: staffDirectError } = await supabase
        .from('staff')
        .select('id, onboarding_status, line_user_id')
        .eq('id', invitation.staff_id)
        .single()
      // JOINで取得できなかった場合、直接取得した値をマージ
      if (staffDirect && invitation.staff) {
        invitation.staff.onboarding_status = staffDirect.onboarding_status
        invitation.staff.line_user_id = staffDirect.line_user_id
      }
    }

    // ステータスチェック
    if (invitation.status === 'completed') {
      return badRequestResponse('この招待リンクは既に使用済みです')
    }

    if (invitation.status === 'cancelled') {
      return badRequestResponse('この招待リンクはキャンセルされました')
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      // ステータスを期限切れに更新
      await supabase
        .from('staff_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return badRequestResponse('招待リンクの有効期限が切れています。管理者に再送信を依頼してください。')
    }

    // 雇用形態に応じた契約書テンプレートを取得（複数文書対応）
    const employmentType = invitation.staff?.employment_type || 'full_time'

    // 1. 雇用形態固有の雇用契約書を取得
    const { data: employmentContract } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('employment_type', employmentType)
      .eq('document_type', 'employment_contract')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 2. 共通の就業規則同意書を取得
    const { data: workRulesConsent } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('employment_type', 'common')
      .eq('document_type', 'work_rules_consent')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 3. 共通の機密保持誓約書を取得
    const { data: confidentiality } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('employment_type', 'common')
      .eq('document_type', 'confidentiality')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 4. 共通のSNSポリシー同意書を取得
    const { data: snsPolicy } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('employment_type', 'common')
      .eq('document_type', 'sns_policy')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 署名済み文書を取得
    const { data: signedContracts } = await supabase
      .from('staff_contracts')
      .select('contract_template_id')
      .eq('staff_id', invitation.staff_id)
      .eq('status', 'signed')

    const signedTemplateIds = (signedContracts || []).map(c => c.contract_template_id)

    // 文書リストを作成（署名済みフラグ付き）
    const documents = []
    if (workRulesConsent) {
      documents.push({
        ...workRulesConsent,
        signed: signedTemplateIds.includes(workRulesConsent.id),
      })
    }
    if (confidentiality) {
      documents.push({
        ...confidentiality,
        signed: signedTemplateIds.includes(confidentiality.id),
      })
    }
    if (snsPolicy) {
      documents.push({
        ...snsPolicy,
        signed: signedTemplateIds.includes(snsPolicy.id),
      })
    }
    if (employmentContract) {
      documents.push({
        ...employmentContract,
        signed: signedTemplateIds.includes(employmentContract.id),
      })
    }

    // 後方互換性のため、最初の未署名文書をcontractTemplateとして返す
    const firstUnsigned = documents.find(d => !d.signed)

    return okResponse({
      invitation: {
        id: invitation.id,
        status: invitation.status,
        expires_at: invitation.expires_at,
      },
      staff: invitation.staff,
      contractTemplate: firstUnsigned || null, // 後方互換性
      documents, // 新しい複数文書リスト
    })
  } catch (error) {
    return internalErrorResponse('Onboarding token verification', error)
  }
}
