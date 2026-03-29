import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: '출근 체크 앱',
  description: '출근 현황을 실시간으로 확인하세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* 카카오 SDK 로드 */}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="beforeInteractive"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>

        {/* 카카오 SDK 초기화 스크립트 */}
        <Script id="kakao-init" strategy="afterInteractive">
          {`
            if (window.Kakao && !window.Kakao.isInitialized()) {
              window.Kakao.init('${process.env.NEXT_PUBLIC_KAKAO_APP_KEY}');
            }
          `}
        </Script>
      </body>
    </html>
  )
}
