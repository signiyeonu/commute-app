'use client'

// ============================
// 로그인 페이지 (/)
// 구글 또는 카카오로 로그인
// ============================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { currentUser, loading, signInWithGoogle, signInWithKakao } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Firebase 키 설정 여부 확인
  const isFirebaseConfigured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== '여기에_API_KEY'
  )

  // 이미 로그인된 경우 적절한 페이지로 이동
  useEffect(() => {
    if (!loading && currentUser) {
      if (currentUser.role === 'sika') {
        router.push('/sika')
      } else {
        router.push('/dashboard')
      }
    }
  }, [currentUser, loading, router])

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoggingIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError('구글 로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleKakaoLogin = async () => {
    setError(null)
    setIsLoggingIn(true)
    try {
      await signInWithKakao()
    } catch (err: unknown) {
      // 에러 원인에 따라 다른 메시지 표시
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('SDK')) {
        setError('카카오 SDK 로드 실패. 잠시 후 새로고침 해주세요.')
      } else if (msg.includes('canceled') || msg.includes('cancel')) {
        setError('로그인을 취소했습니다.')
      } else {
        setError(`카카오 로그인 실패: 카카오 디벨로퍼스에서 현재 도메인(localhost:3000)이 등록됐는지 확인하세요.`)
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-sm text-center">
        {/* 앱 아이콘 */}
        <div className="text-6xl mb-4">🏢</div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">출근 체크</h1>
        <p className="text-gray-500 text-sm mb-8">로그인하고 출근을 기록하세요</p>

        {/* Firebase 미설정 경고 */}
        {!isFirebaseConfigured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 mb-4 text-sm text-left">
            <p className="font-semibold mb-1">⚠️ Firebase 설정 필요</p>
            <p className="text-xs">.env.local 파일에 Firebase API 키를 입력해주세요.</p>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 mb-4 text-sm text-left">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* 구글 로그인 버튼 */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* 구글 로고 SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 로그인
          </button>

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={handleKakaoLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#3C1E1E] font-semibold py-3 px-4 rounded-xl hover:bg-[#F0D800] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* 카카오 로고 */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#3C1E1E">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.76 1.71 5.19 4.29 6.72L5.2 21l4.36-2.29C10.27 18.9 11.12 19 12 19c5.52 0 10-3.58 10-8S17.52 3 12 3z" />
            </svg>
            카카오로 로그인
          </button>
        </div>

        {isLoggingIn && (
          <p className="text-gray-400 text-sm mt-4">로그인 중...</p>
        )}
      </div>
    </div>
  )
}
