'use client'

// ============================
// 온보딩 페이지 (/onboarding)
// 처음 로그인한 유저가 팀을 만들거나 참여하는 화면
// ============================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createTeam, joinTeamByCode } from '@/lib/firestore'

export default function OnboardingPage() {
  const { currentUser, refreshUser } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'create' | 'join'>('join')
  const [teamName, setTeamName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateTeam = async () => {
    if (!currentUser || !teamName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createTeam(currentUser.uid, teamName.trim())
      await refreshUser()
      router.push('/sika')
    } catch (err) {
      setError('팀 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinTeam = async () => {
    if (!currentUser || !inviteCode.trim()) return
    setLoading(true)
    setError(null)
    try {
      await joinTeamByCode(currentUser.uid, inviteCode.trim())
      await refreshUser()
      router.push('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '팀 참여에 실패했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏢</div>
          <h1 className="text-xl font-bold text-gray-800">팀 설정</h1>
          <p className="text-gray-400 text-sm mt-1">
            {currentUser?.name}님, 팀을 만들거나 참여하세요
          </p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setTab('join'); setError(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'join' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            팀 참여하기
          </button>
          <button
            onClick={() => { setTab('create'); setError(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'create' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            팀 만들기
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {tab === 'join' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">팀장(시카)에게 초대코드를 받아 입력하세요.</p>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinTeam()}
              placeholder="초대코드 입력 (예: ABCD12345)"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 tracking-widest font-mono"
            />
            <button
              onClick={handleJoinTeam}
              disabled={!inviteCode.trim() || loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '참여 중...' : '팀 참여하기'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">팀 이름을 입력하면 초대코드가 생성됩니다.</p>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
              placeholder="팀 이름 입력"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
            <button
              onClick={handleCreateTeam}
              disabled={!teamName.trim() || loading}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '생성 중...' : '팀 만들기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
