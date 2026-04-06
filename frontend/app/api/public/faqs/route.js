import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 公開用FAQ一覧取得（オンデマンド再検証）
export async function GET() {
  try {
    const getFaqs = unstable_cache(
      async () => {
        const supabase = createAdminClient()

        const { data: faqs, error } = await supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (error) {
          throw error
        }

        return faqs
      },
      ['faqs'],
      { tags: [CACHE_TAGS.FAQS] }
    )

    const faqs = await getFaqs()

    return okResponse({ faqs })
  } catch (error) {
    return internalErrorResponse('Public FAQs API', error)
  }
}
