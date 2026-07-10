import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.k-modu.co.kr"),
  title: {
    default: "K-MODU 케이모두 | 한국 디자이너 브랜드 글로벌 크리에이터 매칭",
    template: "%s | K-MODU 케이모두",
  },
  description: "K-MODU(케이모두)는 한국 디자이너 브랜드와 글로벌 패션·뷰티 크리에이터를 연결하는 마크브릿지의 K-패션 매칭 플랫폼입니다.",
  keywords: [
    "K-MODU",
    "케이모두",
    "마크브릿지",
    "한국 디자이너 브랜드",
    "K패션",
    "K-fashion",
    "패션 크리에이터",
    "뷰티 크리에이터",
    "인플루언서 매칭",
    "디자이너 브랜드 마케팅",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.k-modu.co.kr/",
    siteName: "K-MODU 케이모두",
    title: "K-MODU 케이모두 | 한국 디자이너 브랜드 글로벌 크리에이터 매칭",
    description: "한국 디자이너 브랜드를 글로벌 패션·뷰티 크리에이터와 연결하는 K-패션 매칭 플랫폼입니다.",
    images: [
      {
        url: "/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: "K-MODU 케이모두 by MARKBRIDGE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "K-MODU 케이모두 | 한국 디자이너 브랜드 글로벌 크리에이터 매칭",
    description: "한국 디자이너 브랜드와 글로벌 패션·뷰티 크리에이터를 연결합니다.",
    images: ["/assets/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/assets/favicon.png",
    apple: "/assets/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <header className="top-nav">
            <Link className="brand" href="/">K-MODU</Link>
            <nav className="nav-links" aria-label="Main navigation">
              {/* auth-nav.js가 로그인 상태에 따라 바꿔치기하므로 일반 앵커를 사용 */}
              <a className="pill" data-auth-link href="/login" aria-label="로그인">로그인</a>
            </nav>
          </header>
          {children}
        </div>
        <script src="/auth-nav.js" defer />
      </body>
    </html>
  );
}
