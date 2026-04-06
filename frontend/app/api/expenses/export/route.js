import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { canManageExpenses } from '@/lib/auth/permissions'
import { okResponse, badRequestResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

// POST: MF会計用CSVエクスポート
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    // 権限チェック
    if (!canManageExpenses(staff)) {
      return forbiddenResponse('エクスポートする権限がありません')
    }

    const {
      start_date,
      end_date,
      include_exported = false,  // 既にエクスポート済みを含めるか
      mark_as_exported = true,   // エクスポート済みとしてマークするか
    } = body

    if (!start_date || !end_date) {
      return badRequestResponse('対象期間を指定してください')
    }

    // 承認済みの経費を取得
    let query = supabase
      .from('expense_requests')
      .select(`
        *,
        staff:staff_id(id, name),
        category:category_id(id, name, account_code, account_name, tax_category)
      `)
      .eq('status', 'approved')
      .gte('expense_date', start_date)
      .lte('expense_date', end_date)
      .order('expense_date', { ascending: true })

    // 未エクスポートのみの場合
    if (!include_exported) {
      query = query.is('exported_at', null)
    }

    const { data: expenses, error } = await query

    if (error) throw error

    if (!expenses || expenses.length === 0) {
      return badRequestResponse('エクスポート対象の経費がありません')
    }

    // バッチIDを生成
    const batchId = `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`

    // MF会計の仕訳帳CSVフォーマットに変換
    // カラム: 取引No, 取引日, 借方勘定科目, 借方補助科目, 借方部門, 借方取引先, 借方税区分, 借方インボイス, 借方金額(税込),
    //        貸方勘定科目, 貸方補助科目, 貸方部門, 貸方取引先, 貸方税区分, 貸方インボイス, 貸方金額(税込),
    //        摘要, 仕訳メモ, タグ, MF仕訳タイプ, 決算整理仕訳
    const headers = [
      '取引No',
      '取引日',
      '借方勘定科目',
      '借方補助科目',
      '借方部門',
      '借方取引先',
      '借方税区分',
      '借方インボイス',
      '借方金額(税込)',
      '貸方勘定科目',
      '貸方補助科目',
      '貸方部門',
      '貸方取引先',
      '貸方税区分',
      '貸方インボイス',
      '貸方金額(税込)',
      '摘要',
      '仕訳メモ',
      'タグ',
      'MF仕訳タイプ',
      '決算整理仕訳',
    ]

    const rows = expenses.map((expense, index) => {
      const transactionNo = index + 1
      const date = expense.expense_date.replace(/-/g, '/')
      const debitAccount = expense.category?.account_name || '雑費'
      const debitTaxCategory = expense.category?.tax_category || '課対仕入10%'
      const creditAccount = '未払金'  // または「現金」「普通預金」など
      const amount = expense.amount
      const description = [
        expense.vendor_name,
        expense.description,
        `(${expense.staff?.name})`,
      ].filter(Boolean).join(' ')

      return [
        transactionNo,           // 取引No
        date,                    // 取引日
        debitAccount,            // 借方勘定科目
        '',                      // 借方補助科目
        '',                      // 借方部門
        expense.vendor_name || '', // 借方取引先
        debitTaxCategory,        // 借方税区分
        '',                      // 借方インボイス
        amount,                  // 借方金額(税込)
        creditAccount,           // 貸方勘定科目
        '',                      // 貸方補助科目
        '',                      // 貸方部門
        '',                      // 貸方取引先
        '対象外',                // 貸方税区分
        '',                      // 貸方インボイス
        amount,                  // 貸方金額(税込)
        description,             // 摘要
        `経費精算 ${batchId}`,   // 仕訳メモ
        '',                      // タグ
        '',                      // MF仕訳タイプ
        '',                      // 決算整理仕訳
      ]
    })

    // CSV文字列を生成（Shift-JIS対応のためBOMなし、ただしUTF-8で返す）
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // カンマや改行を含む場合はダブルクォートで囲む
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')

    // エクスポート済みとしてマーク
    if (mark_as_exported) {
      const expenseIds = expenses.map(e => e.id)
      const { error: updateError } = await supabase
        .from('expense_requests')
        .update({
          exported_at: new Date().toISOString(),
          export_batch_id: batchId,
        })
        .in('id', expenseIds)

      if (updateError) {
        console.error('Failed to mark expenses as exported:', updateError)
      }
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'export',
      tableName: 'expense_requests',
      recordId: batchId,
      newData: {
        batch_id: batchId,
        start_date,
        end_date,
        expense_count: expenses.length,
        total_amount: expenses.reduce((sum, e) => sum + e.amount, 0),
      },
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    // CSVをBase64エンコードして返す（フロントエンドでダウンロード）
    const base64Content = Buffer.from(csvContent, 'utf-8').toString('base64')

    return okResponse({
      success: true,
      batch_id: batchId,
      expense_count: expenses.length,
      total_amount: expenses.reduce((sum, e) => sum + e.amount, 0),
      filename: `経費精算_${start_date}_${end_date}_${batchId}.csv`,
      csv_base64: base64Content,
    })
  } catch (error) {
    return internalErrorResponse('Expense export', error)
  }
}

// GET: エクスポート履歴を取得
export async function GET(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    // 権限チェック
    if (!canManageExpenses(staff)) {
      return forbiddenResponse('エクスポート履歴を閲覧する権限がありません')
    }

    // エクスポートバッチごとの集計
    const { data: batches, error } = await supabase
      .from('expense_requests')
      .select('export_batch_id, exported_at, amount')
      .not('export_batch_id', 'is', null)
      .order('exported_at', { ascending: false })

    if (error) throw error

    // バッチごとに集計
    const batchMap = new Map()
    batches?.forEach(item => {
      const key = item.export_batch_id
      if (!batchMap.has(key)) {
        batchMap.set(key, {
          batch_id: key,
          exported_at: item.exported_at,
          count: 0,
          total_amount: 0,
        })
      }
      const batch = batchMap.get(key)
      batch.count++
      batch.total_amount += item.amount
    })

    const exportHistory = Array.from(batchMap.values())

    return okResponse({ exportHistory })
  } catch (error) {
    return internalErrorResponse('Export history fetch', error)
  }
}
