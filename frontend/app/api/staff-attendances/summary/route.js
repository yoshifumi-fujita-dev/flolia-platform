import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 勤怠月次集計
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)

    const storeId = searchParams.get('store_id')
    const staffId = searchParams.get('staff_id')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
    const format = searchParams.get('format') // 'csv' for CSV export

    // 対象期間
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    // スタッフ一覧取得（インストラクター以外）
    let staffQuery = adminSupabase
      .from('staff')
      .select('id, name, email, employee_number, employment_type')
      .eq('is_active', true)
      .eq('is_instructor', false) // インストラクターは除外

    if (storeId) {
      staffQuery = staffQuery.contains('assigned_store_ids', [storeId])
    }
    if (staffId) {
      staffQuery = staffQuery.eq('id', staffId)
    }

    const { data: staffList, error: staffError } = await staffQuery.order('employee_number')

    if (staffError) throw staffError

    const summaries = []

    for (const staff of staffList || []) {
      // 給与設定を取得
      const { data: salarySettings } = await adminSupabase
        .from('staff_salary_settings')
        .select('*')
        .eq('staff_id', staff.id)
        .lte('effective_from', endDate)
        .or(`effective_to.is.null,effective_to.gte.${startDate}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single()

      // 勤怠データ取得
      let attendanceQuery = adminSupabase
        .from('staff_attendances')
        .select('*')
        .eq('staff_id', staff.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .eq('status', 'completed')

      if (storeId) {
        attendanceQuery = attendanceQuery.eq('store_id', storeId)
      }

      const { data: attendances } = await attendanceQuery

      // 集計
      let summary = {
        staff_id: staff.id,
        staff_name: staff.name,
        employee_number: staff.employee_number,
        employment_type: staff.employment_type,
        salary_type: salarySettings?.salary_type || 'hourly',
        hourly_rate: salarySettings?.hourly_rate || 0,
        base_salary: salarySettings?.base_salary || 0,
        // 勤務実績
        work_days: 0,
        total_work_minutes: 0,
        total_overtime_minutes: 0,
        total_night_minutes: 0,
        total_holiday_minutes: 0,
        total_late_minutes: 0,
        late_count: 0,
        absent_days: 0,
      }

      for (const att of attendances || []) {
        summary.work_days++
        summary.total_work_minutes += att.actual_work_minutes || 0
        summary.total_overtime_minutes += att.overtime_minutes || 0
        summary.total_night_minutes += att.night_minutes || 0

        if (att.is_holiday) {
          summary.total_holiday_minutes += att.actual_work_minutes || 0
        }

        if (att.late_minutes > 0) {
          summary.late_count++
          summary.total_late_minutes += att.late_minutes
        }
      }

      summaries.push(summary)
    }

    // CSV出力
    if (format === 'csv') {
      const csv = generateSummaryCSV(summaries, year, month)
      return new Response('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="staff_attendance_${year}${String(month).padStart(2, '0')}.csv"`,
        },
      })
    }

    return okResponse({
      summaries,
      period: { year, month, startDate, endDate },
    })
  } catch (error) {
    return internalErrorResponse('Staff attendance summary', error)
  }
}

// CSV生成関数
function generateSummaryCSV(summaries, year, month) {
  const headers = [
    '従業員番号',
    '氏名',
    '雇用形態',
    '給与形態',
    '出勤日数',
    '総勤務時間(h)',
    '残業時間(h)',
    '深夜時間(h)',
    '休日勤務(h)',
    '遅刻回数',
    '遅刻時間(分)',
  ]

  const rows = summaries.map(s => [
    s.employee_number || '',
    s.staff_name,
    getEmploymentTypeLabel(s.employment_type),
    s.salary_type === 'monthly' ? '月給' : '時給',
    s.work_days,
    (s.total_work_minutes / 60).toFixed(1),
    (s.total_overtime_minutes / 60).toFixed(1),
    (s.total_night_minutes / 60).toFixed(1),
    (s.total_holiday_minutes / 60).toFixed(1),
    s.late_count,
    s.total_late_minutes,
  ])

  // 合計行
  const totals = [
    '合計',
    '',
    '',
    '',
    summaries.reduce((sum, s) => sum + s.work_days, 0),
    (summaries.reduce((sum, s) => sum + s.total_work_minutes, 0) / 60).toFixed(1),
    (summaries.reduce((sum, s) => sum + s.total_overtime_minutes, 0) / 60).toFixed(1),
    (summaries.reduce((sum, s) => sum + s.total_night_minutes, 0) / 60).toFixed(1),
    (summaries.reduce((sum, s) => sum + s.total_holiday_minutes, 0) / 60).toFixed(1),
    summaries.reduce((sum, s) => sum + s.late_count, 0),
    summaries.reduce((sum, s) => sum + s.total_late_minutes, 0),
  ]

  return [
    [`${year}年${month}月 スタッフ勤怠集計`],
    [],
    headers,
    ...rows,
    [],
    totals,
  ]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

// 雇用形態ラベル
function getEmploymentTypeLabel(type) {
  const labels = {
    full_time: '正社員',
    contract: '契約社員',
    part_time: 'アルバイト',
    contractor: '業務委託',
    executive: '役員',
    none: 'その他',
  }
  return labels[type] || type
}
