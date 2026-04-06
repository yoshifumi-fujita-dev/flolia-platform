'use client'

import { useState, useEffect } from 'react'
import {
  Briefcase,
  RefreshCw,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export default function AdminCareersPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // セクション開閉状態
  const [expandedSections, setExpandedSections] = useState({
    hero: true,
    value: false,
    ai: false,
    compensation: true,
    requirements: false,
    jobDetails: false,
    closing: false,
  })

  // フォームデータ
  const [formData, setFormData] = useState({
    hero_title: '',
    hero_subtitle: '',
    hero_description: '',
    hero_video_url: '',
    value_title: '',
    value_description: '',
    value_highlight: '',
    ai_section_title: '',
    ai_section_description: '',
    ai_section_highlight: '',
    compensation_title: '',
    compensation_subtitle: '',
    fulltime_salary_min: 250000,
    fulltime_salary_max: null,
    fulltime_benefits: [],
    parttime_hourly_min: 1500,
    parttime_hourly_max: null,
    parttime_benefits: [],
    job_title: '',
    employment_types: [],
    work_location: '',
    work_hours: '',
    work_hours_note: '',
    benefits: [],
    requirements: [],
    closing_title: '',
    closing_description: '',
    is_active: true,
  })

  // 設定を取得
  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/careers?include_inactive=true')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.settings) {
        setSettings(data.settings)
        setFormData({
          hero_title: data.settings.hero_title || '',
          hero_subtitle: data.settings.hero_subtitle || '',
          hero_description: data.settings.hero_description || '',
          hero_video_url: data.settings.hero_video_url || '',
          value_title: data.settings.value_title || '',
          value_description: data.settings.value_description || '',
          value_highlight: data.settings.value_highlight || '',
          ai_section_title: data.settings.ai_section_title || '',
          ai_section_description: data.settings.ai_section_description || '',
          ai_section_highlight: data.settings.ai_section_highlight || '',
          compensation_title: data.settings.compensation_title || '',
          compensation_subtitle: data.settings.compensation_subtitle || '',
          fulltime_salary_min: data.settings.fulltime_salary_min || 250000,
          fulltime_salary_max: data.settings.fulltime_salary_max || null,
          fulltime_benefits: data.settings.fulltime_benefits || [],
          parttime_hourly_min: data.settings.parttime_hourly_min || 1500,
          parttime_hourly_max: data.settings.parttime_hourly_max || null,
          parttime_benefits: data.settings.parttime_benefits || [],
          job_title: data.settings.job_title || '',
          employment_types: data.settings.employment_types || [],
          work_location: data.settings.work_location || '',
          work_hours: data.settings.work_hours || '',
          work_hours_note: data.settings.work_hours_note || '',
          benefits: data.settings.benefits || [],
          requirements: data.settings.requirements || [],
          closing_title: data.settings.closing_title || '',
          closing_description: data.settings.closing_description || '',
          is_active: data.settings.is_active ?? true,
        })
      } else {
        // デフォルト値をセット
        setFormData({
          hero_title: 'AIにミットは持てない。',
          hero_subtitle: 'AIが進化するほど、人の価値は「身体と向き合う力」に宿る。',
          hero_description: 'ロボットが相手なら、サンドバッグでいい。でも――目の前の人を笑顔にするのは、人にしかできない。',
          hero_video_url: '',
          value_title: 'この仕事には価値がある',
          value_description: '汗と呼吸、そして声掛け。相手の目を見て、限界を一歩超えさせること。',
          value_highlight: 'AIにはできない。マニュアルにも置き換えられない仕事。',
          ai_section_title: 'AI時代に、\n最後まで残る\n身体の仕事',
          ai_section_description: 'キックボクシングインストラクターは、人にしかできないコーチングがある仕事です。',
          ai_section_highlight: 'ミットを持つことは、誰かの自信を支え、人生を前に進めること。',
          compensation_title: 'その価値には、正当な報酬がある。',
          compensation_subtitle: 'プロとして、対価を得る仕事です。',
          fulltime_salary_min: 250000,
          fulltime_salary_max: null,
          fulltime_benefits: ['経験・スキルに応じて優遇', '昇給制度あり', '社会保険完備'],
          parttime_hourly_min: 1500,
          parttime_hourly_max: null,
          parttime_benefits: ['週3日〜OK', 'シフト相談可', '正社員登用あり'],
          job_title: 'キックボクシングインストラクター',
          employment_types: ['正社員', 'アルバイト・パート'],
          work_location: '',
          work_hours: 'シフト制（営業時間内）',
          work_hours_note: '※週3日〜応相談',
          benefits: ['交通費支給', '社会保険完備（正社員）', '研修制度あり', 'スタジオ利用無料'],
          requirements: ['人と向き合うことが好きな方', '運動・フィットネスに興味がある方', '誰かの成長を喜べる方', '格闘技経験者（未経験でも可）'],
          closing_title: 'この仕事は、代替されない。',
          closing_description: 'あなたの身体、あなたの声、あなたの熱量が、誰かを変える。',
          is_active: true,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setSuccessMessage('保存しました')
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchSettings()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // 配列フィールドの操作
  const addArrayItem = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), ''],
    }))
  }

  const updateArrayItem = (field, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }))
  }

  const removeArrayItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  // セクションコンポーネント
  const Section = ({ id, title, children }) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {expandedSections[id] ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expandedSections[id] && <div className="p-6 space-y-4">{children}</div>}
    </div>
  )

  // 配列編集コンポーネント
  const ArrayEditor = ({ label, field, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="space-y-2">
        {(formData[field] || []).map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateArrayItem(field, index, e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => removeArrayItem(field, index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem(field)}
          className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7" />
            採用情報
          </h1>
          <p className="text-gray-600 mt-1">採用ページの内容を編集</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
          <a
            href="/careers?preview=true"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            プレビュー
          </a>
        </div>
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 公開設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
            />
            <div>
              <span className="font-medium text-gray-900">採用ページを公開する</span>
              <p className="text-sm text-gray-500">オフにすると採用ページが非表示になります</p>
            </div>
          </label>
        </div>

        {/* ヒーローセクション */}
        <Section id="hero" title="ヒーローセクション（メインビジュアル）">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メインタイトル
            </label>
            <input
              type="text"
              value={formData.hero_title}
              onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="例: AIにミットは持てない。"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サブタイトル
            </label>
            <input
              type="text"
              value={formData.hero_subtitle}
              onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明文
            </label>
            <textarea
              value={formData.hero_description}
              onChange={(e) => setFormData({ ...formData, hero_description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              背景動画URL（任意）
            </label>
            <input
              type="url"
              value={formData.hero_video_url}
              onChange={(e) => setFormData({ ...formData, hero_video_url: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="https://example.com/video.mp4"
            />
            <p className="text-xs text-gray-500 mt-1">
              MP4形式の動画URLを入力してください。空欄の場合はグラデーション背景が表示されます。
            </p>
          </div>
        </Section>

        {/* 報酬セクション */}
        <Section id="compensation" title="報酬セクション">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              セクションタイトル
            </label>
            <input
              type="text"
              value={formData.compensation_title}
              onChange={(e) => setFormData({ ...formData, compensation_title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サブタイトル
            </label>
            <input
              type="text"
              value={formData.compensation_subtitle}
              onChange={(e) => setFormData({ ...formData, compensation_subtitle: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
            {/* 正社員 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">正社員</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最低月収（円）
                  </label>
                  <input
                    type="number"
                    value={formData.fulltime_salary_min || ''}
                    onChange={(e) => setFormData({ ...formData, fulltime_salary_min: parseInt(e.target.value) || null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="250000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最高月収（円）
                  </label>
                  <input
                    type="number"
                    value={formData.fulltime_salary_max || ''}
                    onChange={(e) => setFormData({ ...formData, fulltime_salary_max: parseInt(e.target.value) || null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="空欄可"
                  />
                </div>
              </div>
              <ArrayEditor
                label="特典・メリット"
                field="fulltime_benefits"
                placeholder="例: 昇給制度あり"
              />
            </div>

            {/* アルバイト */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">アルバイト・パート</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最低時給（円）
                  </label>
                  <input
                    type="number"
                    value={formData.parttime_hourly_min || ''}
                    onChange={(e) => setFormData({ ...formData, parttime_hourly_min: parseInt(e.target.value) || null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="1500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最高時給（円）
                  </label>
                  <input
                    type="number"
                    value={formData.parttime_hourly_max || ''}
                    onChange={(e) => setFormData({ ...formData, parttime_hourly_max: parseInt(e.target.value) || null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="空欄可"
                  />
                </div>
              </div>
              <ArrayEditor
                label="特典・メリット"
                field="parttime_benefits"
                placeholder="例: 週3日〜OK"
              />
            </div>
          </div>
        </Section>

        {/* 価値観セクション */}
        <Section id="value" title="価値観セクション">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              セクションタイトル
            </label>
            <input
              type="text"
              value={formData.value_title}
              onChange={(e) => setFormData({ ...formData, value_title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明文
            </label>
            <textarea
              value={formData.value_description}
              onChange={(e) => setFormData({ ...formData, value_description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ハイライト（強調文）
            </label>
            <input
              type="text"
              value={formData.value_highlight}
              onChange={(e) => setFormData({ ...formData, value_highlight: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </Section>

        {/* AI時代セクション */}
        <Section id="ai" title="AI時代セクション">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              セクションタイトル
            </label>
            <input
              type="text"
              value={formData.ai_section_title}
              onChange={(e) => setFormData({ ...formData, ai_section_title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明文
            </label>
            <textarea
              value={formData.ai_section_description}
              onChange={(e) => setFormData({ ...formData, ai_section_description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ハイライト（強調文）
            </label>
            <input
              type="text"
              value={formData.ai_section_highlight}
              onChange={(e) => setFormData({ ...formData, ai_section_highlight: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </Section>

        {/* 求める人材 */}
        <Section id="requirements" title="求める人材">
          <ArrayEditor
            label="求める人材（箇条書き）"
            field="requirements"
            placeholder="例: 人と向き合うことが好きな方"
          />
        </Section>

        {/* 募集要項 */}
        <Section id="jobDetails" title="募集要項">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              職種名
            </label>
            <input
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <ArrayEditor
            label="雇用形態"
            field="employment_types"
            placeholder="例: 正社員"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              勤務地（空欄の場合は店舗名を表示）
            </label>
            <input
              type="text"
              value={formData.work_location}
              onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="例: FLOLIA 辻堂店（神奈川県藤沢市）"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                勤務時間
              </label>
              <input
                type="text"
                value={formData.work_hours}
                onChange={(e) => setFormData({ ...formData, work_hours: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                勤務時間の補足
              </label>
              <input
                type="text"
                value={formData.work_hours_note}
                onChange={(e) => setFormData({ ...formData, work_hours_note: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
          <ArrayEditor
            label="待遇・福利厚生"
            field="benefits"
            placeholder="例: 交通費支給"
          />
        </Section>

        {/* クロージングセクション */}
        <Section id="closing" title="クロージングセクション">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              value={formData.closing_title}
              onChange={(e) => setFormData({ ...formData, closing_title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明文
            </label>
            <textarea
              value={formData.closing_description}
              onChange={(e) => setFormData({ ...formData, closing_description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              rows={2}
            />
          </div>
        </Section>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
