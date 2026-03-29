'use client'

// ============================
// 카카오 로그인 OAuth 콜백 페이지 (/kakao/callback)
// 카카오에서 리다이렉트되면 여기서 코드를 처리해 로그인 완료
// ============================

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

function KakaoCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('카카오 로그인을 취소했습니다.')
      setTimeout(() => router.push('/'), 2000)
      return
    }

    if (!code) {
      router.push('/')
      return
    }

    handleCallback(code)
  }, [])

  const handleCallback = async (code: string) => {
    try {
      const redirectUri = `${window.location.origin}/kakao/callback`

      const res = await fetch('/api/kakao/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '카카오 로그인 실패')
        setTimeout(() => router.push('/'), 3000)
        return
      }

      const { customToken, ...user } = await res.json()

      // Firebase Custom Token으로 로그인 → Firestore 권한 획득
      if (customToken) {
        await signInWithCustomToken(auth, customToken)
      }

      sessionStorage.setItem('kakao_user', JSON.stringify(user))

      if (user.role === 'sika') {
        router.push('/sika')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('로그인 처리 중 오류가 발생했습니다.')
      setTimeout(() => router.push('/'), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
        {error ? (
          <>
            <div className="text-red-500 text-lg mb-2">{error}</div>
            <div className="text-gray-400 text-sm">로그인 페이지로 돌아갑니다...</div>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">🏢</div>
            <div className="text-gray-600">카카오 로그인 처리 중...</div>
          </>
        )}
      </div>
    </div>
  )
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    }>
      <KakaoCallbackInner />
    </Suspense>
  )
}
