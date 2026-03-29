import type { Metadata, Viewport } from "next";
import { Cormorant } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/navigation/BottomNav";

// Cormorant — 영문 고유 명사 / 브랜드 레이블 전용 Serif
const cormorant = Cormorant({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Pretendard — globals.css에서 CDN으로 로드 (한국어 기본 Sans)

export const metadata: Metadata = {
  title: "CHARIS — The Graceful Style Coach",
  description: "Don't change who you are; visualize your best self.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CHARIS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F8F6F0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${cormorant.variable} h-full`}
    >
      <body className="h-full antialiased">
        {/*
          Mobile Shell
          - 최대 폭 480px, 중앙 정렬
          - body 배경(pearl)이 480px 밖 여백을 채움
          - html/body가 overflow:hidden이므로 스크롤은 main에서만 발생
        */}
        <div className="relative mx-auto flex h-full w-full max-w-[480px] flex-col bg-ivory shadow-2xl">
          {/* ── Scrollable Page Content ── */}
          <main className="scrollbar-hide flex-1 overflow-y-auto">
            {children}
          </main>

          {/* ── Fixed Bottom Navigation ── */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
