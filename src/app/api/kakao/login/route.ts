// ============================
// 카카오 로그인 API
// POST /api/kakao/login
// 인증 코드 → access token → 유저 조회/생성 → 유저 정보 반환
// ============================

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

function getAdminDb() {
  initAdmin()
  return getFirestore()
}

function getAdminAuth() {
  initAdmin()
  return getAuth()
}

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json()

    if (!code || !redirectUri) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const restApiKey =
      process.env.KAKAO_REST_API_KEY ||
      process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY

    if (!restApiKey) {
      return NextResponse.json(
        { error: 'KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다' },
        { status: 500 }
      )
    }

    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: restApiKey,
      redirect_uri: redirectUri,
      code,
    }
    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenParams.client_secret = process.env.KAKAO_CLIENT_SECRET
    }

    // 인증 코드 → 액세스 토큰 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.json()
      return NextResponse.json(
        { error: `카카오 토큰 발급 실패: ${err.error_description || err.error}` },
        { status: 400 }
      )
    }

    const { access_token } = await tokenRes.json()

    // 액세스 토큰 → 유저 정보 조회
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userRes.ok) {
      return NextResponse.json({ error: '유저 정보 조회 실패' }, { status: 400 })
    }

    const userData = await userRes.json()
    const kakaoId = String(userData.id)
    const uid = `kakao_${kakaoId}`
    const name = userData.kakao_account?.profile?.nickname || '카카오유저'

    // Admin SDK로 Firestore에서 유저 조회/생성 (보안 규칙 우회)
    const db = getAdminDb()
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()

    let user
    if (userSnap.exists) {
      user = userSnap.data()
    } else {
      user = {
        uid,
        name,
        role: 'member',
        authProvider: 'kakao',
        kakaoId,
        createdAt: new Date().toISOString(),
      }
      await userRef.set(user)
    }

    // Firebase Custom Token 발급 (클라이언트가 Firebase Auth에 로그인할 수 있도록)
    const customToken = await getAdminAuth().createCustomToken(uid)

    return NextResponse.json({ ...user, customToken })
  } catch (error) {
    console.error('카카오 로그인 처리 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
