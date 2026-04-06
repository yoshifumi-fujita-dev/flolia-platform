import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { signAdminAccessToken, verifyAdminAccessToken } from '@/lib/auth/admin-access-token'

// 秘密の管理画面パス（環境変数で設定、デフォルト: backoffice）
const ADMIN_SECRET_PATH = process.env.ADMIN_SECRET_PATH || 'backoffice'

// 認証が必要なAPIパス（これらはMiddlewareで認証チェックを行う）
const PROTECTED_API_PATHS = [
  '/api/members',
  '/api/bookings',
  '/api/payments',
  '/api/refunds',
  '/api/schedules',
  '/api/classes',
  '/api/plans',
  '/api/stores',
  '/api/revalidate',
  '/api/staff',
  '/api/instructors',
  '/api/facilities',
  '/api/testimonials',
  '/api/analytics',
  '/api/audit-logs',
  '/api/attendance',
  '/api/cancellations',
  '/api/line-notifications',
  '/api/member/card-pdf',
  '/api/product-categories',
  '/api/products',
  '/api/upload',
  '/api/auth/users',
  '/api/careers',
  '/api/substitute-requests',
  '/api/staff-attendances',
  '/api/contract-templates',
  '/api/legal-pages',
  '/api/expenses',
  '/api/mf-export',
  '/api/inquiries',
  '/api/partner-offers',
]

// 認証不要なAPIパス（cronジョブなど）
const PUBLIC_API_PATHS = [
  '/api/cron',
  '/api/public',
  '/api/register',
  '/api/verification',
  '/api/stripe',
  '/api/line/webhook',
  '/api/line/inquiry-webhook',
  '/api/analytics/page-view',
  '/api/analytics/event',
  '/api/analytics/aggregate',
  '/api/tablet',
  '/api/staff-onboarding', // スタッフオンボーディング（トークンベース認証）
]

// すべてのレスポンスに x-request-id を付与するヘルパー
function withRequestId(response, requestId) {
  response.headers.set('x-request-id', requestId)
  return response
}

// Supabaseクライアントを作成するヘルパー
function createSupabaseClient(request, response) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname

  // リクエストIDを冒頭で1回生成/取得（全パス共通）
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()

  // 秘密のパスへのアクセス: /{SECRET_PATH}/* → /admin/* にリライト
  const isSecretPath = pathname.startsWith(`/${ADMIN_SECRET_PATH}`)
  const isBackofficeAlias = ADMIN_SECRET_PATH !== 'backoffice' && pathname.startsWith('/backoffice')
  if (isSecretPath || isBackofficeAlias) {
    // セッションCookieを設定して管理画面アクセスを許可
    const secretPrefix = isSecretPath ? `/${ADMIN_SECRET_PATH}` : '/backoffice'
    const newPathname = pathname.replace(secretPrefix, '/admin')
    const url = request.nextUrl.clone()
    url.pathname = newPathname

    const response = NextResponse.rewrite(url)
    // 署名付きランダムトークンを生成（24時間有効）
    const token = await signAdminAccessToken()
    response.cookies.set('admin_access', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24時間
    })
    return withRequestId(response, requestId)
  }

  // 認証が必要なAPIへのアクセス
  if (pathname.startsWith('/api/')) {
    // 公開APIはスキップ
    if (PUBLIC_API_PATHS.some(path => pathname.startsWith(path))) {
      return withRequestId(NextResponse.next(), requestId)
    }

    // 認証が必要なAPIかチェック
    const isProtectedApi = PROTECTED_API_PATHS.some(path => pathname.startsWith(path))
    if (isProtectedApi) {
      const requestHeaders = new Headers(request.headers)
      // X-Request-Id を伝播させる（冒頭で生成済み）
      requestHeaders.set('x-request-id', requestId)
      let response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })

      const supabase = createSupabaseClient(request, response)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ success: false, error: '認証が必要です', error_code: 'UNAUTHORIZED' }, { status: 401, headers: { 'x-request-id': requestId } })
      }

      // スタッフ情報を取得（service_role_keyを使用）
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          cookies: {
            getAll() { return [] },
            setAll() {},
          },
        }
      )

      const { data: staff, error: staffError } = await adminSupabase
        .from('staff')
        .select('id, role_id, email, name, roles(id, name, permissions), is_active')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .single()

      if (staffError || !staff) {
        return NextResponse.json({ success: false, error: '権限がありません', error_code: 'PERMISSION_DENIED' }, { status: 403, headers: { 'x-request-id': requestId } })
      }

      // 認証情報をヘッダーに追加してAPIに渡す
      requestHeaders.set('x-staff-id', staff.id)
      requestHeaders.set('x-staff-role-id', staff.role_id)
      requestHeaders.set('x-staff-role-name', staff.roles?.name || '')
      requestHeaders.set('x-staff-permissions', JSON.stringify(staff.roles?.permissions || []))
      requestHeaders.set('x-user-id', user.id)
      // 監査ログ用にemailとnameも設定（日本語名はURLエンコード）
      requestHeaders.set('x-staff-email', staff.email || '')
      requestHeaders.set('x-staff-name', staff.name ? encodeURIComponent(staff.name) : '')

      const nextResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      return withRequestId(nextResponse, requestId)
    }

    // PROTECTED/PUBLIC どちらにも該当しない /api/* はデフォルト拒否
    return NextResponse.json(
      { success: false, error: '認証が必要です', error_code: 'UNAUTHORIZED' },
      { status: 401, headers: { 'x-request-id': requestId } }
    )
  }

  // /admin への直接アクセスをブロック（秘密パス経由のアクセスのみ許可）
  if (pathname.startsWith('/admin')) {
    const adminAccessCookie = request.cookies.get('admin_access')

    // Cookieがないか、署名検証に失敗した場合は404を返す（管理画面の存在を隠す）
    const isValidToken = adminAccessCookie ? await verifyAdminAccessToken(adminAccessCookie.value) : false
    if (!isValidToken) {
      // 404ページにリライト（管理画面の存在を隠蔽）
      return withRequestId(new NextResponse('Not Found', { status: 404 }), requestId)
    }

    // ログインページはスキップ（認証不要）
    if (pathname === '/admin/login') {
      return withRequestId(NextResponse.next(), requestId)
    }

    // 認証チェック
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createSupabaseClient(request, response)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // 秘密のパスでログインページにリダイレクト
      return withRequestId(NextResponse.redirect(new URL(`/${ADMIN_SECRET_PATH}/login`, request.url)), requestId)
    }

    return withRequestId(response, requestId)
  }

  // その他のパスはスキップ
  return withRequestId(NextResponse.next(), requestId)
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    // 環境変数で設定可能な秘密のパス用（デフォルト: backoffice）
    '/backoffice/:path*',
  ]
}
