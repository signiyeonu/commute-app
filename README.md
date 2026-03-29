# 출근 체크 앱

실시간 출근 현황 관리 앱 (Next.js + Firebase)

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              ← 로그인 페이지
│   ├── dashboard/page.tsx    ← 일반 유저 출근 화면
│   ├── sika/page.tsx         ← 시카(회장) 대시보드
│   └── api/notify/route.ts   ← 카카오 알림 API
├── contexts/
│   └── AuthContext.tsx        ← 로그인 상태 전역 관리
├── lib/
│   ├── firebase.ts            ← Firebase 초기화
│   └── firestore.ts           ← Firestore CRUD 함수
└── types/
    └── index.ts               ← TypeScript 타입 정의
```

## 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.local.example`을 복사해서 `.env.local` 파일 만들기
```bash
cp .env.local.example .env.local
```
그리고 각 값을 실제 API 키로 채우기

### 3. Firebase 설정
1. [Firebase Console](https://console.firebase.google.com) 에서 새 프로젝트 생성
2. Firestore Database 활성화 (테스트 모드로 시작)
3. Authentication 활성화 → Google 로그인 활성화
4. 프로젝트 설정에서 웹 앱 추가 → API 키 복사 → `.env.local`에 붙여넣기
5. `firestore.rules` 내용을 Firebase Console > Firestore > 규칙에 붙여넣기

### 4. 카카오 설정
1. [카카오 디벨로퍼스](https://developers.kakao.com) 에서 앱 생성
2. 플랫폼 > 웹 플랫폼 추가 (도메인 입력)
3. 카카오 로그인 활성화
4. JavaScript 키 복사 → `.env.local`의 `NEXT_PUBLIC_KAKAO_APP_KEY`에 입력

### 5. 개발 서버 실행
```bash
npm run dev
```
→ http://localhost:3000 접속

## 시카 계정 설정 방법

1. 시카가 앱에 로그인
2. Firebase Console > Firestore > users 컬렉션에서 시카의 문서 찾기
3. `role` 필드를 `"sika"`로 수정

## 카카오 알림 활성화

`src/app/api/notify/route.ts` 파일에서 주석 처리된 코드 해제 후
시카의 카카오 Access Token을 `.env.local`에 추가:
```
KAKAO_ACCESS_TOKEN=시카의_카카오_액세스_토큰
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 배포 (Vercel)

```bash
npm install -g vercel
vercel
```
→ Vercel 대시보드에서 환경변수 추가 필요

## 자동 초기화

데이터는 날짜(YYYY-MM-DD)별로 저장되기 때문에
자정이 지나면 자동으로 새 날짜의 빈 상태로 시작됩니다.
별도 삭제 로직이 필요 없습니다! 🎉
