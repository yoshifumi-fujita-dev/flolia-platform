import LegalPage from '@/components/LegalPage'

export const metadata = {
  title: '免責事項 | FLOLIA',
  description: 'FLOLIAの免責事項',
}

export default function DisclaimerPage() {
  return <LegalPage slug="disclaimer" fallbackTitle="免責事項" />
}
