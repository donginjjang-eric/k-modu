import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "K-MODU by MARKBRIDGE",
  description: "K-MODU는 한국 디자이너 브랜드와 글로벌 패션 크리에이터를 연결합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <header className="top-nav">
            <Link className="brand" href="/">K-MODU</Link>
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/designers">디자이너</Link>
              <Link href="/dashboard/designer">대시보드</Link>
              <Link className="pill" href="/login">로그인</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
