import { createAdminClient } from '@/lib/supabase/server'

// メタデータは動的に生成（キャッシュしない）
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: store, error } = await supabase
    .from('stores')
    .select('name, is_active')
    .eq('site_slug', slug)
    .single()

  console.log('Store layout metadata - slug:', slug, 'store:', store?.name, 'is_active:', store?.is_active, 'error:', error?.message)

  // 店舗が見つからない場合のみnoindex（is_activeは別途クライアントでチェック）
  if (!store) {
    return {
      title: '店舗が見つかりません | FLOLIA',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  // 非公開の場合もタイトルは表示するが、noindexにする
  if (store.is_active === false) {
    return {
      title: `${store.name} | FLOLIA`,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: `${store.name} | FLOLIA`,
  }
}

export default function StoreLayout({ children }) {
  return children
}
