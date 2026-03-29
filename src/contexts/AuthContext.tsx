'use client'

// ============================
// 로그인 상태 전역 관리 (Context)
// 구글 + 카카오 로그인 통합 처리
// ============================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { saveUser, getUser } from '@/lib/firestore'
import { User } from '@/types'

// Context에서 제공할 값들의 타입
interface AuthContextType {
  currentUser: User | null          // 현재 로그인한 유저
  loading: boolean                  // 로딩 중 여부
  signInWithGoogle: () => Promise<void>
  signInWithKakao: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>  // 온보딩 후 유저 정보 갱신용
}

const AuthContext = createContext<AuthContextType | null>(null)

// Context를 쉽게 사용하기 위한 훅
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다')
  }
  return context
}

// 앱 전체를 감싸는 Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Firebase Auth 상태 변화 감지 (구글 로그인용)
  useEffect(() => {
    // Firebase 키가 없을 때 무한 로딩 방지 (3초 타임아웃)
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)

    let unsubscribe = () => {}

    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        clearTimeout(timeout) // 정상 응답 시 타임아웃 취소
        try {
          if (firebaseUser) {
            // 구글로 로그인된 경우
            let user = await getUser(firebaseUser.uid)

            if (!user) {
              // 최초 로그인: Firestore에 유저 생성
              user = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || '이름없음',
                email: firebaseUser.email || undefined,
                role: 'member',
                authProvider: 'google',
                createdAt: new Date().toISOString(),
              }
              await saveUser(user)
            }

            setCurrentUser(user)
          } else {
            // 카카오 로그인 세션 확인
            const kakaoSession = sessionStorage.getItem('kakao_user')
            if (kakaoSession) {
              setCurrentUser(JSON.parse(kakaoSession))
            } else {
              setCurrentUser(null)
            }
          }
        } catch (err) {
          // Firestore 실패해도 Firebase Auth 정보로 일단 로그인 처리
          console.error('유저 정보 로드 실패 (Firestore):', err)
          if (firebaseUser) {
            setCurrentUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || '이름없음',
              email: firebaseUser.email || undefined,
              role: 'member',
              authProvider: 'google',
              createdAt: new Date().toISOString(),
            })
          } else {
            setCurrentUser(null)
          }
        }
        setLoading(false)
      })
    } catch (err) {
      // Firebase 초기화 실패 시
      console.error('Firebase Auth 초기화 실패:', err)
      clearTimeout(timeout)
      setLoading(false)
    }

    return () => {
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  // ── 구글 로그인 ──
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
      // onAuthStateChanged에서 자동으로 처리됨
    } catch (error) {
      console.error('구글 로그인 실패:', error)
      throw error
    }
  }

  // ── 카카오 로그인 ──
  // Kakao SDK v2: Auth.login() 제거됨 → authorize() 리다이렉트 방식 사용
  const signInWithKakao = async () => {
    if (typeof window === 'undefined' || !window.Kakao) {
      throw new Error('카카오 SDK가 로드되지 않았습니다')
    }
    const redirectUri = `${window.location.origin}/kakao/callback`
    window.Kakao.Auth.authorize({ redirectUri, scope: 'profile_nickname' })
    // 카카오 페이지로 리다이렉트됨 (함수가 여기서 종료되지 않음)
  }

  // ── 유저 정보 갱신 (온보딩 완료 후 teamId 반영) ──
  const refreshUser = async () => {
    // 카카오 유저: sessionStorage 기준으로 Firestore 최신 데이터 반영
    const kakaoSession = sessionStorage.getItem('kakao_user')
    if (kakaoSession) {
      const cached = JSON.parse(kakaoSession)
      const fresh = await getUser(cached.uid)
      if (fresh) {
        sessionStorage.setItem('kakao_user', JSON.stringify(fresh))
        setCurrentUser(fresh)
      }
      return
    }
    // 구글 유저: Firebase Auth UID로 Firestore 재조회
    const { currentUser: firebaseUser } = auth
    if (firebaseUser) {
      const fresh = await getUser(firebaseUser.uid)
      if (fresh) setCurrentUser(fresh)
    }
  }

  // ── 로그아웃 ──
  const signOut = async () => {
    // 구글 로그아웃
    await firebaseSignOut(auth)

    // 카카오 로그아웃
    if (typeof window !== 'undefined' && window.Kakao?.Auth?.getAccessToken()) {
      window.Kakao.Auth.logout()
    }

    // 세션 정리
    sessionStorage.removeItem('kakao_user')
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, signInWithGoogle, signInWithKakao, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── 카카오 SDK v2 타입 선언 (TypeScript용) ──
declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void
      isInitialized: () => boolean
      Auth: {
        authorize: (options: { redirectUri: string; scope?: string }) => void
        logout: () => void
        getAccessToken: () => string | null
      }
      API: {
        request: (options: { url: string; success: (res: unknown) => void; fail: (err: unknown) => void }) => void
      }
    }
  }
}
