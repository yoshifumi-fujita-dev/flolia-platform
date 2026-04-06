import Stripe from 'stripe'

// サーバーサイド用Stripeクライアント
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
})

// 料金プランはDBの membership_plans テーブルから動的に取得
// 以前のハードコード定義は削除しました
