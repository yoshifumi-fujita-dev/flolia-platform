import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

// ミドルウェアで設定されたヘッダーからスタッフ情報を取得（軽量版）
// 認証チェックはミドルウェアで完了しているため、ここではヘッダーを読み取るだけ
export async function getStaffFromHeaders() {
  const headersList = await headers()
  const staffId = headersList.get('x-staff-id')
  const roleId = headersList.get('x-staff-role-id')
  const roleName = headersList.get('x-staff-role-name')
  const permissions = headersList.get('x-staff-permissions')
  const userId = headersList.get('x-user-id')
  const staffEmail = headersList.get('x-staff-email')
  const staffName = headersList.get('x-staff-name')

  // ヘッダーがない場合は未認証（ミドルウェアを通っていない）
  if (!staffId || !userId) {
    return { error: 'unauthenticated' }
  }

  const adminSupabase = createAdminClient()

  const staff = {
    id: staffId,
    role_id: roleId,
    email: staffEmail ? decodeURIComponent(staffEmail) : null,
    name: staffName ? decodeURIComponent(staffName) : null,
    roles: {
      id: roleId,
      name: roleName,
      permissions: permissions ? JSON.parse(permissions) : [],
    },
  }

  return { staff, adminSupabase }
}

// 後方互換性のためのエイリアス（既存のコードで使用されている）
// NOTE: 段階的に getStaffFromHeaders() に移行後、この関数は削除可能
export async function requireStaffSession() {
  return getStaffFromHeaders()
}
