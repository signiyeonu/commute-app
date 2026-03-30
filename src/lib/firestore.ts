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
  where,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { User, Team, AttendanceRecord, Location } from '@/types'

// ── 오늘 날짜 키 생성 (예: "2026-03-29") ──
export const getTodayKey = (): string => {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

// ── 초대코드 생성 ──
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase() +
         Math.random().toString(36).substring(2, 7).toUpperCase()
}

// ────────────────────────────
// 팀 관련
// ────────────────────────────

// 팀 생성 (시카용) - 팀을 만들고 유저의 role/teamId도 업데이트
export const createTeam = async (sikaUid: string, teamName: string): Promise<Team> => {
  const teamRef = doc(collection(db, 'teams'))
  const inviteCode = generateInviteCode()

  const team: Team = {
    id: teamRef.id,
    name: teamName,
    sikaUid,
    inviteCode,
    createdAt: new Date().toISOString(),
  }

  await setDoc(teamRef, team)

  // 유저를 시카로 업데이트
  await updateDoc(doc(db, 'users', sikaUid), {
    role: 'sika',
    teamId: teamRef.id,
  })

  return team
}

// 초대코드로 팀 참여 (멤버용)
export const joinTeamByCode = async (uid: string, inviteCode: string): Promise<Team> => {
  const teamsRef = collection(db, 'teams')
  const q = query(teamsRef, where('inviteCode', '==', inviteCode.toUpperCase()))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('유효하지 않은 초대코드입니다')
  }

  const teamDoc = snapshot.docs[0]
  const team = { id: teamDoc.id, ...teamDoc.data() } as Team

  // 유저의 teamId 업데이트
  await updateDoc(doc(db, 'users', uid), {
    role: 'member',
    teamId: team.id,
  })

  return team
}

// 팀 정보 가져오기
export const getTeam = async (teamId: string): Promise<Team | null> => {
  const teamRef = doc(db, 'teams', teamId)
  const snapshot = await getDoc(teamRef)
  return snapshot.exists() ? (snapshot.data() as Team) : null
}

// ────────────────────────────
// 유저 관련
// ────────────────────────────

export const saveUser = async (user: User): Promise<void> => {
  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      ...user,
      role: 'member',
      createdAt: new Date().toISOString(),
    })
  }
}

export const getUser = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid)
  const snapshot = await getDoc(userRef)
  return snapshot.exists() ? (snapshot.data() as User) : null
}

// 유저 닉네임 변경
export const updateUserName = async (uid: string, name: string): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), { name })
}

// 팀에 속한 전체 유저 목록
export const getAllUsers = async (teamId: string): Promise<User[]> => {
  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('teamId', '==', teamId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as User)
}

// ────────────────────────────
// 출근 체크인 (팀별 서브컬렉션)
// /teams/{teamId}/attendance/{dateKey}/records/{uid}
// ────────────────────────────

export const checkIn = async (
  uid: string,
  name: string,
  location: string,
  teamId: string
): Promise<void> => {
  const dateKey = getTodayKey()
  const recordRef = doc(db, 'teams', teamId, 'attendance', dateKey, 'records', uid)

  const record: AttendanceRecord = {
    uid,
    name,
    location,
    checkedAt: new Date().toISOString(),
    checked: true,
  }

  await setDoc(recordRef, record)
}

export const getMyTodayRecord = async (
  uid: string,
  teamId: string
): Promise<AttendanceRecord | null> => {
  const dateKey = getTodayKey()
  const recordRef = doc(db, 'teams', teamId, 'attendance', dateKey, 'records', uid)
  const snapshot = await getDoc(recordRef)
  return snapshot.exists() ? (snapshot.data() as AttendanceRecord) : null
}

// 오늘 팀 전체 출근 현황 실시간 구독
export const subscribeToTodayAttendance = (
  teamId: string,
  onUpdate: (records: Record<string, AttendanceRecord>) => void
): Unsubscribe => {
  const dateKey = getTodayKey()
  const recordsRef = collection(db, 'teams', teamId, 'attendance', dateKey, 'records')

  return onSnapshot(recordsRef, (snapshot) => {
    const records: Record<string, AttendanceRecord> = {}
    snapshot.docs.forEach(doc => {
      records[doc.id] = doc.data() as AttendanceRecord
    })
    onUpdate(records)
  })
}

// ────────────────────────────
// 근무지 관리 (팀별 서브컬렉션)
// /teams/{teamId}/locations/{locId}
// ────────────────────────────

export const getLocations = async (teamId: string): Promise<Location[]> => {
  const locationsRef = collection(db, 'teams', teamId, 'locations')
  const snapshot = await getDocs(locationsRef)
  const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location))
  return locs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export const addLocation = async (teamId: string, name: string, order: number): Promise<void> => {
  const locationRef = doc(collection(db, 'teams', teamId, 'locations'))
  await setDoc(locationRef, { name, order })
}

// ── 카카오 알림 ──
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
    console.error('카카오 알림 전송 실패:', error)
  }
}
