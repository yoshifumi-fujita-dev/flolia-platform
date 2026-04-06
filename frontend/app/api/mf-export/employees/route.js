import { requireStaffSession } from '@/lib/auth/staff'
import { format } from 'date-fns'
import { okResponse, badRequestResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

// POST: MFクラウド人事管理用の従業員CSVエクスポート
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
      include_inactive = false, // 退職者を含めるか
      staff_ids,                // 特定のスタッフのみ（省略時は全員）
      effective_date,           // 適用開始日（省略時は今日）
    } = body

    // 対象スタッフを取得
    let query = supabase
      .from('staff')
      .select(`
        *,
        roles(name, display_name)
      `)
      .not('employee_number', 'is', null)

    if (!include_inactive) {
      query = query.eq('is_active', true)
    }

    if (staff_ids && staff_ids.length > 0) {
      query = query.in('id', staff_ids)
    }

    const { data: employees, error } = await query.order('employee_number')

    if (error) throw error

    if (!employees || employees.length === 0) {
      return badRequestResponse('対象の従業員がいません')
    }

    // MFクラウド人事管理のCSVフォーマット
    const headers = [
      '適用開始日',
      '従業員番号',
      '姓',
      '名',
      '姓（カナ）',
      '名（カナ）',
      'メールアドレス',
      '電話番号',
      '入社日',
      '雇用形態',
      '在籍状況',
    ]

    const applyDate = effective_date || format(new Date(), 'yyyy-MM-dd')

    // 雇用形態のマッピング
    const employmentTypeMap = {
      full_time: '正社員',
      part_time: 'パート・アルバイト',
      contract: '契約社員',
      contractor: '業務委託',
      executive: '役員',
    }

    const rows = employees.map(emp => {
      // 氏名を姓・名に分割（スペースで分割、なければ全て姓に）
      const nameParts = (emp.name || '').split(/\s+/)
      const lastName = nameParts[0] || ''
      const firstName = nameParts.slice(1).join(' ') || ''

      // カナも同様に分割
      const kanaNameParts = (emp.name_kana || '').split(/\s+/)
      const lastNameKana = kanaNameParts[0] || ''
      const firstNameKana = kanaNameParts.slice(1).join(' ') || ''

      return [
        applyDate,                                          // 適用開始日
        emp.employee_number,                                // 従業員番号
        lastName,                                           // 姓
        firstName,                                          // 名
        lastNameKana,                                       // 姓（カナ）
        firstNameKana,                                      // 名（カナ）
        emp.email,                                          // メールアドレス
        emp.phone || '',                                    // 電話番号
        emp.hire_date || '',                                // 入社日
        employmentTypeMap[emp.employment_type] || '',       // 雇用形態
        emp.is_active ? '在籍' : '退職',                    // 在籍状況
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
    const filename = `従業員マスタ_${format(new Date(), 'yyyyMMdd')}_MFクラウド人事管理.csv`

    return okResponse({
      success: true,
      employee_count: employees.length,
      effective_date: applyDate,
      filename,
      csv_base64: base64Content,
    })
  } catch (error) {
    return internalErrorResponse('Employee export', error)
  }
}
