'use client'

import { useState, useEffect, useRef } from 'react'
import NextImage from 'next/image'
import {
  Video,
  Trash2,
  RefreshCw,
  Image,
  Plus,
  Info,
  FolderOpen,
  Check,
} from 'lucide-react'
import Link from 'next/link'

// 共通動画ファイルの定義（ローカル管理）
const COMMON_VIDEO_FILES = [
  { key: 'concept', label: 'コンセプト動画', description: 'コンセプトセクションの背景動画', path: '/videos/concept.mp4' },
  { key: 'cta', label: 'Trainer背景動画', description: 'Trainerセクションの背景動画', path: '/videos/cta.mp4' },
]

// 店舗固有の動画を取得
const getStoreVideoFiles = (storeSlug) => [
  { key: 'hero', label: 'メイン動画', description: 'トップページのメインビジュアル動画（店舗ごと）', path: `/videos/hero-${storeSlug}.mp4` },
]

export default function StoreMediaPage() {
  const [stores, setStores] = useState([])
  const [selectedStoreSlug, setSelectedStoreSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ギャラリー用
  const [galleryImages, setGalleryImages] = useState([])
  const [galleryUploading, setGalleryUploading] = useState(false)
  const galleryInputRef = useRef(null)

  // 店舗一覧を取得
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores?include_inactive=true')
        const data = await res.json()
        if (res.ok) {
          // site_slugがある店舗のみ
          const storesWithSlug = (data.stores || []).filter(s => s.site_slug)
          setStores(storesWithSlug)
          // 最初の店舗を自動選択
          if (storesWithSlug.length > 0 && !selectedStoreSlug) {
            setSelectedStoreSlug(storesWithSlug[0].site_slug)
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStores()
  }, [])

  useEffect(() => {
    if (selectedStoreSlug) {
      fetchGallery(selectedStoreSlug)
    }
  }, [selectedStoreSlug])

  // ギャラリー画像一覧を取得
  const fetchGallery = async (slug) => {
    if (!slug) return
    setLoading(true)
    try {
      const res = await fetch(`/api/upload/gallery?store_slug=${slug}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) {
        setGalleryImages(data.images || [])
      }
    } catch (err) {
      console.error('Failed to fetch gallery:', err)
    } finally {
      setLoading(false)
    }
  }

  // ギャラリー画像アップロード
  const handleGalleryUpload = async (files) => {
    if (!files || files.length === 0) return
    if (!selectedStoreSlug) {
      setError('店舗を選択してください')
      return
    }

    setGalleryUploading(true)
    setError(null)

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('store_slug', selectedStoreSlug)

        const res = await fetch('/api/upload/gallery', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'アップロードに失敗しました')
        }
      }

      // ギャラリーを更新
      await fetchGallery(selectedStoreSlug)
    } catch (err) {
      setError(err.message)
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    }
  }

  // ギャラリー画像削除
  const handleGalleryDelete = async (path) => {
    if (!confirm('この画像を削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/upload/gallery?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '削除に失敗しました')
      }

      // ギャラリーを更新
      await fetchGallery(selectedStoreSlug)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Image className="w-7 h-7" />
          サイトメディア管理
        </h1>
        <p className="text-gray-400 mt-1">ランディングページの動画・画像を管理</p>
      </div>

      {/* Store Selector */}
      <div className="mb-6 bg-gray-800 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          対象店舗を選択
        </label>
        {stores.length === 0 ? (
          <div className="text-gray-400 text-sm">
            サイトURL用スラッグが設定された店舗がありません。
            <Link href="/backoffice/stores" className="text-violet-400 hover:underline ml-1">
              店舗管理
            </Link>
            でスラッグを設定してください。
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <select
              value={selectedStoreSlug}
              onChange={(e) => setSelectedStoreSlug(e.target.value)}
              className="w-full md:w-80 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.site_slug}>
                  {store.name}（{store.site_slug}）
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchGallery(selectedStoreSlug)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Media Grid */}
      <div className="space-y-8">
        {/* Videos Section - Info Only */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-violet-400" />
            動画
          </h2>

          {/* Info Box */}
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-blue-300 font-medium mb-2">動画の管理について</h3>
                <p className="text-blue-200/80 text-sm mb-3">
                  動画ファイルは高速配信のため、プロジェクトの <code className="bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-300">public/videos/</code> フォルダで管理しています。
                  動画を変更する場合は、以下の手順で行ってください。
                </p>
                <ol className="text-blue-200/80 text-sm space-y-1 list-decimal list-inside">
                  <li>新しい動画ファイルを用意（MP4形式推奨）</li>
                  <li><code className="bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-300">public/videos/</code> 内の該当ファイルを差し替え</li>
                  <li>Git でコミット & プッシュ</li>
                  <li>Vercel が自動でデプロイ</li>
                </ol>
                <div className="mt-3 pt-3 border-t border-blue-700/30">
                  <p className="text-blue-200/80 text-sm">
                    <strong className="text-blue-300">店舗固有の動画:</strong> メイン動画は店舗ごとに設定できます。<br />
                    ファイル名: <code className="bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-300">hero-[店舗スラッグ].mp4</code>（例: hero-tsujido.mp4）
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 店舗固有の動画 */}
          {selectedStoreSlug && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-violet-400 mb-3">店舗固有の動画</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {getStoreVideoFiles(selectedStoreSlug).map((video) => (
                  <div key={video.key} className="bg-gray-800 rounded-lg overflow-hidden border border-violet-700/50">
                    {/* Preview Area */}
                    <div className="aspect-video bg-gray-900 relative">
                      <video
                        src={video.path}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.target.play()}
                        onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0 }}
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-violet-600 text-white text-xs rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        店舗固有
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-white font-medium mb-1">{video.label}</h3>
                      <p className="text-xs text-gray-500 mb-2">{video.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-700/50 px-2 py-1.5 rounded">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <code>{video.path}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 共通動画 */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">共通動画（全店舗で使用）</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {COMMON_VIDEO_FILES.map((video) => (
                <div key={video.key} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                  {/* Preview Area */}
                  <div className="aspect-video bg-gray-900 relative">
                    <video
                      src={video.path}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0 }}
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      共通
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-1">{video.label}</h3>
                    <p className="text-xs text-gray-500 mb-2">{video.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-700/50 px-2 py-1.5 rounded">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <code>{video.path}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-violet-400" />
            ギャラリースライド
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            ランディングページで表示されるスライドショー画像（複数アップロード可）
          </p>

          {/* Upload Area */}
          <div className="mb-4">
            <label className="block">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => handleGalleryUpload(Array.from(e.target.files || []))}
                ref={galleryInputRef}
                className="hidden"
                disabled={galleryUploading}
              />
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 hover:border-violet-500 transition-colors">
                {galleryUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-300">アップロード中...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-violet-400" />
                    <span className="text-gray-300">画像を追加（複数選択可）</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Gallery Grid */}
          {galleryImages.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
              ギャラリー画像がありません
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {galleryImages.map((img, index) => (
                <div
                  key={img.path}
                  className="relative group aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
                >
                  <NextImage
                    src={img.url}
                    alt={`Gallery ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 16vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleGalleryDelete(img.path)}
                      className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white font-medium mb-3">推奨仕様</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
          <div>
            <h4 className="text-violet-400 font-medium mb-2">動画</h4>
            <ul className="space-y-1">
              <li>• 形式: MP4（H.264推奨）</li>
              <li>• 最大サイズ: 10MB以下推奨</li>
              <li>• 推奨解像度: 1920x1080</li>
              <li>• ループ再生に適した内容を推奨</li>
              <li>• 保存場所: <code className="bg-gray-700 px-1 rounded">public/videos/</code></li>
            </ul>
          </div>
          <div>
            <h4 className="text-violet-400 font-medium mb-2">ギャラリー画像</h4>
            <ul className="space-y-1">
              <li>• 形式: JPG, PNG, WebP</li>
              <li>• 最大サイズ: 10MB</li>
              <li>• 推奨解像度: 1920x1080 以上</li>
              <li>• スライドショーとして表示されます</li>
              <li>• Supabase Storageに保存</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
