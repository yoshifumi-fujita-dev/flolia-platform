import LegalPage from '@/components/LegalPage'

export const metadata = {
  title: '特定商取引法に基づく表記 | FLOLIA',
  description: 'FLOLIAの特定商取引法に基づく表記',
}

export default function TokushohoPage() {
  return <LegalPage slug="tokushoho" fallbackTitle="特定商取引法に基づく表記" />
}
