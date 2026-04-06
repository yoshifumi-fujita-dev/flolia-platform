import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 交通費月別集計
// NOTE: 出勤日数はinstructor_attendancesテーブルを参照
// staffとinstructorsの紐づけはスタッフ名で行う（将来的にはstaff_idカラムを追加予定）
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const staffId = searchParams.get('staff_id')
    const storeId = searchParams.get('store_id')
    const year = searchParams.get('year') || new Date().getFullYear()
    const month = searchParams.get('month') // 1-12、省略時は全月

    // 交通費設定を取得
    let transportationQuery = supabase
      .from('staff_transportation')
      .select(`
        *,
        staff:staff_id(id, name, email),
        store:store_id(id, name)
      `)

    if (staffId) {
      transportationQuery = transportationQuery.eq('staff_id', staffId)
    }

    if (storeId) {
      transportationQuery = transportationQuery.eq('store_id', storeId)
    }

    const { data: transportationData, error: transportationError } = await transportationQuery

    if (transportationError) throw transportationError

    // スタッフ名からインストラクターIDを取得
    const staffNames = [...new Set((transportationData || []).map(t => t.staff?.name).filter(Boolean))]

    let instructorMap = {}
    if (staffNames.length > 0) {
      const { data: instructors } = await supabase
        .from('instructors')
        .select('id, name')
        .in('name', staffNames)

      for (const inst of instructors || []) {
        instructorMap[inst.name] = inst.id
      }
    }

    // 出勤日数を取得（instructor_attendancesから）
    const startDate = month
      ? `${year}-${String(month).padStart(2, '0')}-01`
      : `${year}-01-01`
    const endDate = month
      ? new Date(year, parseInt(month), 0).toISOString().split('T')[0]
      : `${year}-12-31`

    const instructorIds = Object.values(instructorMap)

    let attendanceData = []
    if (instructorIds.length > 0) {
      let attendanceQuery = supabase
        .from('instructor_attendances')
        .select('instructor_id, store_id, attendance_date')
        .in('instructor_id', instructorIds)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .in('status', ['working', 'completed']) // 出勤した日のみカウント

      if (storeId) {
        attendanceQuery = attendanceQuery.eq('store_id', storeId)
      }

      const { data, error: attendanceError } = await attendanceQuery
      if (attendanceError) throw attendanceError
      attendanceData = data || []
    }

    // 出勤日数を集計（インストラクター×店舗×月ごと）
    const workDaysMap = {}
    for (const log of attendanceData) {
      const date = new Date(log.attendance_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const key = `${log.instructor_id}_${log.store_id}_${monthKey}`

      if (!workDaysMap[key]) {
        workDaysMap[key] = {
          instructor_id: log.instructor_id,
          store_id: log.store_id,
          month: monthKey,
          work_days: 0,
        }
      }
      workDaysMap[key].work_days++
    }

    // 交通費と出勤日数を結合
    const result = []
    for (const t of transportationData || []) {
      const instructorId = instructorMap[t.staff?.name]

      // 月指定がある場合はその月のみ、ない場合は年間の各月
      const months = month
        ? [`${year}-${String(month).padStart(2, '0')}`]
        : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

      for (const m of months) {
        const key = instructorId ? `${instructorId}_${t.store_id}_${m}` : null
        const workData = key ? workDaysMap[key] : null
        const workDays = workData ? workData.work_days : 0

        result.push({
          staff_id: t.staff_id,
          staff_name: t.staff?.name,
          staff_email: t.staff?.email,
          store_id: t.store_id,
          store_name: t.store?.name,
          fee: t.fee,
          month: m,
          work_days: workDays,
          total_fee: t.fee * workDays,
          instructor_linked: !!instructorId, // インストラクターと紐づいているか
        })
      }
    }

    // 月でソート
    result.sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month)
      if (a.staff_name !== b.staff_name) return (a.staff_name || '').localeCompare(b.staff_name || '')
      return (a.store_name || '').localeCompare(b.store_name || '')
    })

    // 合計を計算
    const summary = {
      total_work_days: result.reduce((sum, r) => sum + r.work_days, 0),
      total_fee: result.reduce((sum, r) => sum + r.total_fee, 0),
    }

    return okResponse({
      monthly: result,
      summary,
    })
  } catch (error) {
    return internalErrorResponse('Staff transportation monthly fetch', error)
  }
}
