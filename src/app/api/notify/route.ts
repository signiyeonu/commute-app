// ============================
// 카카오 알림 전송 API Route
// POST /api/notify
// 출근 시 시카에게 카카오톡 메시지 전송
// ============================

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin SDK 초기화
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

// refresh token으로 새 access token 발급
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!,
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) throw new Error('토큰 갱신 실패')

  const data = await res.json()

  // 새 refresh token이 발급된 경우 Firestore 업데이트
  if (data.refresh_token) {
    const adminDb = getAdminDb()
    await adminDb.collection('sika_config').doc('kakao').update({
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      updatedAt: new Date().toISOString(),
    })
  }

  return data.access_token
}

// 카카오톡 나에게 보내기 (시카 계정으로)
async function sendKakaoMessage(accessToken: string, name: string, location: string) {
  const now = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const message = {
    object_type: 'text',
    text: `✅ 출근 알림\n\n${name}님이 출근했습니다!\n📍 근무지: ${location}\n🕐 시각: ${now}`,
    link: {
      web_url: process.env.NEXT_PUBLIC_APP_URL || '',
      mobile_web_url: process.env.NEXT_PUBLIC_APP_URL || '',
    },
  }

  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `template_object=${encodeURIComponent(JSON.stringify(message))}`,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`카카오 메시지 전송 실패: ${JSON.stringify(err)}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, location } = await request.json()

    if (!name || !location) {
      return NextResponse.json({ error: '이름과 근무지가 필요합니다' }, { status: 400 })
    }

    // Firestore에서 시카의 refresh token 가져오기
    const adminDb = getAdminDb()
    const sikaDoc = await adminDb.collection('sika_config').doc('kakao').get()

    if (!sikaDoc.exists) {
      console.log('카카오 알림 미설정 - 콘솔 로그로 대체')
      console.log(`[출근 알림] ${name} → ${location}`)
      return NextResponse.json({ success: true, note: '카카오 미연결' })
    }

    const { refresh_token } = sikaDoc.data()!

    // refresh token으로 access token 갱신
    const accessToken = await refreshAccessToken(refresh_token)

    // 카카오톡 메시지 전송
    await sendKakaoMessage(accessToken, name, location)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('알림 전송 오류:', error)
    // 알림 실패해도 500 대신 200 반환 (출근 체크인에 영향 없게)
    return NextResponse.json({ success: false, error: String(error) })
  }
}
