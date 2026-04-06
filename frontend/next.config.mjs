import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase Storage
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // LINE プロフィール画像
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
      },
      {
        // LINE プロフィール画像（別ドメイン）
        protocol: 'https',
        hostname: 'obs.line-scdn.net',
      },
      {
        // LINE 公式アカウント QRコード
        protocol: 'https',
        hostname: 'qr-official.line.me',
      },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry organization と project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // ソースマップのアップロード（本番ビルド時のみ）
  silent: !process.env.CI,

  // Vercel Cron など Edge Runtime での互換性
  widenClientFileUpload: true,

  // トンネルルートでAd Blockerを回避（オプション）
  // tunnelRoute: "/monitoring",

  // Sentry の自動インストゥルメンテーションを無効にするルート
  hideSourceMaps: true,

  // Webpack設定
  webpack: {
    // デバッグログを削除（バンドルサイズ最適化）
    treeshake: {
      removeDebugLogging: true,
    },
    // Vercel monitors
    automaticVercelMonitors: true,
  },
});
