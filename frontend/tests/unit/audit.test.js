import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase依存をモック
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import auditDefault, {
  extractChanges,
  generateDescription,
  maskSensitiveData,
  createAuditLog,
  getStaffUser,
  getAdminUser,
} from '@/lib/audit'

describe('監査ログ ユーティリティ', () => {
  describe('extractChanges', () => {
    it('変更されたフィールドを抽出する', () => {
      const oldData = { name: '田中太郎', email: 'tanaka@example.com', phone: '090-1234-5678' }
      const newData = { name: '田中太郎', email: 'newtanaka@example.com', phone: '090-1234-5678' }

      const changes = extractChanges(oldData, newData)
      expect(changes).toEqual({
        email: { old: 'tanaka@example.com', new: 'newtanaka@example.com' },
      })
    })

    it('複数の変更を抽出する', () => {
      const oldData = { name: '田中太郎', email: 'tanaka@example.com' }
      const newData = { name: '山田花子', email: 'yamada@example.com' }

      const changes = extractChanges(oldData, newData)
      expect(changes).toEqual({
        name: { old: '田中太郎', new: '山田花子' },
        email: { old: 'tanaka@example.com', new: 'yamada@example.com' },
      })
    })

    it('updated_at と created_at は除外する', () => {
      const oldData = { name: '田中太郎', updated_at: '2024-01-01', created_at: '2024-01-01' }
      const newData = { name: '田中太郎', updated_at: '2024-02-01', created_at: '2024-01-01' }

      const changes = extractChanges(oldData, newData)
      expect(changes).toBeNull()
    })

    it('変更がない場合はnullを返す', () => {
      const data = { name: '田中太郎', email: 'tanaka@example.com' }
      const changes = extractChanges(data, { ...data })
      expect(changes).toBeNull()
    })

    it('新しいフィールドの追加を検出する', () => {
      const oldData = { name: '田中太郎' }
      const newData = { name: '田中太郎', phone: '090-1234-5678' }

      const changes = extractChanges(oldData, newData)
      expect(changes).toEqual({
        phone: { old: undefined, new: '090-1234-5678' },
      })
    })

    it('フィールドの削除を検出する', () => {
      const oldData = { name: '田中太郎', phone: '090-1234-5678' }
      const newData = { name: '田中太郎' }

      const changes = extractChanges(oldData, newData)
      expect(changes).toEqual({
        phone: { old: '090-1234-5678', new: undefined },
      })
    })

    it('oldDataがnullの場合はnullを返す', () => {
      expect(extractChanges(null, { name: 'test' })).toBeNull()
    })

    it('newDataがnullの場合はnullを返す', () => {
      expect(extractChanges({ name: 'test' }, null)).toBeNull()
    })

    it('ネストされたオブジェクトの変更を検出する', () => {
      const oldData = { meta: { key: 'value1' } }
      const newData = { meta: { key: 'value2' } }

      const changes = extractChanges(oldData, newData)
      expect(changes).toEqual({
        meta: { old: { key: 'value1' }, new: { key: 'value2' } },
      })
    })
  })

  describe('generateDescription', () => {
    it('テーブル名と操作を日本語で生成する', () => {
      expect(generateDescription('create', 'members')).toBe('会員を作成')
      expect(generateDescription('update', 'stores')).toBe('店舗を更新')
      expect(generateDescription('delete', 'bookings')).toBe('予約を削除')
    })

    it('会員名の識別情報を追加する', () => {
      const desc = generateDescription('update', 'members', { name: '田中太郎' })
      expect(desc).toBe('会員（田中太郎）を更新')
    })

    it('クラス名の識別情報を追加する', () => {
      const desc = generateDescription('create', 'classes', { name: 'キックボクシング初級' })
      expect(desc).toBe('クラス（キックボクシング初級）を作成')
    })

    it('お知らせタイトルの識別情報を追加する', () => {
      const desc = generateDescription('create', 'announcements', { title: '年末年始の営業について' })
      expect(desc).toBe('お知らせ（年末年始の営業について）を作成')
    })

    it('予約の会員名を識別情報として追加する', () => {
      const desc = generateDescription('delete', 'bookings', { member_name: '山田花子' })
      expect(desc).toBe('予約（山田花子）を削除')
    })

    it('料金プラン名の識別情報を追加する', () => {
      const desc = generateDescription('create', 'membership_plans', { name: '月額プラン' })
      expect(desc).toBe('料金プラン（月額プラン）を作成')
    })

    it('未定義のテーブル名はそのまま使用する', () => {
      const desc = generateDescription('create', 'unknown_table')
      expect(desc).toBe('unknown_tableを作成')
    })

    it('未定義の操作はそのまま使用する', () => {
      const desc = generateDescription('archive', 'members')
      expect(desc).toBe('会員をarchive')
    })

    it('ログイン/ログアウト操作を生成する', () => {
      expect(generateDescription('login', 'auth')).toBe('認証をログイン')
      expect(generateDescription('logout', 'auth')).toBe('認証をログアウト')
    })

    it('dataがnullでもエラーにならない', () => {
      const desc = generateDescription('create', 'members', null)
      expect(desc).toBe('会員を作成')
    })
  })

  describe('maskSensitiveData', () => {
    it('Stripeの顧客IDをマスクする', () => {
      const data = { name: '田中太郎', stripe_customer_id: 'cus_abc123' }
      const masked = maskSensitiveData(data)
      expect(masked.name).toBe('田中太郎')
      expect(masked.stripe_customer_id).toBe('***MASKED***')
    })

    it('Stripeのサブスクリプションをマスクする', () => {
      const data = { stripe_subscription_id: 'sub_xyz456' }
      const masked = maskSensitiveData(data)
      expect(masked.stripe_subscription_id).toBe('***MASKED***')
    })

    it('決済インテントIDをマスクする', () => {
      const data = { stripe_payment_intent_id: 'pi_test123' }
      const masked = maskSensitiveData(data)
      expect(masked.stripe_payment_intent_id).toBe('***MASKED***')
    })

    it('パスワードをマスクする', () => {
      const data = { password: 'secret123', password_hash: 'hashed_value' }
      const masked = maskSensitiveData(data)
      expect(masked.password).toBe('***MASKED***')
      expect(masked.password_hash).toBe('***MASKED***')
    })

    it('センシティブでないフィールドはそのまま残す', () => {
      const data = { name: '田中太郎', email: 'tanaka@example.com', phone: '090-1234-5678' }
      const masked = maskSensitiveData(data)
      expect(masked).toEqual(data)
    })

    it('元のデータを変更しない（イミュータブル）', () => {
      const data = { stripe_customer_id: 'cus_abc123' }
      maskSensitiveData(data)
      expect(data.stripe_customer_id).toBe('cus_abc123')
    })

    it('nullの場合はそのまま返す', () => {
      expect(maskSensitiveData(null)).toBeNull()
    })

    it('undefinedの場合はそのまま返す', () => {
      expect(maskSensitiveData(undefined)).toBeUndefined()
    })

    it('センシティブフィールドが空やnullの場合はマスクしない', () => {
      const data = { stripe_customer_id: null, password: '' }
      const masked = maskSensitiveData(data)
      expect(masked.stripe_customer_id).toBeNull()
      expect(masked.password).toBe('')
    })
  })

  describe('createAuditLog', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    function setupMockSupabase(insertResult = { data: { id: '1' }, error: null }) {
      const mockSingle = vi.fn().mockResolvedValue(insertResult)
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
      createAdminClient.mockReturnValue({ from: mockFrom })
      return { mockFrom, mockInsert, mockSelect, mockSingle }
    }

    it('adminUser指定で監査ログを作成する', async () => {
      const { mockFrom, mockInsert } = setupMockSupabase()

      const result = await createAuditLog({
        action: 'create',
        tableName: 'members',
        recordId: 'rec-123',
        newData: { name: '田中太郎' },
        adminUser: { id: 'admin-1', email: 'admin@test.com', name: 'Admin' },
      })

      expect(result).toEqual({ id: '1' })
      expect(mockFrom).toHaveBeenCalledWith('audit_logs')
      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.action).toBe('create')
      expect(insertArg.table_name).toBe('members')
      expect(insertArg.record_id).toBe('rec-123')
      expect(insertArg.admin_user_id).toBe('admin-1')
      expect(insertArg.admin_email).toBe('admin@test.com')
      expect(insertArg.description).toBe('会員（田中太郎）を作成')
    })

    it('リクエストからIP・UserAgentを取得する', async () => {
      const { mockInsert } = setupMockSupabase()

      const mockRequest = {
        headers: {
          get: (name) => {
            if (name === 'x-forwarded-for') return '1.2.3.4'
            if (name === 'user-agent') return 'TestBrowser/1.0'
            if (name === 'cookie') return ''
            return null
          },
        },
      }

      await createAuditLog({
        action: 'create',
        tableName: 'stores',
        adminUser: { id: 'admin-1', email: 'a@test.com', name: 'A' },
        request: mockRequest,
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.ip_address).toBe('1.2.3.4')
      expect(insertArg.user_agent).toBe('TestBrowser/1.0')
    })

    it('x-real-ipからIPを取得する', async () => {
      const { mockInsert } = setupMockSupabase()

      const mockRequest = {
        headers: {
          get: (name) => {
            if (name === 'x-real-ip') return '5.6.7.8'
            if (name === 'user-agent') return 'Agent'
            if (name === 'cookie') return ''
            return null
          },
        },
      }

      await createAuditLog({
        action: 'create',
        tableName: 'members',
        adminUser: { id: 'admin-1', email: 'a@test.com', name: 'A' },
        request: mockRequest,
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.ip_address).toBe('5.6.7.8')
    })

    it('update時にchangesを記録する', async () => {
      const { mockInsert } = setupMockSupabase()

      await createAuditLog({
        action: 'update',
        tableName: 'members',
        oldData: { name: '田中', email: 'a@test.com' },
        newData: { name: '山田', email: 'a@test.com' },
        adminUser: { id: 'admin-1', email: 'a@test.com', name: 'A' },
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.changes).toEqual({
        name: { old: '田中', new: '山田' },
      })
    })

    it('カスタムdescriptionを使用する', async () => {
      const { mockInsert } = setupMockSupabase()

      await createAuditLog({
        action: 'login',
        tableName: 'auth',
        description: 'カスタム説明',
        adminUser: { id: 'admin-1', email: 'a@test.com', name: 'A' },
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.description).toBe('カスタム説明')
    })

    it('insert失敗時はnullを返す', async () => {
      setupMockSupabase({ data: null, error: { message: 'DB error' } })

      const result = await createAuditLog({
        action: 'create',
        tableName: 'members',
        adminUser: { id: 'admin-1', email: 'a@test.com', name: 'A' },
      })

      expect(result).toBeNull()
    })

    it('例外発生時はnullを返す', async () => {
      createAdminClient.mockImplementation(() => {
        throw new Error('Connection failed')
      })

      const result = await createAuditLog({
        action: 'create',
        tableName: 'members',
      })

      expect(result).toBeNull()
    })

    it('adminUser未指定・request未指定の場合', async () => {
      const { mockInsert } = setupMockSupabase()

      await createAuditLog({
        action: 'delete',
        tableName: 'bookings',
        recordId: 'booking-1',
        oldData: { member_name: '山田花子' },
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.admin_user_id).toBeNull()
      expect(insertArg.admin_email).toBeNull()
      expect(insertArg.description).toBe('予約（山田花子）を削除')
    })

    it('adminUser未指定・request指定でスタッフを解決する', async () => {
      // Mock: from('staff') for staff lookup + from('audit_logs') for insert
      const mockStaffSingle = vi.fn().mockResolvedValue({
        data: { id: 'staff-1', email: 'staff@test.com', name: 'Staff' },
        error: null,
      })
      const mockStaffEq2 = vi.fn().mockReturnValue({ single: mockStaffSingle })
      const mockStaffEq = vi.fn().mockReturnValue({ eq: mockStaffEq2 })
      const mockStaffSelect = vi.fn().mockReturnValue({ eq: mockStaffEq })

      const mockInsertSingle = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
      const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect })

      const mockFrom = vi.fn((table) => {
        if (table === 'staff') return { select: mockStaffSelect }
        if (table === 'audit_logs') return { insert: mockInsert }
        return {}
      })

      createAdminClient.mockReturnValue({ from: mockFrom })

      // Mock auth
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'auth-user-1', email: 'user@test.com' } },
      })
      createServerClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      })

      const mockRequest = {
        headers: {
          get: (name) => {
            if (name === 'cookie') return 'session=abc'
            if (name === 'x-forwarded-for') return '1.2.3.4'
            if (name === 'user-agent') return 'TestBrowser'
            return null
          },
        },
      }

      await createAuditLog({
        action: 'create',
        tableName: 'members',
        request: mockRequest,
      })

      expect(mockGetUser).toHaveBeenCalled()
      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.admin_user_id).toBe('staff-1')
    })

    it('認証ユーザー解決でスタッフが見つからない場合はauthユーザー情報を使う', async () => {
      const mockStaffSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
      const mockStaffEq2 = vi.fn().mockReturnValue({ single: mockStaffSingle })
      const mockStaffEq = vi.fn().mockReturnValue({ eq: mockStaffEq2 })
      const mockStaffSelect = vi.fn().mockReturnValue({ eq: mockStaffEq })

      const mockInsertSingle = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
      const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect })

      const mockFrom = vi.fn((table) => {
        if (table === 'staff') return { select: mockStaffSelect }
        if (table === 'audit_logs') return { insert: mockInsert }
        return {}
      })
      createAdminClient.mockReturnValue({ from: mockFrom })

      const mockGetUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'auth-user-2',
            email: 'admin@test.com',
            user_metadata: { name: 'Admin User' },
          },
        },
      })
      createServerClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      })

      const mockRequest = {
        headers: {
          get: (name) => {
            if (name === 'cookie') return 'session=abc'
            return null
          },
        },
      }

      await createAuditLog({
        action: 'create',
        tableName: 'members',
        request: mockRequest,
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.admin_user_id).toBe('auth-user-2')
      expect(insertArg.admin_name).toBe('Admin User')
    })

    it('スタッフ未登録でuser_metadataにnameがない場合はメール名を使う', async () => {
      const mockStaffSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
      const mockStaffEq2 = vi.fn().mockReturnValue({ single: mockStaffSingle })
      const mockStaffEq = vi.fn().mockReturnValue({ eq: mockStaffEq2 })
      const mockStaffSelect = vi.fn().mockReturnValue({ eq: mockStaffEq })

      const mockInsertSingle = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
      const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect })

      const mockFrom = vi.fn((table) => {
        if (table === 'staff') return { select: mockStaffSelect }
        if (table === 'audit_logs') return { insert: mockInsert }
        return {}
      })
      createAdminClient.mockReturnValue({ from: mockFrom })

      const mockGetUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'auth-user-3',
            email: 'yamada@test.com',
            user_metadata: {},
          },
        },
      })
      createServerClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      })

      const mockRequest = {
        headers: {
          get: (name) => {
            if (name === 'cookie') return 'session=abc'
            return null
          },
        },
      }

      await createAuditLog({
        action: 'create',
        tableName: 'members',
        request: mockRequest,
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.admin_name).toBe('yamada')
    })

    it('認証ユーザー解決でエラーが発生してもログは作成される', async () => {
      const mockInsertSingle = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
      const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect })
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
      createAdminClient.mockReturnValue({ from: mockFrom })

      createServerClient.mockImplementation(() => {
        throw new Error('Auth error')
      })

      const mockRequest = {
        headers: {
          get: (name) => {
            if (name === 'cookie') return 'session=abc'
            return null
          },
        },
      }

      const result = await createAuditLog({
        action: 'create',
        tableName: 'members',
        request: mockRequest,
      })

      expect(result).toEqual({ id: '1' })
      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.admin_user_id).toBeNull()
    })
  })

  describe('getStaffUser', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('userIdがnullの場合はnullを返す', async () => {
      const result = await getStaffUser(null)
      expect(result).toBeNull()
    })

    it('userIdがundefinedの場合はnullを返す', async () => {
      const result = await getStaffUser(undefined)
      expect(result).toBeNull()
    })

    it('スタッフ情報を正常に取得する', async () => {
      const staffData = { id: 'staff-1', email: 'staff@test.com', name: 'Staff User' }
      const mockSingle = vi.fn().mockResolvedValue({ data: staffData, error: null })
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
      createAdminClient.mockReturnValue({ from: mockFrom })

      const result = await getStaffUser('auth-user-123')
      expect(result).toEqual(staffData)
      expect(mockFrom).toHaveBeenCalledWith('staff')
    })

    it('スタッフが見つからない場合はnullを返す', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
      createAdminClient.mockReturnValue({ from: mockFrom })

      const result = await getStaffUser('non-existent-user')
      expect(result).toBeNull()
    })

    it('例外発生時はnullを返す', async () => {
      createAdminClient.mockImplementation(() => {
        throw new Error('Connection failed')
      })

      const result = await getStaffUser('auth-user-123')
      expect(result).toBeNull()
    })
  })

  describe('getAdminUser', () => {
    it('getStaffUserのエイリアスである', () => {
      expect(getAdminUser).toBe(getStaffUser)
    })
  })

  describe('デフォルトエクスポート', () => {
    it('全ての関数を含む', () => {
      expect(auditDefault.createAuditLog).toBe(createAuditLog)
      expect(auditDefault.extractChanges).toBe(extractChanges)
      expect(auditDefault.generateDescription).toBe(generateDescription)
      expect(auditDefault.getStaffUser).toBe(getStaffUser)
      expect(auditDefault.getAdminUser).toBe(getAdminUser)
      expect(auditDefault.maskSensitiveData).toBe(maskSensitiveData)
    })

    it('テーブル名・操作名マッピングを含む', () => {
      expect(auditDefault.TABLE_NAMES_JA).toBeDefined()
      expect(auditDefault.TABLE_NAMES_JA.members).toBe('会員')
      expect(auditDefault.ACTION_NAMES_JA).toBeDefined()
      expect(auditDefault.ACTION_NAMES_JA.create).toBe('作成')
    })
  })
})
