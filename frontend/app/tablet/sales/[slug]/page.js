'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ShoppingCart,
  QrCode,
  CheckCircle,
  XCircle,
  User,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Package,
  LogOut,
} from 'lucide-react'

// 状態
const STATE = {
  LOADING: 'loading',
  SELECT: 'select',
  SCAN: 'scan',
  CONFIRM: 'confirm',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  NOT_FOUND: 'not_found',
}

// セッションキー（物販専用）
const SESSION_KEY = 'tablet_sales_session'

export default function TabletSalesByStorePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug
  const scannerRef = useRef(null)

  const [state, setState] = useState(STATE.LOADING)
  const [store, setStore] = useState(null)
  const [member, setMember] = useState(null)
  const [products, setProducts] = useState([])
  const [productStock, setProductStock] = useState({})
  const [cart, setCart] = useState([])
  const [error, setError] = useState('')
  const [purchaseResult, setPurchaseResult] = useState(null)
  const [staffName, setStaffName] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // 認証チェック
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setIsAuthChecking(true)
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        router.replace('/tablet/sales/login')
        return
      }

      const session = JSON.parse(sessionData)

      if (new Date(session.expires_at) < new Date()) {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/sales/login')
        return
      }

      const res = await fetch(`/api/tablet/auth?token=${session.token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          setStaffName(data.session.staff_name)
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem(SESSION_KEY)
          router.replace('/tablet/sales/login')
          return
        }
      } else {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/sales/login')
        return
      }
    } catch (error) {
      console.error('Auth check error:', error)
      localStorage.removeItem(SESSION_KEY)
      router.replace('/tablet/sales/login')
    } finally {
      setIsAuthChecking(false)
    }
  }

  // 店舗情報を取得
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/public/store?site_slug=${slug}&preview=true`)
        if (res.ok) {
          const data = await res.json()
          if (data.store) {
            setStore(data.store)
            setState(STATE.SELECT)
          } else {
            setState(STATE.NOT_FOUND)
          }
        } else {
          setState(STATE.NOT_FOUND)
        }
      } catch (err) {
        console.error('Failed to fetch store:', err)
        setState(STATE.NOT_FOUND)
      }
    }
    fetchStore()
  }, [slug, isAuthenticated])

  // 商品一覧を取得
  useEffect(() => {
    if (!store) return

    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/public/products?store_id=${store.id}`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
      }
    }
    fetchProducts()
  }, [store])

  // 在庫情報を取得
  useEffect(() => {
    if (!store) return

    const fetchInventory = async () => {
      try {
        const res = await fetch(`/api/public/inventory?store_id=${store.id}`)
        if (res.ok) {
          const data = await res.json()
          const stockMap = {}
          for (const item of (data.inventory || [])) {
            stockMap[item.product_id] = item.current_stock
          }
          setProductStock(stockMap)
        }
      } catch (err) {
        console.error('Failed to fetch inventory:', err)
      }
    }
    fetchInventory()
  }, [store])

  // QRコードスキャナー初期化
  useEffect(() => {
    if (state !== STATE.SCAN || !store) return

    let html5QrCode = null
    let isMounted = true

    const initScanner = async () => {
      await new Promise(resolve => setTimeout(resolve, 100))

      const element = document.getElementById('qr-reader-sales')
      if (!element || !isMounted) return

      try {
        const { Html5Qrcode } = await import('html5-qrcode')

        html5QrCode = new Html5Qrcode('qr-reader-sales')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          () => {}
        )
      } catch (err) {
        console.error('Scanner init error:', err)
        if (err.message?.includes('NotFoundError') || err.name === 'NotFoundError') {
          try {
            await html5QrCode?.start(
              { facingMode: 'user' },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
              },
              onScanSuccess,
              () => {}
            )
          } catch (fallbackErr) {
            console.error('Fallback scanner error:', fallbackErr)
          }
        }
      }
    }

    initScanner()

    return () => {
      isMounted = false
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {})
      }
    }
  }, [state, store])

  const onScanSuccess = async (decodedText) => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
    }

    const match = decodedText.match(/^flolia:\/\/member\/(.+)$/)
    if (!match) {
      setError('無効なQRコードです')
      setState(STATE.ERROR)
      return
    }

    const token = match[1]

    try {
      const res = await fetch('/api/tablet/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '会員情報の取得に失敗しました')
        setState(STATE.ERROR)
        return
      }

      if (!data.member.stripe_customer_id) {
        setError('この会員はカード情報が登録されていません')
        setState(STATE.ERROR)
        return
      }

      setMember(data.member)
      setState(STATE.CONFIRM)
    } catch (err) {
      setError('通信エラーが発生しました')
      setState(STATE.ERROR)
    }
  }

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const getProductStock = (productId) => {
    return productStock[productId] ?? null
  }

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta
        if (newQuantity < 1) return item
        const stock = getProductStock(productId)
        if (stock !== null && newQuantity > stock) return item
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const proceedToScan = () => {
    if (cart.length === 0) return
    setState(STATE.SCAN)
  }

  const handlePurchase = async () => {
    if (cart.length === 0 || !store || !member) return

    setState(STATE.PROCESSING)

    try {
      const results = []
      for (const item of cart) {
        const res = await fetch('/api/products/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: member.id,
            store_id: store.id,
            product_id: item.product.id,
            quantity: item.quantity,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || '決済に失敗しました')
        }
        results.push(data.purchase)
      }

      setPurchaseResult({
        items: cart,
        total: totalAmount,
        memberName: member.name,
      })
      setState(STATE.SUCCESS)
    } catch (err) {
      setError(err.message)
      setState(STATE.ERROR)
    }
  }

  const reset = () => {
    setMember(null)
    setCart([])
    setError('')
    setPurchaseResult(null)
    setState(STATE.SELECT)
  }

  const backToSelect = () => {
    setMember(null)
    setState(STATE.SELECT)
  }

  const backToStoreSelect = () => {
    router.push('/tablet/sales')
  }

  const handleLogout = async () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        await fetch(`/api/tablet/auth?token=${session.token}`, {
          method: 'DELETE',
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem(SESSION_KEY)
      router.replace('/tablet/sales/login')
    }
  }

  if (isAuthChecking || state === STATE.LOADING) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
      </div>
    )
  }

  if (state === STATE.NOT_FOUND) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">店舗が見つかりません</h1>
          <p className="text-gray-400 mb-6">URLを確認してください</p>
          <button
            onClick={backToStoreSelect}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
          >
            店舗選択に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={backToStoreSelect} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-pink-400" />
              <h1 className="text-2xl font-bold">物販</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-4 py-2 bg-gray-700 rounded-lg text-white">
              {store?.name}
            </span>
            <div className="flex items-center gap-2 text-gray-300">
              <User className="w-5 h-5" />
              <span>{staffName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-6">
        {/* 商品選択画面 */}
        {state === STATE.SELECT && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(product => {
                  const stock = getProductStock(product.id)
                  const isOutOfStock = stock !== null && stock <= 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`bg-gray-800 rounded-xl p-4 text-left transition-all hover:bg-gray-700 ${
                        isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {product.image_url ? (
                        <div className="relative w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-700">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-24 mb-3 rounded-lg bg-gray-700 flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-500" />
                        </div>
                      )}
                      <p className="font-bold text-lg">{product.name}</p>
                      <p className="text-pink-400 font-bold">¥{product.price.toLocaleString()}</p>
                      {stock !== null && (
                        <p className={`text-sm mt-1 ${stock <= 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          在庫: {stock}
                        </p>
                      )}
                    </button>
                  )
                })}

                {products.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-400">
                    商品がありません
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl p-4 sticky top-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  カート
                </h3>

                {cart.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    商品を選択してください
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-pink-400">
                              ¥{item.product.price.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="p-1 bg-gray-600 rounded hover:bg-gray-500"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="p-1 bg-gray-600 rounded hover:bg-gray-500"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg">合計</span>
                        <span className="text-2xl font-bold text-pink-400">
                          ¥{totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={proceedToScan}
                        className="w-full py-3 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <QrCode className="w-5 h-5" />
                        会員証をスキャン
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QRスキャン画面 */}
        {state === STATE.SCAN && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <QrCode className="w-16 h-16 text-pink-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">会員証をスキャン</h2>
              <p className="text-gray-400 mb-6">QRコードをカメラにかざしてください</p>

              <div
                id="qr-reader-sales"
                className="mx-auto rounded-xl overflow-hidden bg-black"
                style={{ width: 300, height: 300 }}
              />

              <div className="mt-6 bg-gray-700/50 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-400 mb-2">購入予定</p>
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>¥{(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between font-bold">
                  <span>合計</span>
                  <span className="text-pink-400">¥{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={backToSelect}
                className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                商品選択に戻る
              </button>
            </div>
          </div>
        )}

        {/* 確認画面 */}
        {state === STATE.CONFIRM && member && (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-center">購入確認</h2>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-pink-400" />
                  <div>
                    <p className="text-sm text-gray-400">お客様</p>
                    <p className="font-bold text-lg">{member.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>¥{(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">合計</span>
                  <span className="text-2xl font-bold text-pink-400">
                    ¥{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-400 text-center">
                  月末にまとめて決済されます
                </p>
              </div>

              <button
                onClick={handlePurchase}
                className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-6 h-6" />
                購入を確定する
              </button>

              <button
                onClick={backToSelect}
                className="w-full mt-3 py-2 text-gray-400 hover:text-white transition-colors"
              >
                商品選択に戻る
              </button>
            </div>
          </div>
        )}

        {/* 決済中 */}
        {state === STATE.PROCESSING && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <Loader2 className="w-16 h-16 text-pink-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold mb-2">決済中...</h2>
              <p className="text-gray-400">しばらくお待ちください</p>
            </div>
          </div>
        )}

        {/* 成功 */}
        {state === STATE.SUCCESS && purchaseResult && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">購入記録完了</h2>
              <p className="text-gray-400 mb-6">ありがとうございました</p>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-gray-400 mb-2">お客様: {purchaseResult.memberName}</p>
                {purchaseResult.items.map(item => (
                  <div key={item.product.id} className="flex justify-between mb-2">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>¥{(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between font-bold">
                  <span>合計</span>
                  <span className="text-pink-400">¥{purchaseResult.total.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                ※ 月末にまとめて決済されます
              </p>

              <button
                onClick={reset}
                className="w-full py-3 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                次のお客様へ
              </button>
            </div>
          </div>
        )}

        {/* エラー */}
        {state === STATE.ERROR && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">エラー</h2>
              <p className="text-gray-400 mb-6">{error}</p>

              <button
                onClick={reset}
                className="w-full py-3 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                やり直す
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
