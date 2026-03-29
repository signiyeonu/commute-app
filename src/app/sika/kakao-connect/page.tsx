'use client'

// ============================
// 시카 전용 - 카카오 알림 연결 페이지 (/sika/kakao-connect)
// 시카가 최초 1회 카카오 계정 연결하면 이후 자동으로 알림 전송됨
// ============================

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Suspense } from 'react'

function KakaoConnectInner() {
  const { currentUser, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const [message, setMessage] = useState('')

  // 권한 확인 + 연결 상태 확인
  useEffect(() => {
    if (!loading) {
      if (!currentUser || currentUser.role !== 'sika') {
        router.push('/')
        return
      }
      checkConnectionStatus()
    }
  }, [currentUser, loading])

  // OAuth 콜백으로 돌아온 경우 처리
  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setMessage('카카오 연결을 취소했습니다.')
      return
    }

    if (code) {
      handleOAuthCallback(code)
    }
  }, [searchParams])

  // Firestore에 refresh token이 저장돼 있는지 확인
  const checkConnectionStatus = async () => {
    try {
      const sikaRef = doc(db, 'sika_config', 'kakao')
      const snapshot = await getDoc(sikaRef)
      setIsConnected(snapshot.exists() && !!snapshot.data()?.refresh_token)
    } catch (err) {
      console.error('연결 상태 확인 실패:', err)
    }
  }

  // OAuth 코드로 토큰 발급 요청
  const handleOAuthCallback = async (code: string) => {
    setMessage('카카오 계정 연결 중...')
    try {
      const res = await fetch('/api/kakao/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (res.ok) {
        setStatus('success')
        setIsConnected(true)
        setMessage('카카오 알림 연결 완료! 이제 출근 시 카카오톡으로 알림이 와요.')
      } else {
        const data = await res.json()
        setStatus('error')
        setMessage(`연결 실패: ${data.error}`)
      }
    } catch (err) {
      setStatus('error')
      setMessage('연결 중 오류가 발생했습니다.')
    }
  }

  // 카카오 OAuth 시작 (카카오 로그인 페이지로 이동)
  const handleKakaoConnect = () => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    const redirectUri = `${window.location.origin}/sika/kakao-connect`
    const kakaoAuthUrl =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${appKey}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=talk_message`  // 카카오톡 메시지 전송 권한

    window.location.href = kakaoAuthUrl
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-md p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">💬</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">카카오톡 알림 연결</h1>
        <p className="text-gray-500 text-sm mb-6">
          연결하면 멤버가 출근할 때마다<br />시카 카카오톡으로 알림이 와요
        </p>

        {/* 연결 상태 */}
        {isConnected && status !== 'error' && (
          <div className="bg-green-50 text-green-700 rounded-2xl p-4 mb-4 text-sm">
            ✅ 카카오 알림이 연결되어 있어요
          </div>
        )}

        {/* 성공/에러 메시지 */}
        {message && (
          <div className={`rounded-2xl p-4 mb-4 text-sm ${
            status === 'success' ? 'bg-green-50 text-green-700' :
            status === 'error' ? 'bg-red-50 text-red-600' :
            'bg-blue-50 text-blue-600'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={handleKakaoConnect}
          className="w-full bg-[#FEE500] text-[#3C1E1E] font-bold py-3 rounded-2xl hover:bg-[#F0D800] transition-all"
        >
          {isConnected ? '카카오 계정 재연결' : '카카오 계정 연결하기'}
        </button>

        <button
          onClick={() => router.push('/sika')}
          className="mt-3 text-sm text-gray-400 hover:text-gray-600"
        >
          ← 대시보드로 돌아가기
        </button>
      </div>
    </div>
  )
}

export default function KakaoConnectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <KakaoConnectInner />
    </Suspense>
  )
}
