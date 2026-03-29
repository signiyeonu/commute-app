// ============================
// 앱 전체에서 사용하는 타입 정의
// ============================

// 팀 정보 (Firestore teams 컬렉션)
export interface Team {
  id: string
  name: string
  sikaUid: string
  inviteCode: string
  createdAt: string
}

// 유저 정보 (Firestore users 컬렉션)
export interface User {
  uid: string                    // Firebase UID 또는 "kakao_" + 카카오ID
  name: string                   // 표시 이름
  email?: string                 // 이메일 (구글 로그인 시)
  role: 'member' | 'sika'        // member: 일반, sika: 회장
  authProvider: 'google' | 'kakao'
  kakaoId?: string               // 카카오 로그인 시 카카오 유저 ID
  teamId?: string                // 소속 팀 ID (온보딩 전에는 없음)
  createdAt: string              // ISO 날짜 문자열
}

// 출근 기록 (Firestore attendance/{date}/records/{uid})
export interface AttendanceRecord {
  uid: string
  name: string
  location: string               // 선택된 근무지
  checkedAt: string              // ISO 날짜 문자열 (출근 시각)
  checked: boolean
}

// 근무지 목록 (Firestore locations 컬렉션)
export interface Location {
  id: string
  name: string
  order: number                  // 정렬 순서
}

// 오늘의 출근 현황 (대시보드용)
export interface TodayStatus {
  user: User
  record: AttendanceRecord | null  // null이면 미출근
}
