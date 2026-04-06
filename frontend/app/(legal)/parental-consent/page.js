'use client'

import { useEffect } from 'react'

export default function ParentalConsentPage() {
  useEffect(() => {
    // ページ読み込み時に印刷ダイアログを表示するオプション（コメントアウト）
    // window.print()
  }, [])

  const today = new Date()
  const formattedDate = `${today.getFullYear()}年　　月　　日`

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* 印刷ボタン（印刷時は非表示） */}
      <div className="no-print bg-violet-600 text-white py-4 px-6 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold">保護者同意書</h1>
            <p className="text-sm text-violet-200">印刷またはPDF保存してご利用ください</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="bg-white text-violet-600 px-4 py-2 rounded-lg font-medium hover:bg-violet-50 transition"
            >
              印刷 / PDF保存
            </button>
            <button
              onClick={() => window.history.back()}
              className="bg-violet-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-400 transition"
            >
              登録に戻る
            </button>
          </div>
        </div>
      </div>

      {/* 同意書本体 */}
      <div className="print-page bg-white min-h-screen py-8 px-6">
        <div className="max-w-3xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">保護者同意書</h1>
            <p className="text-gray-600">FLOLIA 入会申込用</p>
          </div>

          {/* 宛先 */}
          <div className="mb-8">
            <p className="text-lg">FLOLIA 運営責任者 殿</p>
          </div>

          {/* 本文 */}
          <div className="mb-8 leading-relaxed">
            <p className="mb-4">
              私は、下記の者が貴スタジオに入会することについて、保護者として同意いたします。
            </p>
            <p className="mb-4">
              また、下記事項について理解し、承諾いたします。
            </p>
          </div>

          {/* 入会者情報 */}
          <div className="border border-gray-300 mb-8">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
              <p className="font-bold">入会者情報</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex border-b border-gray-200 pb-2">
                <span className="w-32 text-gray-600">氏名</span>
                <span className="flex-1 border-b border-dotted border-gray-400"></span>
              </div>
              <div className="flex border-b border-gray-200 pb-2">
                <span className="w-32 text-gray-600">生年月日</span>
                <span className="flex-1">　　　　年　　　　月　　　　日生（　　　　歳）</span>
              </div>
              <div className="flex border-b border-gray-200 pb-2">
                <span className="w-32 text-gray-600">住所</span>
                <span className="flex-1 border-b border-dotted border-gray-400"></span>
              </div>
            </div>
          </div>

          {/* 同意事項 */}
          <div className="mb-8">
            <h2 className="font-bold text-lg mb-4 border-b-2 border-gray-800 pb-2">同意事項</h2>
            <ol className="list-decimal list-inside space-y-3 text-sm leading-relaxed">
              <li>
                <span className="font-medium">施設利用について</span><br />
                <span className="ml-5 block text-gray-700">
                  入会者が施設を利用するにあたり、スタジオの利用規約およびルールを遵守させます。
                </span>
              </li>
              <li>
                <span className="font-medium">健康状態について</span><br />
                <span className="ml-5 block text-gray-700">
                  入会者の健康状態がキックボクシングを行うのに適していることを確認しています。持病がある場合は事前にスタッフに申告いたします。
                </span>
              </li>
              <li>
                <span className="font-medium">傷害・事故について</span><br />
                <span className="ml-5 block text-gray-700">
                  キックボクシングは格闘技であり、怪我のリスクがあることを理解しています。施設側に故意または重大な過失がない限り、トレーニング中に発生した傷害・事故について、施設側に損害賠償を請求しないことに同意します。
                </span>
              </li>
              <li>
                <span className="font-medium">料金の支払いについて</span><br />
                <span className="ml-5 block text-gray-700">
                  入会者の月会費その他の料金について、保護者として支払いの責任を負います。
                </span>
              </li>
              <li>
                <span className="font-medium">個人情報の取り扱いについて</span><br />
                <span className="ml-5 block text-gray-700">
                  入会者の個人情報がプライバシーポリシーに基づき取り扱われることに同意します。
                </span>
              </li>
              <li>
                <span className="font-medium">緊急時の連絡について</span><br />
                <span className="ml-5 block text-gray-700">
                  緊急時には下記の連絡先に連絡があることを了承し、適切に対応いたします。
                </span>
              </li>
            </ol>
          </div>

          {/* 保護者情報 */}
          <div className="border border-gray-300 mb-8">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
              <p className="font-bold">保護者情報</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex border-b border-gray-200 pb-2">
                <span className="w-32 text-gray-600">氏名</span>
                <span className="flex-1 border-b border-dotted border-gray-400"></span>
              </div>
              <div className="flex border-b border-gray-200 pb-2">
                <span className="w-32 text-gray-600">続柄</span>
                <span className="flex-1 border-b border-dotted border-gray-400"></span>
              </div>
              <div className="flex border-b border-gray-200 pb-2">
                <span className="w-32 text-gray-600">住所</span>
                <span className="flex-1 border-b border-dotted border-gray-400"></span>
              </div>
              <div className="flex border-b border-gray-200 pb-2">
                <span className="w-32 text-gray-600">電話番号</span>
                <span className="flex-1 border-b border-dotted border-gray-400"></span>
              </div>
            </div>
          </div>

          {/* 署名欄 */}
          <div className="border-2 border-gray-800 p-6 mb-8">
            <p className="mb-6">
              上記の内容を確認し、入会者が貴スタジオに入会することに同意いたします。
            </p>
            <div className="space-y-6">
              <div className="flex items-end">
                <span className="w-24 text-gray-600">同意日</span>
                <span className="flex-1 text-center">{formattedDate}</span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-gray-600">保護者署名</span>
                <span className="flex-1 border-b-2 border-gray-800 h-12"></span>
                <span className="ml-2">印</span>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
            <p>FLOLIA - キックボクシングスタジオ</p>
            <p className="mt-1">本同意書は入会手続き時にスタジオへご提出ください</p>
          </div>
        </div>
      </div>
    </>
  )
}
