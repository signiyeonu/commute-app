'use client'

// ============================
// 시카(회장) 전용 대시보드 (/sika)
// - 오늘 전체 출근 현황 실시간 표시
// - 근무지 관리
// - 초대코드 표시
// ============================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToTodayAttendance,
  getAllUsers,
  getLocations,
  addLocation,
  getTeam,
  getTodayKey,
  updateUserName,
} from '@/lib/firestore'
import { AttendanceRecord, User, Location, Team } from '@/types'

export default function SikaDashboard() {
  const { currentUser, loading, signOut } = useAuth()
  const router = useRouter()

  const [team, setTeam] = useState<Team | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [todayRecords, setTodayRecords] = useState<Record<string, AttendanceRecord>>({})
  const [locations, setLocations] = useState<Location[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'attendance' | 'manage'>('attendance')
  const [codeCopied, setCodeCopied] = useState(false)
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // 권한 확인
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/')
        return
      }
      if (!currentUser.teamId) {
        router.push('/onboarding')
        return
      }
      if (currentUser.role !== 'sika') {
        router.push('/dashboard')
        return
      }
      initData()
    }
  }, [currentUser, loading])

  const initData = async () => {
    const teamId = currentUser!.teamId!
    try {
      const [teamData, users, locs] = await Promise.all([
        getTeam(teamId),
        getAllUsers(teamId),
        getLocations(teamId),
      ])
      setTeam(teamData)
      setAllUsers(users.filter(u => u.role !== 'sika'))
      setLocations(locs)
    } catch (err) {
      console.error('데이터 로드 실패:', err)
    } finally {
      setPageLoading(false)
    }
  }

  // 실시간 출근 현황 구독
  useEffect(() => {
    if (!currentUser?.teamId || currentUser.role !== 'sika') return

    const unsubscribe = subscribeToTodayAttendance(currentUser.teamId, (records) => {
      setTodayRecords(records)
    })

    return () => unsubscribe()
  }, [currentUser])

  const handleAddLocation = async () => {
    if (!newLocationName.trim() || !currentUser?.teamId) return
    setIsAddingLocation(true)
    try {
      await addLocation(currentUser.teamId, newLocationName.trim(), locations.length)
      setNewLocationName('')
      const locs = await getLocations(currentUser.teamId)
      setLocations(locs)
    } catch (err) {
      alert('근무지 추가에 실패했습니다.')
    } finally {
      setIsAddingLocation(false)
    }
  }

  const handleSaveName = async (uid: string) => {
    if (!editingName.trim()) return
    setSavingName(true)
    try {
      await updateUserName(uid, editingName.trim())
      setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, name: editingName.trim() } : u))
      setEditingUid(null)
    } catch {
      alert('닉네임 변경에 실패했습니다.')
    } finally {
      setSavingName(false)
    }
  }

  const handleCopyCode = () => {
    if (!team?.inviteCode) return
    navigator.clipboard.writeText(team.inviteCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const checkedCount = allUsers.filter(u => todayRecords[u.uid]).length
  const totalCount = allUsers.length

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                시카 전용
              </span>
              <h1 className="text-lg font-bold text-gray-800">{team?.name || '출근 현황'}</h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              📅 {getTodayKey()}  |  실시간 업데이트
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/sika/kakao-connect')}
              className="text-xs text-yellow-600 hover:text-yellow-700 border border-yellow-300 bg-yellow-50 rounded-lg px-3 py-1.5"
            >
              💬 카카오 알림 설정
            </button>
            <button
              onClick={signOut}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 탭 */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'attendance'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 오늘 출근 현황
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'manage'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚙️ 팀 관리
          </button>
        </div>

        {/* ── 출근 현황 탭 ── */}
        {activeTab === 'attendance' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <div className="text-3xl font-bold text-blue-600">{totalCount}</div>
                <div className="text-xs text-gray-400 mt-1">전체 인원</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <div className="text-3xl font-bold text-green-600">{checkedCount}</div>
                <div className="text-xs text-gray-400 mt-1">출근 완료</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <div className="text-3xl font-bold text-red-400">
                  {totalCount - checkedCount}
                </div>
                <div className="text-xs text-gray-400 mt-1">미출근</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {allUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-sm">아직 팀에 참여한 멤버가 없습니다</p>
                  <p className="text-xs mt-1">아래 팀 관리 탭에서 초대코드를 공유하세요</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {allUsers
                    .sort((a, b) => {
                      const aChecked = !!todayRecords[a.uid]
                      const bChecked = !!todayRecords[b.uid]
                      if (aChecked && !bChecked) return -1
                      if (!aChecked && bChecked) return 1
                      return 0
                    })
                    .map((user) => {
                      const record = todayRecords[user.uid]
                      return (
                        <li key={user.uid} className="flex items-center px-5 py-4 gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                              record ? 'bg-green-100' : 'bg-gray-100'
                            }`}
                          >
                            {record ? '✅' : '⬜'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{user.name}</p>
                            {record ? (
                              <p className="text-xs text-green-600 mt-0.5">
                                📍 {record.location} &nbsp;·&nbsp; {formatTime(record.checkedAt)}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 mt-0.5">미출근</p>
                            )}
                          </div>
                          {record && (
                            <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                              {formatTime(record.checkedAt)}
                            </div>
                          )}
                        </li>
                      )
                    })}
                </ul>
              )}
            </div>

            <p className="text-center text-xs text-gray-400">
              새로운 출근이 생기면 자동으로 업데이트됩니다 🔄
            </p>
          </>
        )}

        {/* ── 팀 관리 탭 ── */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            {/* 초대코드 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">🔑 팀 초대코드</h3>
              <p className="text-xs text-gray-400 mb-3">
                멤버에게 이 코드를 공유하면 팀에 참여할 수 있습니다
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-center">
                  <span className="text-2xl font-mono font-bold text-gray-800 tracking-widest">
                    {team?.inviteCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  {codeCopied ? '복사됨 ✓' : '복사'}
                </button>
              </div>
            </div>

            {/* 근무지 관리 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">📍 근무지 관리</h3>
              <div className="space-y-2 mb-4">
                {locations.length === 0 ? (
                  <p className="text-sm text-gray-400">등록된 근무지가 없습니다</p>
                ) : (
                  locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                    >
                      <span className="text-sm font-medium text-gray-700">{loc.name}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                  placeholder="새 근무지 이름"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={handleAddLocation}
                  disabled={!newLocationName.trim() || isAddingLocation}
                  className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {/* 멤버 목록 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">👥 팀 멤버 ({allUsers.length}명)</h3>
              {allUsers.length === 0 ? (
                <p className="text-sm text-gray-400">아직 참여한 멤버가 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {allUsers.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                        {user.name[0]}
                      </div>
                      {editingUid === user.uid ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveName(user.uid)
                              if (e.key === 'Escape') setEditingUid(null)
                            }}
                            autoFocus
                            className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button
                            onClick={() => handleSaveName(user.uid)}
                            disabled={savingName || !editingName.trim()}
                            className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingUid(null)}
                            className="text-xs text-gray-400 rounded-lg px-2 py-1.5"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.authProvider} 로그인</p>
                          </div>
                          <button
                            onClick={() => { setEditingUid(user.uid); setEditingName(user.name) }}
                            className="text-xs text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            닉네임 변경
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
