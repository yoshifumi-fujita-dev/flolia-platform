import { createAdminClient } from '@/lib/supabase/server'
import { verifyAdminAccessToken } from '@/lib/auth/admin-access-token'
import { okResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

async function isPreviewAuthorized(request) {
  const adminAccess = request.cookies?.get('admin_access')?.value
  if (!adminAccess) return false
  return verifyAdminAccessToken(adminAccess)
}

// GET: 公開用採用情報取得（認証不要）
// preview=trueの場合は非公開の設定も取得可能
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const isPreview = searchParams.get('preview') === 'true'
    const allowInactive = isPreview ? await isPreviewAuthorized(request) : false

    let query = supabase
      .from('career_settings')
      .select('*')

    // プレビューモードでない場合はis_active=trueのみ取得
    if (!allowInactive) {
      query = query.eq('is_active', true)
    }

    // 店舗IDが指定されている場合はその店舗の設定を取得
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: settings, error } = await query.maybeSingle()

    if (error) {
      return internalErrorResponse('Public career settings fetch', error)
    }

    // 設定がない場合
    if (!settings) {
      // プレビューモードの場合はデフォルト値を返す（管理画面での確認用）
      if (allowInactive) {
        return okResponse({
          settings: getDefaultSettings(),
          isDefault: true
        })
      }
      // 通常モードでは404を返す（非公開扱い）
      return notFoundResponse('採用情報が見つかりません')
    }

    return okResponse({ settings })
  } catch (error) {
    return internalErrorResponse('Public careers API', error)
  }
}

// デフォルト値
function getDefaultSettings() {
  return {
    hero_title: 'AIにミットは持てない。',
    hero_subtitle: 'AIが進化するほど、人の価値は「身体と向き合う力」に宿る。',
    hero_description: 'ロボットが相手なら、サンドバッグでいい。でも――目の前の人を笑顔にするのは、人にしかできない。',
    hero_video_url: null,
    value_title: 'この仕事には価値がある',
    value_description: '汗と呼吸、そして声掛け。相手の目を見て、限界を一歩超えさせること。',
    value_highlight: 'AIにはできない。マニュアルにも置き換えられない仕事。',
    ai_section_title: 'AI時代に、\n最後まで残る\n身体の仕事',
    ai_section_description: 'キックボクシングインストラクターは、人にしかできないコーチングがある仕事です。',
    ai_section_highlight: 'ミットを持つことは、誰かの自信を支え、人生を前に進めること。',
    compensation_title: 'その価値には、正当な報酬がある。',
    compensation_subtitle: 'プロとして、対価を得る仕事です。',
    fulltime_salary_min: 250000,
    fulltime_salary_max: null,
    fulltime_benefits: ['経験・スキルに応じて優遇', '昇給制度あり', '社会保険完備'],
    parttime_hourly_min: 1500,
    parttime_hourly_max: null,
    parttime_benefits: ['週3日〜OK', 'シフト相談可', '正社員登用あり'],
    job_title: 'キックボクシングインストラクター',
    employment_types: ['正社員', 'アルバイト・パート'],
    work_location: null,
    work_hours: 'シフト制（営業時間内）',
    work_hours_note: '※週3日〜応相談',
    benefits: ['交通費支給', '社会保険完備（正社員）', '研修制度あり', 'スタジオ利用無料'],
    requirements: ['人と向き合うことが好きな方', '運動・フィットネスに興味がある方', '誰かの成長を喜べる方', '格闘技経験者（未経験でも可）'],
    closing_title: 'この仕事は、代替されない。',
    closing_description: 'あなたの身体、あなたの声、あなたの熱量が、誰かを変える。',
    is_active: true,
  }
}
