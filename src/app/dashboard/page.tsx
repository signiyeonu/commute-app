'use client'

// ============================
// 일반 유저 출근 화면 (/dashboard)
// - 근무지 선택
// - 출근 버튼
// - 출근 완료 상태 표시
// ============================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  checkIn,
  getMyTodayRecord,
  getLocations,
  sendKakaoNotification,
  getTodayKey,
} from '@/lib/firestore'
import { AttendanceRecord, Location } from '@/types'

export default function DashboardPage() {
  const { currentUser, loading, signOut } = useAuth()
  const router = useRouter()

  const [myRecord, setMyRecord] = useState<AttendanceRecord | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [isChecking, setIsChecking] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 로그인 여부 확인 및 데이터 로드
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/')
        return
      }
      if (currentUser.role === 'sika') {
        router.push('/sika')
        return
      }
      loadData()
    }
  }, [currentUser, loading])

  const loadData = async () => {
    try {
      setLoadError(null)
      // 오늘 내 출근 기록 + 근무지 목록 동시에 가져오기
      const [record, locs] = await Promise.all([
        getMyTodayRecord(currentUser!.uid),
        getLocations(),
      ])
      setMyRecord(record)
      setLocations(locs)
      if (locs.length > 0) setSelectedLocation(locs[0].name)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('데이터 로드 실패:', err)
      setLoadError(`데이터 로드 실패: ${msg}`)
    } finally {
      setPageLoading(false)
    }
  }

  // 출근 버튼 클릭
  const handleCheckIn = async () => {
    if (!currentUser || !selectedLocation) return

    setIsChecking(true)
    try {
      // 1. Firestore에 출근 기록 저장
      await checkIn(currentUser.uid, currentUser.name, selectedLocation)

      // 2. 시카에게 카카오 알림 전송
      await sendKakaoNotification(currentUser.name, selectedLocation)

      // 3. 내 기록 업데이트
      const record = await getMyTodayRecord(currentUser.uid)
      setMyRecord(record)
    } catch (err) {
      console.error('출근 체크인 실패:', err)
      alert('출근 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsChecking(false)
    }
  }

  // 시간 포맷 (예: "09:15")
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  // 오늘 날짜 포맷 (예: "2026년 3월 29일 일요일")
  const formatDate = (): string => {
    return new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 상단 헤더 */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">출근 체크</h1>
          <p className="text-xs text-gray-400">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{currentUser?.name}</span>
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* 로드 에러 표시 */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">⚠️ 오류 발생</p>
            <p className="text-xs break-all">{loadError}</p>
            <button
              onClick={loadData}
              className="mt-2 text-xs text-red-600 underline"
            >
              다시 시도
            </button>
          </div>
        )}
        {/* 이미 출근한 경우 */}
        {myRecord ? (
          <div className="bg-white rounded-3xl shadow-md p-8 text-center">
            <div className="text-7xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">출근 완료!</h2>
            <p className="text-gray-500 text-sm mb-6">오늘도 수고해요 👍</p>

            <div className="bg-green-50 rounded-2xl p-4 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">출근 시각</span>
                <span className="font-semibold text-gray-800">
                  {formatTime(myRecord.checkedAt)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">근무지</span>
                <span className="font-semibold text-gray-800">
                  📍 {myRecord.location}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">날짜</span>
                <span className="font-semibold text-gray-800">
                  {getTodayKey()}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              자정(00:00)이 되면 자동으로 초기화됩니다
            </p>
          </div>
        ) : (
          /* 아직 미출근인 경우 */
          <div className="bg-white rounded-3xl shadow-md p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-3">🏢</div>
              <h2 className="text-xl font-bold text-gray-800">
                {currentUser?.name}님, 안녕하세요!
              </h2>
              <p className="text-gray-400 text-sm mt-1">오늘 어디서 근무하시나요?</p>
            </div>

            {/* 근무지 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                📍 근무지 선택
              </label>
              {locations.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  등록된 근무지가 없습니다. 시카에게 문의하세요.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc.name)}
                      className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        selectedLocation === loc.name
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 출근 버튼 */}
            <button
              onClick={handleCheckIn}
              disabled={!selectedLocation || isChecking || locations.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
            >
              {isChecking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  처리 중...
                </span>
              ) : (
                '✅ 출근하기'
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              버튼을 누르면 시카에게 알림이 전송됩니다
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
