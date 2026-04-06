'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronUp, HelpCircle, ArrowLeft } from 'lucide-react'

export default function FaqPage() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState({})

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await fetch('/api/public/faqs')
        const data = await res.json()
        if (res.ok) {
          setFaqs(data.faqs || [])

          // 最初のFAQを開いた状態にする
          const expanded = {}
          data.faqs?.forEach((faq, index) => {
            if (index === 0) expanded[faq.id] = true
          })
          setExpandedItems(expanded)
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaqs()
  }, [])

  const toggleItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>トップに戻る</span>
          </Link>
          <Link href="/">
            <Image src="/logo.png" alt="FLOLIA" width={120} height={40} className="h-10 w-auto" priority />
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* タイトル */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mb-4">
            <HelpCircle className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            よくあるご質問
          </h1>
          <p className="text-gray-600">
            お客様からよくいただくご質問をまとめました
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            FAQが登録されていません
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* 質問 */}
                <button
                  onClick={() => toggleItem(faq.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-violet-600 font-bold text-lg">Q</span>
                    <span className="font-medium text-gray-900">{faq.question}</span>
                  </div>
                  {expandedItems[faq.id] ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* 回答 */}
                {expandedItems[faq.id] && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="flex items-start gap-3 pt-4">
                      <span className="text-violet-600 font-bold text-lg">A</span>
                      <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* お問い合わせへの誘導 */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl p-8 text-white">
            <h3 className="text-xl font-bold mb-2">
              お探しの回答が見つかりませんか？
            </h3>
            <p className="text-violet-100 mb-6">
              お気軽にお問い合わせください
            </p>
            <Link
              href="/#access"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-600 font-semibold rounded-full hover:bg-violet-50 transition-colors"
            >
              お問い合わせはこちら
            </Link>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-8 border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link href="/" className="inline-block mb-4">
            <Image src="/logo.png" alt="FLOLIA" width={144} height={48} className="h-12 w-auto" />
          </Link>
          <p className="text-gray-500 text-sm">
            © 2025 FLOLIA Kickboxing Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
