import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 採用情報設定取得（管理画面用）
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = adminSupabase
      .from('career_settings')
      .select('*')

    // 店舗IDが指定されている場合はその店舗の設定を取得
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    // 公開中のみ取得（管理画面以外）
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // 最新の1件を取得（store_idがnullの場合、複数レコードが存在する可能性があるため）
    query = query.order('updated_at', { ascending: false }).limit(1)

    const { data: settings, error } = await query.maybeSingle()

    if (error) {
      return internalErrorResponse('Career settings fetch', error)
    }

    // 設定がない場合はデフォルト値を返す
    if (!settings) {
      return okResponse({
        settings: null,
        isDefault: true
      })
    }

    return okResponse({ settings })
  } catch (error) {
    return internalErrorResponse('Careers API', error)
  }
}

// POST: 採用情報設定の作成/更新（upsert）
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const body = await request.json()

    const {
      store_id,
      hero_title,
      hero_subtitle,
      hero_description,
      value_title,
      value_description,
      value_highlight,
      ai_section_title,
      ai_section_description,
      ai_section_highlight,
      compensation_title,
      compensation_subtitle,
      fulltime_salary_min,
      fulltime_salary_max,
      fulltime_benefits,
      parttime_hourly_min,
      parttime_hourly_max,
      parttime_benefits,
      job_title,
      employment_types,
      work_location,
      work_hours,
      work_hours_note,
      benefits,
      requirements,
      closing_title,
      closing_description,
      is_active = true,
    } = body

    // Upsert: 既存レコードがあれば更新、なければ挿入
    const { data: settings, error } = await adminSupabase
      .from('career_settings')
      .upsert(
        {
          store_id: store_id || null,
          hero_title,
          hero_subtitle,
          hero_description,
          value_title,
          value_description,
          value_highlight,
          ai_section_title,
          ai_section_description,
          ai_section_highlight,
          compensation_title,
          compensation_subtitle,
          fulltime_salary_min,
          fulltime_salary_max,
          fulltime_benefits,
          parttime_hourly_min,
          parttime_hourly_max,
          parttime_benefits,
          job_title,
          employment_types,
          work_location,
          work_hours,
          work_hours_note,
          benefits,
          requirements,
          closing_title,
          closing_description,
          is_active,
        },
        {
          onConflict: 'store_id',
        }
      )
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Career settings upsert', error)
    }

    return okResponse({ settings }, 201)
  } catch (error) {
    return internalErrorResponse('Careers POST', error)
  }
}
