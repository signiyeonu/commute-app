// ============================
// Firestore 관련 함수 모음
// ============================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { User, AttendanceRecord, Location } from '@/types'

// ── 오늘 날짜 키 생성 (예: "2026-03-29") ──
export const getTodayKey = (): string => {
  const now = new Date()
  // 한국 시간(KST) 기준
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

// ── 유저 저장/조회 ──

// 유저 정보 Firestore에 저장 (최초 로그인 시)
export const saveUser = async (user: User): Promise<void> => {
  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    // 처음 로그인하는 유저
    await setDoc(userRef, {
      ...user,
      role: 'member',  // 기본값은 일반 멤버
      createdAt: new Date().toISOString(),
    })
  }
}

// 유저 정보 가져오기
export const getUser = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid)
  const snapshot = await getDoc(userRef)
  return snapshot.exists() ? (snapshot.data() as User) : null
}

// 전체 유저 목록 가져오기
export const getAllUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users')
  const snapshot = await getDocs(usersRef)
  return snapshot.docs.map(doc => doc.data() as User)
}

// ── 출근 체크인 ──

// 출근 기록 저장
export const checkIn = async (
  uid: string,
  name: string,
  location: string
): Promise<void> => {
  const dateKey = getTodayKey()
  const recordRef = doc(db, 'attendance', dateKey, 'records', uid)

  const record: AttendanceRecord = {
    uid,
    name,
    location,
    checkedAt: new Date().toISOString(),
    checked: true,
  }

  await setDoc(recordRef, record)
}

// 오늘 내 출근 기록 조회
export const getMyTodayRecord = async (
  uid: string
): Promise<AttendanceRecord | null> => {
  const dateKey = getTodayKey()
  const recordRef = doc(db, 'attendance', dateKey, 'records', uid)
  const snapshot = await getDoc(recordRef)
  return snapshot.exists() ? (snapshot.data() as AttendanceRecord) : null
}

// ── 실시간 구독 (시카 대시보드용) ──

// 오늘 전체 출근 현황 실시간 구독
// onUpdate 콜백으로 데이터가 바뀔 때마다 자동 호출됨
export const subscribeToTodayAttendance = (
  onUpdate: (records: Record<string, AttendanceRecord>) => void
): Unsubscribe => {
  const dateKey = getTodayKey()
  const recordsRef = collection(db, 'attendance', dateKey, 'records')

  return onSnapshot(recordsRef, (snapshot) => {
    const records: Record<string, AttendanceRecord> = {}
    snapshot.docs.forEach(doc => {
      records[doc.id] = doc.data() as AttendanceRecord
    })
    onUpdate(records)
  })
}

// ── 근무지 관리 ──

// 근무지 목록 가져오기
export const getLocations = async (): Promise<Location[]> => {
  const locationsRef = collection(db, 'locations')
  // orderBy 제거 → Firestore 인덱스 오류 방지
  const snapshot = await getDocs(locationsRef)
  const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location))
  // order 필드 있으면 정렬, 없으면 그냥 반환
  return locs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// 근무지 추가 (시카 전용)
export const addLocation = async (name: string, order: number): Promise<void> => {
  const locationRef = doc(collection(db, 'locations'))
  await setDoc(locationRef, { name, order })
}

// ── 카카오 알림 (Cloud Function 또는 API Route 호출) ──

// 출근 시 카카오 알림 보내기
// → /api/notify 엔드포인트 호출 (서버사이드에서 카카오 API 호출)
export const sendKakaoNotification = async (
  name: string,
  location: string
): Promise<void> => {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location }),
    })
  } catch (error) {
    // 알림 실패해도 출근 체크인에는 영향 없음
    console.error('카카오 알림 전송 실패:', error)
  }
}
