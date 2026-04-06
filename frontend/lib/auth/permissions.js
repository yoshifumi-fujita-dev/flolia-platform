/**
 * 権限ヘルパー
 *
 * ロール名の文字列比較をここに集約する。
 * ミドルウェアが x-staff-role-name ヘッダーでロール名を渡しているため、
 * これらの関数は DB クエリなしでヘッダーから取得した staff オブジェクトで動作する。
 *
 * 使い方:
 *   const { staff } = await requireStaffSession()
 *   if (!isManager(staff)) return forbiddenResponse('権限がありません')
 */

/**
 * スタッフが指定のロールのいずれかに属するか確認する
 * @param {object|null} staff - requireStaffSession() が返す staff オブジェクト
 * @param {string[]} roles - 許可するロール名の配列
 * @returns {boolean}
 */
export function hasRole(staff, roles) {
  if (!staff || !staff.roles?.name) return false
  return roles.includes(staff.roles.name)
}

/**
 * 管理者（admin）か確認する
 */
export function isAdmin(staff) {
  return hasRole(staff, ['admin'])
}

/**
 * 管理者または店舗マネージャーか確認する
 */
export function isManager(staff) {
  return hasRole(staff, ['admin', 'store_manager'])
}

/**
 * 経費申請を管理（承認/却下/エクスポート）できるか確認する
 * admin と store_manager のみ可
 */
export function canManageExpenses(staff) {
  return isManager(staff)
}

/**
 * 経費カテゴリを作成・編集できるか確認する
 * admin のみ可
 */
export function canManageExpenseCategories(staff) {
  return isAdmin(staff)
}

/**
 * システム管理者か確認する（時間制限なし送信など特権操作用）
 * admin と 'Super Admin' の両方に対応（後方互換）
 */
export function isSystemAdmin(staff) {
  if (!staff || !staff.roles?.name) return false
  return staff.roles.name === 'admin' || staff.roles.name === 'Super Admin'
}
