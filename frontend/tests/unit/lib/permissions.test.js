import { describe, it, expect } from 'vitest'

// permissions.js のロジックを先行テスト（Step3で実装されるファイルをテスト）
// このテストが先に存在することで permissions.js の期待動作を明確にする

const { hasRole, isAdmin, isManager, canManageExpenses } = await import('@/lib/auth/permissions')

const makeStaff = (roleName) => ({
  id: 'staff1',
  role_id: 'role1',
  roles: { name: roleName, permissions: {} },
})

describe('hasRole', () => {
  it('ロールが一致する場合 true', () => {
    expect(hasRole(makeStaff('admin'), ['admin'])).toBe(true)
  })

  it('ロールが一致しない場合 false', () => {
    expect(hasRole(makeStaff('instructor'), ['admin', 'store_manager'])).toBe(false)
  })

  it('staff が null の場合 false', () => {
    expect(hasRole(null, ['admin'])).toBe(false)
  })

  it('roles が undefined の場合 false', () => {
    expect(hasRole({ id: 's1', roles: undefined }, ['admin'])).toBe(false)
  })
})

describe('isAdmin', () => {
  it('admin ロールで true', () => {
    expect(isAdmin(makeStaff('admin'))).toBe(true)
  })

  it('store_manager ロールで false', () => {
    expect(isAdmin(makeStaff('store_manager'))).toBe(false)
  })
})

describe('isManager', () => {
  it('admin は manager 扱い', () => {
    expect(isManager(makeStaff('admin'))).toBe(true)
  })

  it('store_manager は manager 扱い', () => {
    expect(isManager(makeStaff('store_manager'))).toBe(true)
  })

  it('instructor は manager でない', () => {
    expect(isManager(makeStaff('instructor'))).toBe(false)
  })
})

describe('canManageExpenses', () => {
  it('admin は経費管理可能', () => {
    expect(canManageExpenses(makeStaff('admin'))).toBe(true)
  })

  it('store_manager は経費管理可能', () => {
    expect(canManageExpenses(makeStaff('store_manager'))).toBe(true)
  })

  it('receptionist は経費管理不可', () => {
    expect(canManageExpenses(makeStaff('receptionist'))).toBe(false)
  })
})
