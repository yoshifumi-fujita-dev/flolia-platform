'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Store,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  Briefcase,
  Key,
  UserPlus,
  UserX,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
  Train,
  UserCog,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  LayoutGrid,
  List,
  TrendingUp,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useStore } from '@/lib/contexts/StoreContext'

const EMPLOYMENT_TYPE_LABELS = {
  full_time: { label: '正社員', color: 'bg-blue-900/50 text-blue-400', avatarBg: 'bg-blue-600', iconColor: 'text-blue-400' },
  contract: { label: '契約社員', color: 'bg-cyan-900/50 text-cyan-400', avatarBg: 'bg-cyan-600', iconColor: 'text-cyan-400' },
  part_time: { label: 'アルバイト', color: 'bg-green-900/50 text-green-400', avatarBg: 'bg-green-600', iconColor: 'text-green-400' },
  contractor: { label: '業務委託', color: 'bg-orange-900/50 text-orange-400', avatarBg: 'bg-orange-600', iconColor: 'text-orange-400' },
  executive: { label: '会社役員', color: 'bg-purple-900/50 text-purple-400', avatarBg: 'bg-purple-600', iconColor: 'text-purple-400' },
  instructor: { label: 'インストラクター', color: 'bg-violet-900/50 text-violet-400', avatarBg: 'bg-violet-600', iconColor: 'text-violet-400' },
  none: { label: '該当なし', color: 'bg-gray-700 text-gray-400', avatarBg: 'bg-gray-600', iconColor: 'text-gray-400' },
}

const ONBOARDING_STATUS_LABELS = {
  invited: { label: '招待済み', color: 'bg-yellow-900/50 text-yellow-400', icon: Clock },
  contract_signed: { label: '契約済み', color: 'bg-blue-900/50 text-blue-400', icon: CheckCircle },
  completed: { label: '完了', color: 'bg-green-900/50 text-green-400', icon: CheckCircle },
}

export default function StaffManagementPage() {
  const { selectedStoreId, stores, allStores } = useStore()

  // State
  const [staff, setStaff] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [instructorFilter, setInstructorFilter] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  // View mode: 'table' or 'preview'
  const [viewMode, setViewMode] = useState('table')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [activeTab, setActiveTab] = useState('basic') // 'basic' or 'instructor'
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    name_kana: '',
    phone: '',
    role_id: '',
    assigned_store_ids: [],
    is_instructor: false,
    employment_type: 'contractor',
    hire_date: format(new Date(), 'yyyy-MM-dd'),
    attendance_tracking: true,
    profile_image_url: '',
  })

  // Instructor data for tab
  const [instructorData, setInstructorData] = useState({
    store_ids: [],
    name: '',
    name_kana: '',
    bio: '',
    comment: '',
    image_url: '',
    handwritten_message_image_url: '',
    class_rate: 0,
    free_rate: 0,
    substitute_rate: 0,
    sort_order: 0,
    incentive_threshold: 0,
    incentive_amount: 0,
    incentive_type: 'per_person',
    gender: '',
    blood_type: '',
    prefecture: '',
    is_active: true,
  })
  const [instructorLoading, setInstructorLoading] = useState(false)

  // LINE QR Modal
  const [lineQrStaff, setLineQrStaff] = useState(null)

  // Image upload
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // Instructor image upload
  const instructorFileInputRef = useRef(null)
  const handwrittenFileInputRef = useRef(null)
  const [uploadingInstructorImage, setUploadingInstructorImage] = useState(false)
  const [uploadingHandwritten, setUploadingHandwritten] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Account modal
  const [accountModal, setAccountModal] = useState({ open: false, staff: null, mode: null })
  const [accountPassword, setAccountPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accountLoading, setAccountLoading] = useState(false)

  // Account delete confirmation
  const [deleteAccountTarget, setDeleteAccountTarget] = useState(null)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)

  // Help modal
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Transportation modal
  const [transportationModal, setTransportationModal] = useState({ open: false, staff: null })
  const [transportationData, setTransportationData] = useState([])
  const [transportationLoading, setTransportationLoading] = useState(false)

  // Invitation modal
  const [inviteModal, setInviteModal] = useState({ open: false, staff: null })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteHistory, setInviteHistory] = useState([])

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/roles')
        const data = await res.json()
        if (res.ok) {
          setRoles(data.roles || [])
        }
      } catch (err) {
        console.error('Failed to fetch roles:', err)
      }
    }
    fetchRoles()
  }, [])

  // Fetch staff
  const fetchStaff = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        include_inactive: showInactive.toString(),
      })

      if (searchQuery) params.set('search', searchQuery)
      if (selectedStoreId) params.set('store_id', selectedStoreId)
      if (roleFilter) params.set('role_id', roleFilter)
      if (instructorFilter) params.set('is_instructor', 'true')

      const res = await fetch(`/api/staff?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setStaff(data.staff || [])
      setPagination(data.pagination || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [page, selectedStoreId, roleFilter, instructorFilter, showInactive])

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchStaff()
      } else {
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const openCreateModal = () => {
    setIsEditing(false)
    setActiveTab('basic')
    setFormData({
      email: '',
      name: '',
      name_kana: '',
      phone: '',
      role_id: '',
      assigned_store_ids: selectedStoreId ? [selectedStoreId] : [],
      is_instructor: false,
      employment_type: '',
      hire_date: format(new Date(), 'yyyy-MM-dd'),
      attendance_tracking: true,
      profile_image_url: '',
    })
    setInstructorData({
      store_ids: [],
      name: '',
      name_kana: '',
      bio: '',
      comment: '',
      image_url: '',
      handwritten_message_image_url: '',
      class_rate: 0,
      free_rate: 0,
      substitute_rate: 0,
      sort_order: 0,
      incentive_threshold: 0,
      incentive_amount: 0,
      incentive_type: 'per_person',
      gender: '',
      blood_type: '',
      prefecture: '',
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = async (staffMember) => {
    setIsEditing(true)
    setSelectedStaff(staffMember)
    setActiveTab('basic')
    setFormData({
      email: staffMember.email || '',
      name: staffMember.name || '',
      name_kana: staffMember.name_kana || '',
      phone: staffMember.phone || '',
      role_id: staffMember.role_id || '',
      assigned_store_ids: staffMember.assigned_store_ids || [],
      is_instructor: staffMember.is_instructor || false,
      employment_type: staffMember.employment_type || 'contractor',
      hire_date: staffMember.hire_date || '',
      attendance_tracking: staffMember.attendance_tracking !== false,
      profile_image_url: staffMember.profile_image_url || '',
    })

    // インストラクター情報を取得
    if (staffMember.is_instructor && staffMember.instructor_id) {
      setInstructorLoading(true)
      try {
        const res = await fetch(`/api/staff/${staffMember.id}`)
        const data = await res.json()
        if (res.ok && data.instructor) {
          setInstructorData({
            store_ids: data.instructor.store_ids || [],
            name: data.instructor.name || staffMember.name || '',
            name_kana: data.instructor.name_kana || '',
            bio: data.instructor.bio || '',
            comment: data.instructor.comment || '',
            image_url: data.instructor.image_url || '',
            handwritten_message_image_url: data.instructor.handwritten_message_image_url || '',
            class_rate: data.instructor.class_rate || 0,
            free_rate: data.instructor.free_rate || 0,
            substitute_rate: data.instructor.substitute_rate || 0,
            sort_order: data.instructor.sort_order || 0,
            incentive_threshold: data.instructor.incentive_threshold || 0,
            incentive_amount: data.instructor.incentive_amount || 0,
            incentive_type: data.instructor.incentive_type || 'per_person',
            gender: data.instructor.gender || '',
            blood_type: data.instructor.blood_type || '',
            prefecture: data.instructor.prefecture || '',
            is_active: data.instructor.is_active ?? true,
          })
        }
      } catch (err) {
        console.error('Failed to fetch instructor data:', err)
      } finally {
        setInstructorLoading(false)
      }
    } else {
      setInstructorData({
        store_ids: staffMember.assigned_store_ids || [],
        name: staffMember.name || '',
        name_kana: staffMember.name_kana || '',
        bio: '',
        comment: '',
        image_url: '',
        handwritten_message_image_url: '',
        class_rate: 0,
        free_rate: 0,
        substitute_rate: 0,
        sort_order: 0,
        incentive_threshold: 0,
        incentive_amount: 0,
        incentive_type: 'per_person',
        gender: '',
        blood_type: '',
        prefecture: '',
        is_active: true,
      })
    }

    setIsModalOpen(true)
  }

  // 画像アップロード処理
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload/staff-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await res.json()
      if (res.ok) {
        setFormData({ ...formData, profile_image_url: data.url })
      } else {
        setError(data.error || '画像のアップロードに失敗しました')
      }
    } catch (err) {
      setError('画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  // インストラクター画像アップロード処理
  const handleInstructorImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingInstructorImage(true)
    setError(null)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload/instructor-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await res.json()
      if (res.ok) {
        setInstructorData({ ...instructorData, image_url: data.url })
      } else {
        setError(data.error || '画像のアップロードに失敗しました')
      }
    } catch (err) {
      setError('画像のアップロードに失敗しました')
    } finally {
      setUploadingInstructorImage(false)
    }
  }

  // 直筆メッセージ画像アップロード処理
  const handleHandwrittenImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingHandwritten(true)
    setError(null)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'handwritten')

      const res = await fetch('/api/upload/instructor-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await res.json()
      if (res.ok) {
        setInstructorData({ ...instructorData, handwritten_message_image_url: data.url })
      } else {
        setError(data.error || '画像のアップロードに失敗しました')
      }
    } catch (err) {
      setError('画像のアップロードに失敗しました')
    } finally {
      setUploadingHandwritten(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // バリデーション
    if (!formData.role_id) {
      alert('権限を選択してください')
      return
    }
    if (!formData.employment_type) {
      alert('雇用形態を選択してください')
      return
    }

    try {
      const url = isEditing ? `/api/staff/${selectedStaff.id}` : '/api/staff'
      const method = isEditing ? 'PUT' : 'POST'

      // 担当店舗が未選択の場合、全店舗を自動設定（新規作成時のみ）
      const assignedStoreIds = formData.assigned_store_ids.length === 0 && !isEditing
        ? (allStores || []).map(s => s.id)
        : formData.assigned_store_ids

      // インストラクター情報を含めて送信
      const payload = {
        ...formData,
        assigned_store_ids: assignedStoreIds,
        instructor_data: formData.is_instructor ? instructorData : undefined,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setIsModalOpen(false)
      fetchStaff()
    } catch (err) {
      alert(err.message)
    }
  }

  // インストラクター公開/非公開切替
  const handleToggleInstructorActive = async (staffMember) => {
    if (!staffMember.instructor_id) return

    try {
      const res = await fetch(`/api/staff/${staffMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructor_data: {
            is_active: !staffMember.instructor?.is_active,
          },
        }),
      })

      if (res.ok) {
        fetchStaff()
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (err) {
      setError('更新に失敗しました')
    }
  }

  // フォーム用ランダムパスワード生成（アカウントモーダル用）
  const generateFormPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password })
    setShowFormPassword(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const res = await fetch(`/api/staff/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setDeleteTarget(null)
      fetchStaff()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleStoreToggle = (storeId) => {
    setFormData((prev) => ({
      ...prev,
      assigned_store_ids: prev.assigned_store_ids.includes(storeId)
        ? prev.assigned_store_ids.filter((id) => id !== storeId)
        : [...prev.assigned_store_ids, storeId],
    }))
  }

  const getRoleName = (roleId) => {
    const role = roles.find((r) => r.id === roleId)
    return role?.display_name || '-'
  }

  const getStoreNames = (storeIds) => {
    if (!storeIds || storeIds.length === 0) return '全店舗'
    return storeIds
      .map((id) => (allStores || []).find((s) => s.id === id)?.name || id)
      .join(', ')
  }

  // アカウント作成モーダルを開く
  const openCreateAccountModal = (staffMember) => {
    setAccountModal({ open: true, staff: staffMember, mode: 'create' })
    setAccountPassword('')
    setShowPassword(false)
  }

  // パスワードリセットモーダルを開く
  const openResetPasswordModal = (staffMember) => {
    setAccountModal({ open: true, staff: staffMember, mode: 'reset' })
    setAccountPassword('')
    setShowPassword(false)
  }

  // アカウント作成
  const handleCreateAccount = async () => {
    if (!accountPassword || accountPassword.length < 8) {
      alert('パスワードは8文字以上で入力してください')
      return
    }

    setAccountLoading(true)
    try {
      const res = await fetch(`/api/staff/${accountModal.staff.id}/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: accountPassword }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      alert('ログインアカウントを作成しました')
      setAccountModal({ open: false, staff: null, mode: null })
      fetchStaff()
    } catch (err) {
      alert(err.message)
    } finally {
      setAccountLoading(false)
    }
  }

  // パスワードリセット
  const handleResetPassword = async () => {
    if (!accountPassword || accountPassword.length < 8) {
      alert('パスワードは8文字以上で入力してください')
      return
    }

    setAccountLoading(true)
    try {
      const res = await fetch(`/api/staff/${accountModal.staff.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: accountPassword }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      alert('パスワードをリセットしました')
      setAccountModal({ open: false, staff: null, mode: null })
    } catch (err) {
      alert(err.message)
    } finally {
      setAccountLoading(false)
    }
  }

  // ランダムパスワード生成
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setAccountPassword(password)
    setShowPassword(true)
  }

  // アカウント削除
  const handleDeleteAccount = async () => {
    if (!deleteAccountTarget) return

    setDeleteAccountLoading(true)
    try {
      // APIはstaff.idを受け取る
      const res = await fetch(`/api/auth/users/${deleteAccountTarget.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      alert('ログインアカウントを削除しました')
      setDeleteAccountTarget(null)
      fetchStaff()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  // 交通費設定モーダルを開く
  const openTransportationModal = async (staffMember) => {
    setTransportationModal({ open: true, staff: staffMember })
    setTransportationLoading(true)

    try {
      const res = await fetch(`/api/staff-transportation?staff_id=${staffMember.id}`)
      const data = await res.json()

      if (res.ok) {
        // 担当店舗ごとの交通費データを構築
        const storeIds = staffMember.assigned_store_ids?.length > 0
          ? staffMember.assigned_store_ids
          : (allStores || []).map(s => s.id)

        const transportMap = {}
        for (const t of data.transportation || []) {
          transportMap[t.store_id] = { fee: t.fee, notes: t.notes || '' }
        }

        const newData = storeIds.map(storeId => ({
          store_id: storeId,
          store_name: (allStores || []).find(s => s.id === storeId)?.name || storeId,
          fee: transportMap[storeId]?.fee ?? 0,
          notes: transportMap[storeId]?.notes ?? '',
        }))

        setTransportationData(newData)
      }
    } catch (err) {
      console.error('Failed to fetch transportation:', err)
    } finally {
      setTransportationLoading(false)
    }
  }

  // 交通費を保存
  const handleSaveTransportation = async () => {
    setTransportationLoading(true)

    try {
      for (const item of transportationData) {
        await fetch('/api/staff-transportation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_id: transportationModal.staff.id,
            store_id: item.store_id,
            fee: item.fee,
            notes: item.notes,
          }),
        })
      }

      alert('交通費設定を保存しました')
      setTransportationModal({ open: false, staff: null })
    } catch (err) {
      alert('保存に失敗しました: ' + err.message)
    } finally {
      setTransportationLoading(false)
    }
  }

  // 交通費データを更新
  const updateTransportationData = (storeId, field, value) => {
    setTransportationData(prev =>
      prev.map(item =>
        item.store_id === storeId
          ? { ...item, [field]: field === 'fee' ? parseInt(value) || 0 : value }
          : item
      )
    )
  }

  // 招待モーダルを開く
  const openInviteModal = async (staffMember) => {
    setInviteModal({ open: true, staff: staffMember })
    setInviteHistory([])

    // 招待履歴を取得
    try {
      const res = await fetch(`/api/staff/${staffMember.id}/invite`)
      const data = await res.json()
      if (res.ok) {
        setInviteHistory(data.invitations || [])
      }
    } catch (err) {
      console.error('Failed to fetch invite history:', err)
    }
  }

  // 招待を送信
  const handleSendInvite = async () => {
    if (!inviteModal.staff) return

    setInviteLoading(true)
    try {
      const res = await fetch(`/api/staff/${inviteModal.staff.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      alert('招待メールを送信しました')
      // 履歴を再取得
      const historyRes = await fetch(`/api/staff/${inviteModal.staff.id}/invite`)
      const historyData = await historyRes.json()
      if (historyRes.ok) {
        setInviteHistory(historyData.invitations || [])
      }
      fetchStaff()
    } catch (err) {
      alert(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserCog className="w-7 h-7" />
              従業員管理
            </h1>
            <p className="text-gray-400 mt-1">スタッフの登録・権限管理</p>
          </div>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="雇用形態について"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* 表示モード切替 */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              テーブル
            </button>
            <button
              onClick={() => {
                setViewMode('preview')
                setInstructorFilter(true)
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'preview'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              プレビュー
            </button>
          </div>
          <Link
            href="/backoffice/mf-export"
            className="flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded-lg transition-colors"
            title="MFクラウド連携"
          >
            入社手続きフロー <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新規登録
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="名前・メールで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">全ての権限</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.display_name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer">
            <input
              type="checkbox"
              checked={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.checked)}
              className="rounded border-gray-500 text-violet-600 focus:ring-violet-500"
            />
            インストラクターのみ
          </label>

          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-500 text-violet-600 focus:ring-violet-500"
            />
            無効なスタッフも表示
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Staff List */}
      {loading ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-400">読み込み中...</div>
      ) : staff.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-400">
          {viewMode === 'preview' ? 'インストラクターが登録されていません' : '従業員が見つかりません'}
        </div>
      ) : viewMode === 'preview' ? (
        /* プレビューモード - インストラクターグリッド表示 */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {staff.filter(m => m.is_instructor).map((member) => (
            <div
              key={member.id}
              className={`bg-gray-800/50 rounded-2xl p-4 border ${
                member.instructor?.is_active !== false ? 'border-gray-700' : 'border-red-900/50 opacity-60'
              }`}
            >
              {/* LP風プレビュー */}
              <div className="flex flex-col items-center text-center">
                {/* 丸写真（性別でグラデーション枠の色が変わる） */}
                <div className={`relative w-28 h-28 rounded-full p-1 ${
                  member.instructor?.gender === 'male'
                    ? 'bg-gradient-to-br from-blue-300 via-cyan-300 to-sky-300'
                    : 'bg-gradient-to-br from-violet-300 via-fuchsia-300 to-pink-300'
                }`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                    {member.instructor?.image_url ? (
                      <Image
                        src={member.instructor.image_url}
                        alt={member.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-10 h-10 text-gray-700" />
                      </div>
                    )}
                  </div>
                  {member.instructor?.is_active === false && (
                    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">
                      非公開
                    </div>
                  )}
                </div>

                {/* 直筆メッセージ（あれば表示） */}
                {member.instructor?.handwritten_message_image_url && (
                  <div className="relative w-full h-8 mt-2">
                    <Image
                      src={member.instructor.handwritten_message_image_url}
                      alt="直筆メッセージ"
                      fill
                      sizes="200px"
                      className="object-contain"
                    />
                  </div>
                )}

                {/* 名前 */}
                <h3 className="text-white font-bold mt-3 text-sm">{member.name}</h3>

                {/* 血液型 / 出身地 */}
                {(member.instructor?.blood_type || member.instructor?.prefecture) && (
                  <p className="text-gray-400 text-xs mt-1">
                    {[member.instructor?.blood_type, member.instructor?.prefecture].filter(Boolean).join(' / ')}
                  </p>
                )}

                {/* 趣味 */}
                {member.instructor?.bio && (
                  <p className="text-gray-500 text-xs mt-1">
                    趣味：{member.instructor.bio}
                  </p>
                )}

                {/* 所属店舗 */}
                <p className="text-violet-400 text-xs mt-2 flex items-center gap-1">
                  <Store className="w-3 h-3 flex-shrink-0" />
                  {getStoreNames(member.assigned_store_ids)}
                </p>
              </div>

              {/* LINE連携状態 */}
              <div className="flex items-center justify-center gap-1 mt-3 text-xs">
                {member.instructor?.line_user_id ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    LINE連携済み
                  </span>
                ) : (
                  <button
                    onClick={() => setLineQrStaff(member)}
                    className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    LINE連携
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-700">
                <button
                  onClick={() => handleToggleInstructorActive(member)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    member.instructor?.is_active !== false
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  }`}
                >
                  {member.instructor?.is_active !== false ? '非公開にする' : '公開する'}
                </button>
                <button
                  onClick={() => openEditModal(member)}
                  className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                  title="編集"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* テーブルモード */
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    従業員
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    権限
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    担当店舗
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    雇用形態
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    状態
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300 font-mono">
                        {member.employee_number || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {member.profile_image_url ? (
                          <img
                            src={member.profile_image_url}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                            EMPLOYMENT_TYPE_LABELS[member.employment_type]?.avatarBg || 'bg-gray-600'
                          }`}>
                            {member.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {member.name}
                            </span>
                            {member.is_instructor && (
                              <span className="px-2 py-0.5 bg-violet-900/50 text-violet-400 text-xs rounded-full">
                                講師
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Shield className={`w-4 h-4 ${
                          EMPLOYMENT_TYPE_LABELS[member.employment_type]?.iconColor || 'text-gray-400'
                        }`} />
                        {member.roles?.display_name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-300">
                        {getStoreNames(member.assigned_store_ids)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {member.employment_type && (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            EMPLOYMENT_TYPE_LABELS[member.employment_type]?.color
                          }`}
                        >
                          {EMPLOYMENT_TYPE_LABELS[member.employment_type]?.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {member.is_active ? (
                          <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full inline-block w-fit">
                            有効
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full inline-block w-fit">
                            無効
                          </span>
                        )}
                        {member.auth_user_id ? (
                          <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded-full inline-flex items-center gap-1 w-fit">
                            <Key className="w-3 h-3" />
                            ログイン可
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-700 text-gray-500 text-xs rounded-full inline-block w-fit">
                            ログイン不可
                          </span>
                        )}
                        {/* オンボーディングステータス */}
                        {member.onboarding_status && member.onboarding_status !== 'completed' && (
                          <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 w-fit ${
                            ONBOARDING_STATUS_LABELS[member.onboarding_status]?.color || 'bg-gray-700 text-gray-400'
                          }`}>
                            {ONBOARDING_STATUS_LABELS[member.onboarding_status]?.icon && (
                              (() => {
                                const Icon = ONBOARDING_STATUS_LABELS[member.onboarding_status].icon
                                return <Icon className="w-3 h-3" />
                              })()
                            )}
                            {ONBOARDING_STATUS_LABELS[member.onboarding_status]?.label || member.onboarding_status}
                          </span>
                        )}
                        {/* LINE連携状態 */}
                        {member.line_user_id ? (
                          <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full inline-flex items-center gap-1 w-fit">
                            <MessageCircle className="w-3 h-3" />
                            LINE連携済み
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-700 text-gray-500 text-xs rounded-full inline-flex items-center gap-1 w-fit">
                            <MessageCircle className="w-3 h-3" />
                            LINE未連携
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!member.auth_user_id ? (
                          <button
                            onClick={() => openCreateAccountModal(member)}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title="ログインアカウント作成"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openResetPasswordModal(member)}
                              className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors"
                              title="パスワードリセット"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteAccountTarget(member)}
                              className="p-2 text-gray-400 hover:text-orange-400 hover:bg-gray-700 rounded-lg transition-colors"
                              title="ログインアカウント削除"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openTransportationModal(member)}
                          className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="交通費設定"
                        >
                          <Train className="w-4 h-4" />
                        </button>
                        {/* 招待ボタン - オンボーディング未完了のスタッフに表示 */}
                        {member.onboarding_status !== 'completed' && (
                          <button
                            onClick={() => openInviteModal(member)}
                            className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title="招待を送る"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {/* インストラクター情報編集ボタン */}
                        {member.is_instructor && (
                          <button
                            onClick={() => {
                              openEditModal(member)
                              setActiveTab('instructor')
                            }}
                            className="p-2 text-violet-400 hover:text-violet-300 hover:bg-violet-900/30 rounded-lg transition-colors"
                            title="インストラクター情報を編集"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(member)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="無効化"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              全{pagination.total}件中 {(page - 1) * 20 + 1}-
              {Math.min(page * 20, pagination.total)}件を表示
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-300">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? '従業員編集' : '従業員登録'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* タブ切替 (編集時かつインストラクターの場合のみ表示) */}
            {isEditing && formData.is_instructor && (
              <div className="flex border-b border-gray-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'basic'
                      ? 'text-violet-400 border-b-2 border-violet-400 bg-gray-700/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  基本情報
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('instructor')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'instructor'
                      ? 'text-violet-400 border-b-2 border-violet-400 bg-gray-700/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4 inline-block mr-2" />
                  インストラクター
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* 基本情報タブ */}
              {activeTab === 'basic' && (
                <>
              {/* プロフィール画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  プロフィール画像
                </label>
                <div className="flex items-start gap-4">
                  {formData.profile_image_url ? (
                    <div className="relative">
                      <img
                        src={formData.profile_image_url}
                        alt="プロフィール"
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profile_image_url: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-700 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          画像をアップロード
                        </>
                      )}
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      JPG, PNG, WebP形式（300x300pxに自動リサイズ）
                    </p>
                  </div>
                </div>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    氏名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    氏名（カナ）
                  </label>
                  <input
                    type="text"
                    value={formData.name_kana}
                    onChange={(e) =>
                      setFormData({ ...formData, name_kana: e.target.value })
                    }
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    メールアドレス <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* 権限・雇用 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    権限 <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => {
                      const newRoleId = e.target.value
                      const selectedRole = roles.find(r => String(r.id) === String(newRoleId))
                      // nameまたはdisplay_nameでインストラクターを判定
                      const isInstructorRole = selectedRole?.name === 'instructor' ||
                        selectedRole?.display_name === 'インストラクター'
                      setFormData((prev) => ({
                        ...prev,
                        role_id: newRoleId,
                        // インストラクターロール選択時は自動でインストラクターとして登録をON
                        is_instructor: isInstructorRole ? true : prev.is_instructor,
                      }))
                    }}
                    required
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                      !formData.role_id ? 'border-red-500/50' : 'border-gray-600'
                    }`}
                  >
                    <option value="">選択してください</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    雇用形態 <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, employment_type: e.target.value })
                    }
                    required
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                      !formData.employment_type ? 'border-red-500/50' : 'border-gray-600'
                    }`}
                  >
                    <option value="">選択してください</option>
                    <option value="contractor">業務委託</option>
                    <option value="part_time">アルバイト</option>
                    <option value="contract">契約社員</option>
                    <option value="full_time">正社員</option>
                    <option value="executive">会社役員</option>
                    <option value="none">該当なし</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  入社日
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) =>
                    setFormData({ ...formData, hire_date: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* 担当店舗 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  担当店舗（複数選択可）
                </label>
                <div className="flex flex-wrap gap-2">
                  {(allStores || []).map((store) => (
                    <label
                      key={store.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        formData.assigned_store_ids.includes(store.id)
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.assigned_store_ids.includes(store.id)}
                        onChange={() => handleStoreToggle(store.id)}
                        className="hidden"
                      />
                      <Store className="w-4 h-4" />
                      {store.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  選択なしの場合、登録時に全店舗が自動設定されます
                </p>
              </div>

              {/* インストラクター */}
              <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_instructor}
                    onChange={(e) =>
                      setFormData({ ...formData, is_instructor: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-500 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-300">インストラクターとして登録</span>
                </label>

                {formData.is_instructor && isEditing && (
                  <div className="mt-3 p-3 bg-violet-900/30 border border-violet-500/30 rounded-lg">
                    <p className="text-sm text-violet-300">
                      インストラクターの紹介文・写真は「インストラクター」タブで編集できます。
                    </p>
                  </div>
                )}
              </div>

              {/* 勤怠管理 */}
              <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.attendance_tracking}
                    onChange={(e) =>
                      setFormData({ ...formData, attendance_tracking: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-500 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-300">勤怠管理の対象にする</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  オフにするとスタッフ勤怠画面に表示されません
                </p>
              </div>

              {/* 登録時の説明 */}
              {!isEditing && (
                <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    登録すると、入力したメールアドレス宛にオンボーディング案内メールが送信されます。
                  </p>
                </div>
              )}
                </>
              )}

              {/* インストラクタータブ */}
              {activeTab === 'instructor' && formData.is_instructor && (
                <>
                  {instructorLoading ? (
                    <div className="p-8 text-center text-gray-400">読み込み中...</div>
                  ) : (
                    <>
                      {/* プロフィール画像 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          プロフィール画像（LP表示用）
                        </label>
                        <div className="flex items-start gap-4">
                          <div className="w-32 h-32 bg-gray-900 rounded-xl overflow-hidden flex-shrink-0 relative">
                            {instructorData.image_url ? (
                              <Image
                                src={instructorData.image_url}
                                alt="Preview"
                                fill
                                sizes="128px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-10 h-10 text-gray-700" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              ref={instructorFileInputRef}
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleInstructorImageUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => instructorFileInputRef.current?.click()}
                              disabled={uploadingInstructorImage}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                              {uploadingInstructorImage ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                  アップロード中...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  画像をアップロード
                                </>
                              )}
                            </button>
                            <p className="text-gray-500 text-xs mt-2">
                              JPG, PNG, WebP形式（推奨: 400x400px）
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 直筆メッセージ画像 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          直筆メッセージ画像
                        </label>
                        <div className="flex flex-col gap-4">
                          <div className="w-full max-w-md h-32 bg-gray-900 rounded-xl overflow-hidden relative">
                            {instructorData.handwritten_message_image_url ? (
                              <Image
                                src={instructorData.handwritten_message_image_url}
                                alt="直筆メッセージ"
                                fill
                                sizes="400px"
                                className="object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-600 text-xs">メッセージ画像なし</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              ref={handwrittenFileInputRef}
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleHandwrittenImageUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handwrittenFileInputRef.current?.click()}
                              disabled={uploadingHandwritten}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                              {uploadingHandwritten ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                  アップロード中...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  直筆メッセージ画像をアップロード
                                </>
                              )}
                            </button>
                            <p className="text-gray-500 text-xs mt-2">
                              手書きメッセージを撮影した画像（推奨: 横長、背景透過PNG）
                            </p>
                            {instructorData.handwritten_message_image_url && (
                              <button
                                type="button"
                                onClick={() => setInstructorData({ ...instructorData, handwritten_message_image_url: '' })}
                                className="text-red-400 text-xs mt-2 hover:text-red-300"
                              >
                                画像を削除
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 所属店舗 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          所属店舗（複数選択可）
                        </label>
                        <div className="space-y-2 bg-gray-700 border border-gray-600 rounded-lg p-3">
                          {allStores.map((store) => (
                            <label key={store.id} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={instructorData.store_ids.includes(store.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setInstructorData({ ...instructorData, store_ids: [...instructorData.store_ids, store.id] })
                                  } else {
                                    setInstructorData({ ...instructorData, store_ids: instructorData.store_ids.filter((id) => id !== store.id) })
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-500 bg-gray-600 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                              />
                              <span className="text-white">{store.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 趣味・コメント */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            趣味
                          </label>
                          <input
                            type="text"
                            value={instructorData.bio}
                            onChange={(e) => setInstructorData({ ...instructorData, bio: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="例: 旅行、映画鑑賞、料理"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            コメント
                          </label>
                          <textarea
                            value={instructorData.comment}
                            onChange={(e) => setInstructorData({ ...instructorData, comment: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="お客様へのメッセージなど"
                          />
                        </div>
                      </div>

                      {/* 性別・血液型・出身地 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">性別</label>
                          <select
                            value={instructorData.gender}
                            onChange={(e) => setInstructorData({ ...instructorData, gender: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="">選択してください</option>
                            <option value="female">女性</option>
                            <option value="male">男性</option>
                            <option value="other">その他</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">血液型</label>
                          <select
                            value={instructorData.blood_type}
                            onChange={(e) => setInstructorData({ ...instructorData, blood_type: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="">選択してください</option>
                            <option value="A型">A型</option>
                            <option value="B型">B型</option>
                            <option value="O型">O型</option>
                            <option value="AB型">AB型</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">出身地</label>
                          <select
                            value={instructorData.prefecture}
                            onChange={(e) => setInstructorData({ ...instructorData, prefecture: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="">選択してください</option>
                            {['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'].map(pref => (
                              <option key={pref} value={pref}>{pref}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 報酬設定 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">クラス単価（円）</label>
                          <input
                            type="number"
                            value={instructorData.class_rate}
                            onChange={(e) => setInstructorData({ ...instructorData, class_rate: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">フリー単価（円）</label>
                          <input
                            type="number"
                            value={instructorData.free_rate}
                            onChange={(e) => setInstructorData({ ...instructorData, free_rate: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">代行単価（円）</label>
                          <input
                            type="number"
                            value={instructorData.substitute_rate}
                            onChange={(e) => setInstructorData({ ...instructorData, substitute_rate: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      {/* インセンティブ設定 */}
                      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          インセンティブ設定
                        </label>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">閾値（この人数を超えたら）</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={instructorData.incentive_threshold}
                                  onChange={(e) => setInstructorData({ ...instructorData, incentive_threshold: parseInt(e.target.value) || 0 })}
                                  min="0"
                                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <span className="text-gray-400 text-sm">人</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">インセンティブ金額（円）</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={instructorData.incentive_amount}
                                  onChange={(e) => setInstructorData({ ...instructorData, incentive_amount: parseInt(e.target.value) || 0 })}
                                  min="0"
                                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <span className="text-gray-400 text-sm">円</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">計算方法</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="incentive_type"
                                  value="per_person"
                                  checked={instructorData.incentive_type === 'per_person'}
                                  onChange={(e) => setInstructorData({ ...instructorData, incentive_type: e.target.value })}
                                  className="w-4 h-4 border-gray-500 bg-gray-600 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                                />
                                <span className="text-gray-300 text-sm">超過1人あたり</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="incentive_type"
                                  value="fixed"
                                  checked={instructorData.incentive_type === 'fixed'}
                                  onChange={(e) => setInstructorData({ ...instructorData, incentive_type: e.target.value })}
                                  className="w-4 h-4 border-gray-500 bg-gray-600 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                                />
                                <span className="text-gray-300 text-sm">固定金額</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 表示順序・公開状態 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">表示順序</label>
                          <input
                            type="number"
                            value={instructorData.sort_order}
                            onChange={(e) => setInstructorData({ ...instructorData, sort_order: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          <p className="text-gray-500 text-xs mt-1">小さい数字ほど先に表示</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">公開状態</label>
                          <label className="flex items-center gap-3 cursor-pointer mt-2">
                            <input
                              type="checkbox"
                              checked={instructorData.is_active}
                              onChange={(e) => setInstructorData({ ...instructorData, is_active: e.target.checked })}
                              className="w-5 h-5 rounded border-gray-500 text-violet-600 focus:ring-violet-500"
                            />
                            <span className="text-gray-300">LPに公開する</span>
                          </label>
                        </div>
                      </div>

                      {/* LINE連携 */}
                      <div className="border-t border-gray-700 pt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-400" />
                          LINE連携
                        </label>
                        {selectedStaff?.instructor?.line_user_id ? (
                          <p className="text-green-400 text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            LINE連携済み
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLineQrStaff(selectedStaff)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            LINE連携QRを表示
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  {isEditing ? '更新' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              従業員を無効化しますか？
            </h3>
            <p className="text-gray-400 mb-6">
              「{deleteTarget.name}」を無効化します。この操作は取り消せます。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                無効化
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Create/Reset Modal */}
      {accountModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              {accountModal.mode === 'create' ? (
                <UserPlus className="w-6 h-6 text-blue-400" />
              ) : (
                <Lock className="w-6 h-6 text-yellow-400" />
              )}
              <h3 className="text-lg font-semibold text-white">
                {accountModal.mode === 'create'
                  ? 'ログインアカウント作成'
                  : 'パスワードリセット'}
              </h3>
            </div>

            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">対象従業員</p>
              <p className="text-white font-medium">{accountModal.staff?.name}</p>
              <p className="text-sm text-gray-400">{accountModal.staff?.email}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {accountModal.mode === 'create' ? '初期パスワード' : '新しいパスワード'}
                <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="8文字以上"
                  autoComplete="new-password"
                  className="w-full px-4 py-2 pr-20 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="mt-2 text-sm text-violet-400 hover:text-violet-300"
              >
                ランダムパスワードを生成
              </button>
            </div>

            {accountModal.mode === 'create' && (
              <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  アカウント作成後、従業員は設定したパスワードで管理画面にログインできるようになります。
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAccountModal({ open: false, staff: null, mode: null })}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={accountLoading}
              >
                キャンセル
              </button>
              <button
                onClick={accountModal.mode === 'create' ? handleCreateAccount : handleResetPassword}
                disabled={accountLoading || !accountPassword}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  accountModal.mode === 'create'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {accountLoading
                  ? '処理中...'
                  : accountModal.mode === 'create'
                  ? 'アカウント作成'
                  : 'パスワードリセット'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteAccountTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserX className="w-6 h-6 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">
                ログインアカウントを削除しますか？
              </h3>
            </div>

            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">対象従業員</p>
              <p className="text-white font-medium">{deleteAccountTarget.name}</p>
              <p className="text-sm text-gray-400">{deleteAccountTarget.email}</p>
            </div>

            <div className="mb-6 p-3 bg-orange-900/30 border border-orange-500/30 rounded-lg">
              <p className="text-sm text-orange-300">
                ログインアカウントを削除すると、この従業員は管理画面にログインできなくなります。
                従業員情報は保持されます。
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteAccountTarget(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={deleteAccountLoading}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccountLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {deleteAccountLoading ? '処理中...' : 'アカウント削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal - 雇用形態の比較 */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">雇用形態について</h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* 雇用形態の比較表 */}
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-violet-400" />
                  雇用形態の比較
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-700/50">
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">項目</th>
                        <th className="px-4 py-3 text-center text-blue-400 font-medium">正社員</th>
                        <th className="px-4 py-3 text-center text-cyan-400 font-medium">契約社員</th>
                        <th className="px-4 py-3 text-center text-green-400 font-medium">アルバイト</th>
                        <th className="px-4 py-3 text-center text-orange-400 font-medium">業務委託</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      <tr>
                        <td className="px-4 py-3 text-gray-300">雇用関係</td>
                        <td className="px-4 py-3 text-center text-green-400">○</td>
                        <td className="px-4 py-3 text-center text-green-400">○</td>
                        <td className="px-4 py-3 text-center text-green-400">○</td>
                        <td className="px-4 py-3 text-center text-red-400">✕</td>
                      </tr>
                      <tr className="bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-300">契約期間</td>
                        <td className="px-4 py-3 text-center text-gray-200">無期限</td>
                        <td className="px-4 py-3 text-center text-gray-200">有期限</td>
                        <td className="px-4 py-3 text-center text-gray-200">有／無</td>
                        <td className="px-4 py-3 text-center text-gray-200">契約ごと</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-300">働き方</td>
                        <td className="px-4 py-3 text-center text-gray-200">時間＋業務</td>
                        <td className="px-4 py-3 text-center text-gray-200">時間＋業務</td>
                        <td className="px-4 py-3 text-center text-gray-200">時間</td>
                        <td className="px-4 py-3 text-center text-gray-200">成果</td>
                      </tr>
                      <tr className="bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-300">指揮命令</td>
                        <td className="px-4 py-3 text-center text-gray-200">あり</td>
                        <td className="px-4 py-3 text-center text-gray-200">あり</td>
                        <td className="px-4 py-3 text-center text-gray-200">あり</td>
                        <td className="px-4 py-3 text-center text-gray-200">原則なし</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-300">労働基準法</td>
                        <td className="px-4 py-3 text-center text-green-400">適用</td>
                        <td className="px-4 py-3 text-center text-green-400">適用</td>
                        <td className="px-4 py-3 text-center text-green-400">適用</td>
                        <td className="px-4 py-3 text-center text-red-400">非適用</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* お金・保障の違い */}
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-400" />
                  お金・保障の違い
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-700/50">
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">項目</th>
                        <th className="px-4 py-3 text-center text-blue-400 font-medium">正社員</th>
                        <th className="px-4 py-3 text-center text-cyan-400 font-medium">契約社員</th>
                        <th className="px-4 py-3 text-center text-green-400 font-medium">アルバイト</th>
                        <th className="px-4 py-3 text-center text-orange-400 font-medium">業務委託</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      <tr>
                        <td className="px-4 py-3 text-gray-300">給与形態</td>
                        <td className="px-4 py-3 text-center text-gray-200">月給</td>
                        <td className="px-4 py-3 text-center text-gray-200">月給</td>
                        <td className="px-4 py-3 text-center text-gray-200">時給</td>
                        <td className="px-4 py-3 text-center text-gray-200">報酬</td>
                      </tr>
                      <tr className="bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-300">残業代</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-red-400">なし</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-300">賞与</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-yellow-400">場合による</td>
                        <td className="px-4 py-3 text-center text-red-400">なし</td>
                        <td className="px-4 py-3 text-center text-red-400">なし</td>
                      </tr>
                      <tr className="bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-300">社会保険</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-yellow-400">条件次第</td>
                        <td className="px-4 py-3 text-center text-gray-400">自分で加入</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-300">有給休暇</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-green-400">あり</td>
                        <td className="px-4 py-3 text-center text-red-400">なし</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 注意書き */}
              <div className="p-4 bg-violet-900/20 border border-violet-500/30 rounded-lg">
                <p className="text-sm text-violet-300">
                  ※ 上記は一般的な目安です。実際の条件は個別の契約内容や就業規則により異なります。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transportation Modal */}
      {transportationModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Train className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">交通費設定</h3>
                  <p className="text-sm text-gray-400">{transportationModal.staff?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setTransportationModal({ open: false, staff: null })}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {transportationLoading ? (
                <div className="text-center py-8 text-gray-400">読み込み中...</div>
              ) : transportationData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  担当店舗がありません
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    各店舗への1回あたりの交通費を設定してください。
                    出勤日数に応じて自動計算されます。
                  </p>

                  <div className="space-y-3">
                    {transportationData.map((item) => (
                      <div
                        key={item.store_id}
                        className="p-4 bg-gray-700/50 rounded-lg space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-400" />
                          <span className="text-white font-medium">{item.store_name}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">
                              1回あたりの交通費
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="10"
                                value={item.fee}
                                onChange={(e) =>
                                  updateTransportationData(item.store_id, 'fee', e.target.value)
                                }
                                className="w-full px-4 py-2 pr-8 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                円
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-400 mb-1">
                              備考（経路など）
                            </label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) =>
                                updateTransportationData(item.store_id, 'notes', e.target.value)
                              }
                              placeholder="例: 自宅→新宿駅→店舗"
                              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-300">
                      交通費は入退館ログの出勤日数と掛け合わせて月別集計レポートで確認できます。
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setTransportationModal({ open: false, staff: null })}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  disabled={transportationLoading}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveTransportation}
                  disabled={transportationLoading || transportationData.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {transportationLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Send className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">招待を送る</h3>
                  <p className="text-sm text-gray-400">{inviteModal.staff?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setInviteModal({ open: false, staff: null })}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 現在のステータス */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">メールアドレス</span>
                  <span className="text-white">{inviteModal.staff?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">オンボーディング状態</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    ONBOARDING_STATUS_LABELS[inviteModal.staff?.onboarding_status]?.color || 'bg-gray-700 text-gray-400'
                  }`}>
                    {ONBOARDING_STATUS_LABELS[inviteModal.staff?.onboarding_status]?.label || '未招待'}
                  </span>
                </div>
              </div>

              {/* 招待履歴 */}
              {inviteHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">招待履歴</h4>
                  <div className="space-y-2">
                    {inviteHistory.map((invite) => (
                      <div
                        key={invite.id}
                        className="p-3 bg-gray-700/30 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {invite.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : invite.status === 'pending' ? (
                            <Clock className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-sm text-gray-300">
                            {invite.sent_at
                              ? format(new Date(invite.sent_at), 'yyyy/MM/dd HH:mm', { locale: ja })
                              : format(new Date(invite.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invite.status === 'completed'
                            ? 'bg-green-900/50 text-green-400'
                            : invite.status === 'pending'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : invite.status === 'expired'
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {invite.status === 'completed' ? '完了'
                            : invite.status === 'pending' ? '待機中'
                            : invite.status === 'expired' ? '期限切れ'
                            : invite.status === 'cancelled' ? 'キャンセル'
                            : invite.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 説明 */}
              <div className="p-3 bg-cyan-900/30 border border-cyan-500/30 rounded-lg">
                <p className="text-sm text-cyan-300">
                  招待メールを送信すると、従業員はリンクから契約書の確認・署名、
                  パスワード設定を行い、システムにログインできるようになります。
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setInviteModal({ open: false, staff: null })}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={inviteLoading}
              >
                閉じる
              </button>
              <button
                onClick={handleSendInvite}
                disabled={inviteLoading}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {inviteLoading ? (
                  '送信中...'
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    招待メールを送信
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINE連携QRモーダル */}
      {lineQrStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-400" />
                LINE連携
              </h2>
              <button
                onClick={() => setLineQrStaff(null)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center">
              <p className="text-gray-300 mb-4">
                <span className="text-white font-bold">{lineQrStaff.name}</span> さんの<br />
                LINE連携用QRコード
              </p>

              <div className="bg-white rounded-xl p-6 inline-block mb-4">
                <QRCodeSVG
                  value={`https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_INSTRUCTOR_ID || process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID}?token=${btoa(lineQrStaff.instructor_id || lineQrStaff.id)}&name=${encodeURIComponent(lineQrStaff.name)}`}
                  size={200}
                  level="M"
                />
              </div>

              <p className="text-gray-400 text-sm mb-4">
                インストラクターのスマートフォンで<br />
                LINEアプリからこのQRコードを読み取ってください
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                <h4 className="text-gray-300 text-sm font-medium mb-2">連携手順</h4>
                <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
                  <li>インストラクターがLINEアプリを開く</li>
                  <li>ホームタブの検索バー横にあるQRコードリーダーをタップ</li>
                  <li>このQRコードを読み取る</li>
                  <li>表示されたページで「LINE連携する」をタップ</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setLineQrStaff(null)}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
