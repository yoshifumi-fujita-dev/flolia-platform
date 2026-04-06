'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, RotateCcw, Check, Loader2, AlertCircle, User } from 'lucide-react'

export default function PhotoCapture({ onPhotoSaved, memberId }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState('user') // 'user' = フロントカメラ

  // カメラを起動
  const startCamera = useCallback(async () => {
    setError('')
    try {
      // 既存のストリームを停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError') {
        setError('カメラへのアクセスが拒否されました。ブラウザの設定でカメラへのアクセスを許可してください。')
      } else if (err.name === 'NotFoundError') {
        setError('カメラが見つかりません。カメラが接続されているか確認してください。')
      } else {
        setError('カメラの起動に失敗しました。')
      }
    }
  }, [facingMode, stream])

  // 初回起動
  useEffect(() => {
    startCamera()

    return () => {
      // クリーンアップ
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // facingModeが変わったらカメラを再起動
  useEffect(() => {
    if (stream) {
      startCamera()
    }
  }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // 写真を撮影
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // キャンバスサイズを設定
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // フロントカメラの場合は左右反転して描画
    if (facingMode === 'user') {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }

    context.drawImage(video, 0, 0)

    // 画像データを取得
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageData)

    // カメラを停止
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  // 撮り直し
  const retake = () => {
    setCapturedImage(null)
    setError('')
    startCamera()
  }

  // 写真をアップロード
  const uploadPhoto = async () => {
    if (!capturedImage || !memberId) return

    setIsUploading(true)
    setError('')

    try {
      // Base64をBlobに変換
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      // FormDataを作成
      const formData = new FormData()
      formData.append('photo', blob, 'photo.jpg')

      // アップロード
      const res = await fetch(`/api/members/${memberId}/photo`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      // 成功
      onPhotoSaved(data.photo_url)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'アップロードに失敗しました')
    } finally {
      setIsUploading(false)
    }
  }

  // カメラ切り替え
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">会員証用写真の撮影</h2>

      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-violet-800">
          会員証カードに印刷する写真を撮影します。<br />
          正面を向いて、お顔全体が写るようにしてください。
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[4/3]">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* ガイド枠 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-60 border-2 border-white/50 rounded-full" />
            </div>

            {/* カメラ未起動時のプレースホルダー */}
            {!isCameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center text-white">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                  <p className="text-sm">カメラを起動中...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={capturedImage}
            alt="撮影した写真"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* 非表示のキャンバス（撮影用） */}
      <canvas ref={canvasRef} className="hidden" />

      {/* コントロールボタン */}
      <div className="flex justify-center gap-4">
        {!capturedImage ? (
          <>
            {/* カメラ切り替えボタン（モバイル用） */}
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!isCameraReady}
              className="p-4 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
              title="カメラ切り替え"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            {/* 撮影ボタン */}
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!isCameraReady}
              className="p-6 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 shadow-lg"
            >
              <Camera className="w-8 h-8" />
            </button>

            <div className="w-14" /> {/* スペーサー */}
          </>
        ) : (
          <>
            {/* 撮り直しボタン */}
            <button
              type="button"
              onClick={retake}
              disabled={isUploading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-5 h-5" />
              撮り直す
            </button>

            {/* 保存ボタン */}
            <button
              type="button"
              onClick={uploadPhoto}
              disabled={isUploading}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  この写真を使用する
                </>
              )}
            </button>
          </>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          写真は会員証カードの作成と、入館時の本人確認に使用されます。
        </p>
      </div>
    </div>
  )
}
