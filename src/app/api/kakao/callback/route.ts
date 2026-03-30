// ============================
// 카카오 OAuth 콜백 API
// POST /api/kakao/callback
// 인증 코드 → access/refresh 토큰 교환 → Firestore에 저장
// ============================

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin SDK 초기화 (서버사이드에서만 사용)
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: '인증 코드가 없습니다' }, { status: 400 })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/sika/kakao-connect`

    // 카카오 토큰 발급 요청
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!,
      redirect_uri: redirectUri,
      code,
    }
    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenParams.client_secret = process.env.KAKAO_CLIENT_SECRET
    }

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.json()
      return NextResponse.json(
        { error: `토큰 발급 실패: ${err.error_description}` },
        { status: 400 }
      )
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token } = tokenData

    // Firestore에 refresh token 저장 (서버사이드)
    const adminDb = getAdminDb()
    await adminDb.collection('sika_config').doc('kakao').set({
      refresh_token,
      access_token,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('카카오 콜백 처리 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
