'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

// HTMLタグが含まれているかチェック
function isHtmlContent(content) {
  return /<[a-z][\s\S]*>/i.test(content)
}

export default function LegalPage({ slug, fallbackTitle }) {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/public/legal/${slug}`)
        if (!res.ok) {
          throw new Error('ページの取得に失敗しました')
        }
        const data = await res.json()
        setPage(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPage()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{fallbackTitle}</h1>
            <p className="text-red-500">{error}</p>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link href="/" className="text-pink-600 hover:text-pink-700 text-sm">
                ← トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isHtml = isHtmlContent(page.content || '')

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{page.title}</h1>
          {page.updated_at && (
            <p className="text-sm text-gray-500 mb-6">
              最終更新日: {new Date(page.updated_at).toLocaleDateString('ja-JP')}
            </p>
          )}

          <div className="prose prose-gray max-w-none">
            {isHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: page.content }}
                className="legal-content"
              />
            ) : (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-4">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700">{children}</li>
                  ),
                  hr: () => (
                    <hr className="my-8 border-gray-200" />
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">{children}</strong>
                  ),
                }}
              >
                {page.content}
              </ReactMarkdown>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href="/" className="text-pink-600 hover:text-pink-700 text-sm">
              ← トップページに戻る
            </Link>
          </div>
        </div>
      </div>

      {isHtml && (
        <style jsx global>{`
          .legal-content h1 {
            font-size: 1.75rem;
            font-weight: 700;
            color: #111827;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .legal-content h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #111827;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
          }
          .legal-content h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #111827;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }
          .legal-content p {
            color: #374151;
            margin-bottom: 1rem;
          }
          .legal-content ul {
            list-style-type: disc;
            list-style-position: inside;
            color: #374151;
            margin-bottom: 1rem;
          }
          .legal-content ol {
            list-style-type: decimal;
            list-style-position: inside;
            color: #374151;
            margin-bottom: 1rem;
          }
          .legal-content li {
            color: #374151;
            margin-bottom: 0.5rem;
          }
          .legal-content hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 2rem 0;
          }
          .legal-content a {
            color: #db2777;
            text-decoration: underline;
          }
          .legal-content a:hover {
            color: #be185d;
          }
          .legal-content strong {
            font-weight: 600;
            color: #111827;
          }
        `}</style>
      )}
    </div>
  )
}
