import { requireStaffSession } from '@/lib/auth/staff'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'
import { okResponse, badRequestResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

// POST: MFクラウド給与用の勤怠CSVエクスポート
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    // 権限チェック
    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', staff.role_id)
      .single()

    if (role?.name !== 'admin') {
      return forbiddenResponse('エクスポートする権限がありません')
    }

    const {
      year,
      month,
      staff_ids, // 特定のスタッフのみ（省略時は全員）
    } = body

    if (!year || !month) {
      return badRequestResponse('年月を指定してください')
    }

    // 対象期間
    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(new Date(year, month - 1))

    // 対象スタッフを取得（勤怠追跡対象のみ）
    let staffQuery = supabase
      .from('staff')
      .select('id, name, employee_number')
      .eq('is_active', true)
      .eq('attendance_tracking', true)
      .not('employee_number', 'is', null)

    if (staff_ids && staff_ids.length > 0) {
      staffQuery = staffQuery.in('id', staff_ids)
    }

    const { data: targetStaff, error: staffError } = await staffQuery.order('employee_number')

    if (staffError) throw staffError

    if (!targetStaff || targetStaff.length === 0) {
      return badRequestResponse('対象のスタッフがいません')
    }

    // 勤怠データを取得
    const staffIds = targetStaff.map(s => s.id)
    const { data: attendances, error: attendanceError } = await supabase
      .from('staff_attendances')
      .select('*')
      .in('staff_id', staffIds)
      .gte('work_date', format(startDate, 'yyyy-MM-dd'))
      .lte('work_date', format(endDate, 'yyyy-MM-dd'))

    if (attendanceError) throw attendanceError

    // スタッフごとに勤怠を集計
    const attendanceMap = new Map()
    attendances?.forEach(a => {
      if (!attendanceMap.has(a.staff_id)) {
        attendanceMap.set(a.staff_id, [])
      }
      attendanceMap.get(a.staff_id).push(a)
    })

    // MFクラウド給与のCSVフォーマット
    // Version, 従業員番号, 従業員名, 出勤日数, 欠勤日数, 有給日数, 所定労働時間, 実労働時間, 残業時間, 深夜時間, 休日出勤日数, 遅刻回数, 早退回数
    const headers = [
      'Version',
      '従業員番号',
      '従業員名',
      '出勤日数',
      '欠勤日数',
      '有給日数',
      '所定労働時間',
      '実労働時間',
      '残業時間',
      '深夜時間',
      '休日出勤日数',
      '遅刻回数',
      '早退回数',
    ]

    const rows = targetStaff.map(s => {
      const staffAttendances = attendanceMap.get(s.id) || []

      // 集計
      let workDays = 0
      let absentDays = 0
      let paidLeaveDays = 0
      let totalWorkMinutes = 0
      let overtimeMinutes = 0
      let nightMinutes = 0
      let holidayWorkDays = 0
      let lateCount = 0
      let earlyLeaveCount = 0

      staffAttendances.forEach(a => {
        if (a.status === 'present') {
          workDays++
          if (a.work_minutes) {
            totalWorkMinutes += a.work_minutes
          }
          if (a.overtime_minutes) {
            overtimeMinutes += a.overtime_minutes
          }
          if (a.night_minutes) {
            nightMinutes += a.night_minutes
          }
          if (a.is_late) {
            lateCount++
          }
          if (a.is_early_leave) {
            earlyLeaveCount++
          }
        } else if (a.status === 'absent') {
          absentDays++
        } else if (a.status === 'paid_leave') {
          paidLeaveDays++
        } else if (a.status === 'holiday_work') {
          holidayWorkDays++
          if (a.work_minutes) {
            totalWorkMinutes += a.work_minutes
          }
        }
      })

      // 所定労働時間（月の営業日数 × 8時間）
      // 簡易計算：出勤日数 × 8時間
      const scheduledMinutes = workDays * 8 * 60

      // 時間を時:分形式に変換
      const formatMinutes = (minutes) => {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return `${h}:${String(m).padStart(2, '0')}`
      }

      return [
        '2',                              // Version（必須）
        s.employee_number,                // 従業員番号
        s.name,                           // 従業員名
        workDays,                         // 出勤日数
        absentDays,                       // 欠勤日数
        paidLeaveDays,                    // 有給日数
        formatMinutes(scheduledMinutes),  // 所定労働時間
        formatMinutes(totalWorkMinutes),  // 実労働時間
        formatMinutes(overtimeMinutes),   // 残業時間
        formatMinutes(nightMinutes),      // 深夜時間
        holidayWorkDays,                  // 休日出勤日数
        lateCount,                        // 遅刻回数
        earlyLeaveCount,                  // 早退回数
      ]
    })

    // CSV生成
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')

    const base64Content = Buffer.from(csvContent, 'utf-8').toString('base64')
    const filename = `勤怠データ_${year}年${month}月_MFクラウド給与.csv`

    return okResponse({
      success: true,
      staff_count: targetStaff.length,
      period: `${year}年${month}月`,
      filename,
      csv_base64: base64Content,
    })
  } catch (error) {
    return internalErrorResponse('Attendance export', error)
  }
}
